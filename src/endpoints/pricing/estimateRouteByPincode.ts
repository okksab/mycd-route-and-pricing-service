import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";
import { z } from "zod";
import { 
	haversineKm, 
	classifyTrip, 
	calculatePrice, 
	estimateTravelTime 
} from "../../utils/haversine";

/**
 * Route Estimation Using Pincodes with D1 Database Lookup
 * 
 * Accepts fromPincode and toPincode, queries D1 database for coordinates,
 * then calculates distance and pricing using Haversine formula.
 */
export class EstimateRouteByPincode extends OpenAPIRoute {
	public schema = {
		tags: ["Route Intelligence"],
		summary: "Estimate route details using Indian pincodes",
		description: "Calculate route details by providing FROM and TO pincodes. Automatically fetches coordinates from D1 database and uses Haversine formula for distance calculation. Returns distance, travel time, trip classification, and pricing.",
		operationId: "estimate-route-by-pincode",
		request: {
			body: contentJson(
				z.object({
					fromPincode: z.string().length(6, "Pincode must be 6 digits").regex(/^\d{6}$/, "Pincode must contain only digits"),
					toPincode: z.string().length(6, "Pincode must be 6 digits").regex(/^\d{6}$/, "Pincode must contain only digits"),
				}),
			),
		},
		responses: {
			"200": {
				description: "Successfully calculated route details",
				...contentJson({
					success: z.boolean(),
					result: z.object({
						fromPincode: z.string(),
						fromLocation: z.string().describe("City or District name"),
						fromCoordinates: z.object({
							lat: z.number(),
							lon: z.number(),
						}),
						toPincode: z.string(),
						toLocation: z.string().describe("City or District name"),
						toCoordinates: z.object({
							lat: z.number(),
							lon: z.number(),
						}),
						distance: z.number().describe("Distance in kilometers (Haversine calculation)"),
						hours: z.number().describe("Estimated travel time in hours at 50 km/h"),
						isLocal: z.boolean().describe("Whether the trip is within the same city/district"),
						isOutStation: z.boolean().describe("Whether the trip is intercity/interstate"),
						category: z.string().describe("Trip category: local, short-outstation, medium-outstation, long-outstation"),
						approxPrice: z.number().describe("Approximate price in INR"),
						method: z.string().describe("Calculation method used"),
					}),
				}),
			},
			"404": {
				description: "Pincode not found in database",
				...contentJson({
					success: z.boolean(),
					errors: z.array(z.object({
						code: z.number(),
						message: z.string(),
					})),
				}),
			},
			"400": {
				description: "Invalid pincode format",
				...contentJson({
					success: z.boolean(),
					errors: z.array(z.object({
						code: z.number(),
						message: z.string(),
					})),
				}),
			},
		},
	};

	public async handle(c: AppContext) {
		try {
			const data = await this.getValidatedData<typeof this.schema>();
			const { fromPincode, toPincode } = data.body;

			console.log(`[PINCODE] Processing route: ${fromPincode} → ${toPincode}`);

			// Query D1 database for FROM pincode
			const fromQuery = await c.env.DB.prepare(
				`SELECT pincode, city, district, state_name, latitude, longitude 
				 FROM pincodes 
				 WHERE pincode = ?`
			).bind(fromPincode).first();

			if (!fromQuery) {
				console.error(`[PINCODE] FROM pincode not found: ${fromPincode}`);
				return c.json({
					success: false,
					errors: [{
						code: 4041,
						message: `FROM pincode ${fromPincode} not found in database`,
					}],
				}, 404);
			}

			// Query D1 database for TO pincode
			const toQuery = await c.env.DB.prepare(
				`SELECT pincode, city, district, state_name, latitude, longitude 
				 FROM pincodes 
				 WHERE pincode = ?`
			).bind(toPincode).first();

			if (!toQuery) {
				console.error(`[PINCODE] TO pincode not found: ${toPincode}`);
				return c.json({
					success: false,
					errors: [{
						code: 4042,
						message: `TO pincode ${toPincode} not found in database`,
					}],
				}, 404);
			}

			// Validate coordinates exist
			if (!fromQuery.latitude || !fromQuery.longitude) {
				return c.json({
					success: false,
					errors: [{
						code: 4043,
						message: `FROM pincode ${fromPincode} has no coordinates in database`,
					}],
				}, 404);
			}

			if (!toQuery.latitude || !toQuery.longitude) {
				return c.json({
					success: false,
					errors: [{
						code: 4044,
						message: `TO pincode ${toPincode} has no coordinates in database`,
					}],
				}, 404);
			}

			const fromLat = Number(fromQuery.latitude);
			const fromLon = Number(fromQuery.longitude);
			const toLat = Number(toQuery.latitude);
			const toLon = Number(toQuery.longitude);

			// Use city if available, otherwise use district
			const fromLocation = fromQuery.city || fromQuery.district || 'Unknown';
			const toLocation = toQuery.city || toQuery.district || 'Unknown';

			console.log(`[PINCODE] FROM: ${fromPincode} (${fromLocation}) - ${fromLat}, ${fromLon}`);
			console.log(`[PINCODE] TO: ${toPincode} (${toLocation}) - ${toLat}, ${toLon}`);

			// Calculate distance using Haversine formula
			const distance = haversineKm(fromLat, fromLon, toLat, toLon);
			console.log(`[PINCODE] Distance calculated: ${distance} km`);

			// Estimate travel time at 50 km/h
			const hours = Math.round((distance / 50) * 100) / 100;
			console.log(`[PINCODE] Estimated travel time: ${hours} hours at 50 km/h`);

			// Classify trip type
			const tripClassification = classifyTrip(distance);
			console.log(`[PINCODE] Trip classification: ${tripClassification.category}`);

			// Calculate price
			const approxPrice = calculatePrice(distance, hours);
			console.log(`[PINCODE] Approximate price: ₹${approxPrice}`);

			return {
				success: true,
				result: {
					fromPincode,
					fromLocation,
					fromCoordinates: {
						lat: fromLat,
						lon: fromLon,
					},
					toPincode,
					toLocation,
					toCoordinates: {
						lat: toLat,
						lon: toLon,
					},
					distance,
					hours,
					isLocal: tripClassification.isLocal,
					isOutStation: tripClassification.isOutStation,
					category: tripClassification.category,
					approxPrice,
					method: "haversine-with-d1-lookup",
				},
			};

		} catch (error) {
			console.error("Pincode route calculation error:", error);
			
			return c.json({
				success: false,
				errors: [{
					code: 5003,
					message: error instanceof Error ? error.message : "Failed to calculate route by pincode",
				}],
			}, 500);
		}
	}
}
