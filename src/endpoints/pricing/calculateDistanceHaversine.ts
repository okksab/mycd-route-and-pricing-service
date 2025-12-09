import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";
import { z } from "zod";
import { haversineKm } from "../../utils/haversine";

/**
 * Pure Haversine Distance Calculation Endpoint
 * 
 * Calculates straight-line distance between two coordinates
 * No pricing, no AI, no external APIs - just pure math
 * 
 * Use case: Quick distance check for validation or comparison
 */
export class CalculateDistanceHaversine extends OpenAPIRoute {
	public schema = {
		tags: ["Route Intelligence"],
		summary: "Calculate straight-line distance using Haversine formula",
		description: "Pure mathematical calculation of great-circle distance between two geographic coordinates. Does not use AI or external APIs. Returns only the distance in kilometers.",
		operationId: "calculate-distance-haversine",
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
				description: "Successfully calculated distance",
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
						distanceKm: z.number().describe("Straight-line distance in kilometers"),
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

			console.log(`[HAVERSINE] Calculating distance: (${fromLat}, ${fromLon}) → (${toLat}, ${toLon})`);

			// Calculate distance using Haversine formula
			const distanceKm = haversineKm(fromLat, fromLon, toLat, toLon);

			console.log(`[HAVERSINE] Calculated distance: ${distanceKm} km`);

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
					distanceKm,
					method: "haversine",
				},
			};

		} catch (error) {
			console.error("Haversine calculation error:", error);
			
			return c.json({
				success: false,
				errors: [{
					code: 4001,
					message: error instanceof Error ? error.message : "Failed to calculate distance",
				}],
			}, 400);
		}
	}
}
