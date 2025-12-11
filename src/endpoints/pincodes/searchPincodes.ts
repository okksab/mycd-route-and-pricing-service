import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";
import { z } from "zod";

/**
 * Pincode/City Search Endpoint
 * 
 * Search for locations by pincode (min 3 digits) OR city name (min 3 chars)
 * Returns max 10 results with display-ready format: "Pincode - City" or "Pincode - District"
 */
export class SearchPincodes extends OpenAPIRoute {
	public schema = {
		tags: ["Pincode Lookup"],
		summary: "Search locations by pincode or city name",
		description: "Smart location search supporting both pincode (min 3 digits) and city name (min 3 characters). Returns up to 10 most relevant results with formatted display text. Optimized for autocomplete UX.",
		operationId: "search-pincodes",
		request: {
			body: contentJson(
				z.object({
					query: z.string().min(3, "Minimum 3 characters required").max(50, "Maximum 50 characters"),
					fromPincode: z.string().length(6).regex(/^\d{6}$/).optional().describe("Optional: If provided, calculates route estimation for each result"),
				}),
			),
		},
		responses: {
			"200": {
				description: "Successfully retrieved matching locations (max 10)",
				...contentJson(
					z.object({
						query: z.string().describe("Search query provided"),
						count: z.number().describe("Number of results returned (max 10)"),
						results: z.array(z.object({
							display: z.string().describe("Formatted display text: 'Pincode - City' or 'Pincode - District'"),
							pincode: z.string(),
							city: z.string().nullable().describe("City name if available, null otherwise"),
							district: z.string(),
							state: z.string(),
							latitude: z.number().nullable(),
							longitude: z.number().nullable(),
							routeEstimation: z.object({
								distance: z.number().describe("Distance in km from origin"),
								hours: z.number().describe("Estimated travel hours"),
								category: z.string().describe("Trip category"),
								approxPrice: z.number().describe("Approximate price in INR"),
							}).optional().describe("Route details if fromPincode was provided"),
						})),
					}),
				),
			},
			"400": {
				description: "Invalid search query",
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
			const { query: searchQuery, fromPincode } = data.body;

			console.log(`[LOCATION SEARCH] Query: ${searchQuery}${fromPincode ? `, From: ${fromPincode}` : ''}`);

			// Get FROM pincode coordinates if provided (for route estimation)
			let fromCoords: { lat: number; lon: number } | null = null;
			if (fromPincode) {
				const fromQuery = await c.env.DB.prepare(
					`SELECT latitude, longitude FROM pincodes WHERE pincode = ?`
				).bind(fromPincode).first();
				
				if (fromQuery?.latitude && fromQuery?.longitude) {
					fromCoords = {
						lat: Number(fromQuery.latitude),
						lon: Number(fromQuery.longitude),
					};
					console.log(`[LOCATION SEARCH] Origin coords: ${fromCoords.lat}, ${fromCoords.lon}`);
				}
			}

			// Determine if query is numeric (pincode) or text (city name)
			const isNumeric = /^\d+$/.test(searchQuery);
			let dbQuery;

			if (isNumeric) {
				// Pincode search: starts with pattern
				console.log(`[LOCATION SEARCH] Pincode search: ${searchQuery}`);
				dbQuery = await c.env.DB.prepare(
					`SELECT pincode, city, district, state_name, latitude, longitude 
					 FROM pincodes 
					 WHERE pincode LIKE ?
					 ORDER BY pincode ASC
					 LIMIT 10`
				).bind(`${searchQuery}%`).all();
			} else {
				// City/District search: prioritize exact match, then starts with, then contains
				console.log(`[LOCATION SEARCH] City search: ${searchQuery}`);
				const searchPattern = searchQuery.toLowerCase();
				dbQuery = await c.env.DB.prepare(
					`SELECT pincode, city, district, state_name, latitude, longitude,
					        CASE 
					          WHEN LOWER(city) = ? THEN 1
					          WHEN LOWER(district) = ? THEN 2
					          WHEN LOWER(city) LIKE ? THEN 3
					          WHEN LOWER(district) LIKE ? THEN 4
					          ELSE 5
					        END AS relevance
					 FROM pincodes 
					 WHERE LOWER(city) LIKE ? OR LOWER(district) LIKE ?
					 ORDER BY relevance ASC, pincode ASC
					 LIMIT 10`
				).bind(
					searchPattern,
					searchPattern,
					`${searchPattern}%`,
					`${searchPattern}%`,
					`%${searchPattern}%`,
					`%${searchPattern}%`
				).all();
			}

			const results = dbQuery.results || [];
			
			console.log(`[LOCATION SEARCH] Found ${results.length} results`);

			// Format results with display field: "Pincode - City" or "Pincode - District"
			const formattedResults = results.map((row: any) => {
				const displayName = row.city || row.district || 'Unknown';
				const result: any = {
					display: `${row.pincode} - ${displayName}`,
					pincode: row.pincode,
					city: row.city || null,
					district: row.district || '',
					state: row.state_name || '',
					latitude: row.latitude ? Number(row.latitude) : null,
					longitude: row.longitude ? Number(row.longitude) : null,
				};

				// Calculate route if fromPincode was provided and coordinates exist
				if (fromCoords && result.latitude && result.longitude) {
					const toLat = result.latitude;
					const toLon = result.longitude;

					// Haversine formula for straight-line distance
					const R = 6371; // Earth radius in km
					const dLat = (toLat - fromCoords.lat) * Math.PI / 180;
					const dLon = (toLon - fromCoords.lon) * Math.PI / 180;
					const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
							  Math.cos(fromCoords.lat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
							  Math.sin(dLon/2) * Math.sin(dLon/2);
					const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
					const straightLineDistance = R * c;

					// Apply road distance multiplier (roads are not straight)
					// Factor: 1.4x for local (< 50km), 1.35x for medium (50-150km), 1.3x for long (> 150km)
					let roadFactor = 1.4;
					if (straightLineDistance > 150) roadFactor = 1.3;
					else if (straightLineDistance > 50) roadFactor = 1.35;
					
					const distance = Math.round(straightLineDistance * roadFactor * 100) / 100;

					// Estimate hours: 40 km/h for local, 50 km/h for outstation
					const avgSpeed = distance <= 50 ? 40 : 50;
					const hours = Math.round((distance / avgSpeed) * 100) / 100;

					// Classify trip
					let category = 'local';
					if (distance > 300) category = 'long-outstation';
					else if (distance > 150) category = 'medium-outstation';
					else if (distance > 50) category = 'short-outstation';

					// Calculate price (simplified)
					const baseRate = distance <= 50 ? 500 : 800;
					const perKm = distance <= 50 ? 15 : 12;
					const approxPrice = Math.round(baseRate + (distance * perKm));

					result.routeEstimation = {
						distance,
						hours,
						category,
						approxPrice,
					};
				}

				return result;
			});

			return {
				query: searchQuery,
				count: formattedResults.length,
				results: formattedResults,
			};

		} catch (error) {
			console.error("Pincode search error:", error);
			
			return c.json({
				success: false,
				errors: [{
					code: 5004,
					message: error instanceof Error ? error.message : "Failed to search pincodes",
				}],
			}, 400);
		}
	}
}
