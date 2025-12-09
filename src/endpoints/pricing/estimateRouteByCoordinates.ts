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
 * Route Estimation Using Coordinates + Haversine Method
 * 
 * Accepts latitude/longitude directly and calculates:
 * - Distance using Haversine formula
 * - Travel time estimation
 * - Trip classification (local/outstation)
 * - Approximate pricing
 * 
 * No AI, no external APIs - pure mathematical calculation
 */
export class EstimateRouteByCoordinates extends OpenAPIRoute {
	public schema = {
		tags: ["Route Intelligence"],
		summary: "Estimate route details using coordinates (Haversine method)",
		description: "Calculate route details using latitude/longitude coordinates. Uses Haversine formula for distance calculation and rule-based pricing. No AI or external APIs required. Ideal for offline/fast calculations.",
		operationId: "estimate-route-by-coordinates",
		request: {
			body: contentJson(
				z.object({
					fromLat: z.number().min(-90).max(90).describe("Latitude of origin point (-90 to 90)"),
					fromLon: z.number().min(-180).max(180).describe("Longitude of origin point (-180 to 180)"),
					toLat: z.number().min(-90).max(90).describe("Latitude of destination point (-90 to 90)"),
					toLon: z.number().min(-180).max(180).describe("Longitude of destination point (-180 to 180)"),
				}),
			),
		},
		responses: {
			"200": {
				description: "Successfully calculated route details",
				...contentJson({
					success: z.boolean(),
					result: z.object({
						fromCoordinates: z.object({
							lat: z.number(),
							lon: z.number(),
						}),
						toCoordinates: z.object({
							lat: z.number(),
							lon: z.number(),
						}),
						distance: z.number().describe("Distance in kilometers (Haversine calculation)"),
						hours: z.number().describe("Estimated travel time in hours"),
						isLocal: z.boolean().describe("Whether the trip is within the same city/district"),
						isOutStation: z.boolean().describe("Whether the trip is intercity/interstate"),
						category: z.string().describe("Trip category: local, short-outstation, medium-outstation, long-outstation"),
						approxPrice: z.number().describe("Approximate price in INR"),
						method: z.string().describe("Calculation method used"),
					}),
				}),
			},
			"400": {
				description: "Invalid coordinates",
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
			const { fromLat, fromLon, toLat, toLon } = data.body;

			console.log(`[COORDINATES] Processing route: (${fromLat}, ${fromLon}) → (${toLat}, ${toLon})`);
			console.log(`[COORDINATES] Using Haversine method - no external API calls`);

			// Step 1: Calculate distance using Haversine formula
			const distance = haversineKm(fromLat, fromLon, toLat, toLon);
			console.log(`[COORDINATES] Distance calculated: ${distance} km`);

			// Step 2: Estimate travel time
			const hours = estimateTravelTime(distance);
			console.log(`[COORDINATES] Estimated travel time: ${hours} hours`);

			// Step 3: Classify trip type
			const tripClassification = classifyTrip(distance);
			console.log(`[COORDINATES] Trip classification: ${tripClassification.category}`);

			// Step 4: Calculate price
			const approxPrice = calculatePrice(distance, hours);
			console.log(`[COORDINATES] Approximate price: ₹${approxPrice}`);

			return {
				success: true,
				result: {
					fromCoordinates: {
						lat: fromLat,
						lon: fromLon,
					},
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
					method: "haversine",
				},
			};

		} catch (error) {
			console.error("Route calculation error:", error);
			
			return c.json({
				success: false,
				errors: [{
					code: 4002,
					message: error instanceof Error ? error.message : "Failed to calculate route details",
				}],
			}, 400);
		}
	}
}
