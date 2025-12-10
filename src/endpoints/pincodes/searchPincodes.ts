import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";
import { z } from "zod";

/**
 * Pincode Search Endpoint
 * 
 * Search for pincodes by partial match (minimum 4 digits)
 * Returns list of pincodes with city/district names
 */
export class SearchPincodes extends OpenAPIRoute {
	public schema = {
		tags: ["Pincode Lookup"],
		summary: "Search pincodes by partial match",
		description: "Search for Indian pincodes using minimum 4 digits. Returns matching pincodes with city names (or district names if city is null). Useful for autocomplete/typeahead functionality in apps.",
		operationId: "search-pincodes",
		request: {
			body: contentJson(
				z.object({
					pincode: z.string().min(4, "Minimum 4 digits required").max(6, "Maximum 6 digits").regex(/^\d+$/, "Must contain only digits"),
				}),
			),
		},
		responses: {
			"200": {
				description: "Successfully retrieved matching pincodes",
				...contentJson({
					success: z.boolean(),
					result: z.object({
						query: z.string().describe("Search query provided"),
						count: z.number().describe("Number of matching pincodes"),
						pincodes: z.array(z.object({
							pincode: z.string(),
							location: z.string().describe("City name or District name if city is null"),
							district: z.string(),
							state: z.string(),
							latitude: z.number().nullable(),
							longitude: z.number().nullable(),
						})),
					}),
				}),
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
			const { pincode } = data.body;

			console.log(`[PINCODE SEARCH] Searching for: ${pincode}`);

			// Query D1 database with LIKE pattern
			const query = await c.env.DB.prepare(
				`SELECT pincode, city, district, state_name, latitude, longitude 
				 FROM pincodes 
				 WHERE pincode LIKE ?
				 ORDER BY pincode ASC
				 LIMIT 100`
			).bind(`${pincode}%`).all();

			const results = query.results || [];
			
			console.log(`[PINCODE SEARCH] Found ${results.length} matching pincodes`);

			// Format results: use city if available, otherwise use district
			const formattedResults = results.map((row: any) => ({
				pincode: row.pincode,
				location: row.city || row.district || 'Unknown',
				district: row.district || '',
				state: row.state_name || '',
				latitude: row.latitude ? Number(row.latitude) : null,
				longitude: row.longitude ? Number(row.longitude) : null,
			}));

			return {
				success: true,
				result: {
					query: pincode,
					count: formattedResults.length,
					pincodes: formattedResults,
				},
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
