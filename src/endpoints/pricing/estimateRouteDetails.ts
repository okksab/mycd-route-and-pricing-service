import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";
import { z } from "zod";

export class EstimateRouteDetails extends OpenAPIRoute {
	public schema = {
		tags: ["Route Intelligence"],
		summary: "Estimate route details and pricing between two locations",
		description: "AI-powered route estimation providing distance, travel time, trip classification, and dynamic pricing between Indian PIN codes. Supports both local and outstation trips with intelligent fare calculation.",
		operationId: "estimate-route-details",
		request: {
			body: contentJson(
				z.object({
					fromPin: z.string().length(6, "PIN code must be 6 digits").regex(/^\d{6}$/, "PIN code must contain only digits"),
					toPin: z.string().length(6, "PIN code must be 6 digits").regex(/^\d{6}$/, "PIN code must contain only digits"),
				}),
			),
		},
		responses: {
			"200": {
				description: "Successfully calculated route pricing",
				...contentJson({
					success: z.boolean(),
					result: z.object({
						fromPin: z.string(),
						toPin: z.string(),
						distance: z.number().describe("Distance in kilometers"),
						hours: z.number().describe("Estimated travel time in hours"),
						isLocal: z.boolean().describe("Whether the trip is within the same city/district"),
						isOutStation: z.boolean().describe("Whether the trip is intercity/interstate"),
						approxPrice: z.number().describe("Approximate price in INR"),
					}),
				}),
			},
			"400": {
				description: "Invalid request parameters",
				...contentJson({
					success: z.boolean(),
					errors: z.array(z.object({
						code: z.number(),
						message: z.string(),
					})),
				}),
			},
			"500": {
				description: "Internal server error or AI service failure",
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
			const { fromPin, toPin } = data.body;

			// Construct the prompt for the AI model
			const prompt = `You are a backend pricing engine for a cab platform.
Your task is to compute route and pricing information between two Indian PIN codes.

Input you will receive (from the system, not the user):
fromPin: ${fromPin}
toPin: ${toPin}

Your output MUST follow these rules exactly:

1. Respond with valid JSON only, with no explanations or extra text.

2. The JSON must contain exactly these keys and types:
   - "distance": number (kilometers), use up to 2 decimal places. Example: 12.50
   - "hours": number (total travel time in hours as a decimal).
     Example: 1 hour 30 minutes → 1.50
     Example: 2 hours 15 minutes → 2.25
   - "isLocal": boolean (true if it is a local trip, false otherwise).
   - "isOutStation": boolean (true if it is an outstation trip, false otherwise).
   - "approxPrice": string, always formatted with 2 decimal places (no currency symbol).
     Example: "100.00", "275.50".

3. Do not add any other fields.
4. Do not wrap the JSON in markdown (no \`\`\`json).
5. If you are uncertain, make a reasonable estimate, but still return all fields with the correct types and formats.

Base pricing logic for reference:
- Local trips (< 50km): ₹10-15/km base rate
- Short outstation (50-150km): ₹12-18/km
- Medium outstation (150-400km): ₹10-15/km
- Long outstation (> 400km): ₹8-12/km
Add reasonable base fare (₹50-100) and consider time charges (₹2-3/minute for waiting).

Output format example (structure only):
{
  "distance": 120.50,
  "hours": 2.25,
  "isLocal": false,
  "isOutStation": true,
  "approxPrice": "750.00"
}`;

			// Check if custom LLM key is provided
			const llmKey = c.env.MYCD_LLM_KEY;
			const environment = c.env.ENVIRONMENT || 'development';
			
			// Log environment info (only in non-production)
			if (environment !== 'production') {
				console.log(`[${environment.toUpperCase()}] Processing route estimate: ${fromPin} → ${toPin}`);
				console.log(`Using ${llmKey ? 'custom' : 'default'} AI credentials`);
			}

			// Log before AI call
			console.log(`[AI CALL] Starting AI inference for route: ${fromPin} → ${toPin}`);
			console.log(`[AI CALL] Model: @cf/mistral/mistral-7b-instruct-v0.1`);
			console.log(`[AI CALL] Timestamp: ${new Date().toISOString()}`);

			// Call Cloudflare AI with Mistral model
			// Note: MYCD_LLM_KEY can be used for custom AI provider in future
			const aiStartTime = Date.now();
			const response = await c.env.AI.run("@cf/mistral/mistral-7b-instruct-v0.1", {
				messages: [
					{
						role: "system",
						content: "You are a precise route calculation API. You MUST respond with valid JSON only, no markdown formatting, no explanations. Just pure JSON.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				stream: false,
			});
			const aiEndTime = Date.now();
			const aiDuration = aiEndTime - aiStartTime;

			// Log after AI call
			console.log(`[AI RESPONSE] Received response in ${aiDuration}ms`);
			console.log(`[AI RESPONSE] Raw response:`, typeof response === 'string' ? response : JSON.stringify(response));
			console.log(`[AI RESPONSE] Timestamp: ${new Date().toISOString()}`);

			// Parse the AI response
			let aiResult;
			try {
				// Extract the response text
				const responseText = typeof response === 'string' 
					? response 
					: response.response || JSON.stringify(response);

				// Clean up any markdown code blocks or extra formatting
				const cleanedResponse = responseText
					.replace(/```json\n?/g, '')
					.replace(/```\n?/g, '')
					.trim();

				aiResult = JSON.parse(cleanedResponse);
			} catch (parseError) {
				console.error("AI response parsing error:", parseError);
				console.error("Raw AI response:", response);
				
				// Fallback calculation if AI parsing fails
				aiResult = this.calculateFallbackPricing(fromPin, toPin);
			}

			// Validate and sanitize the result
			const result = {
				fromPin,
				toPin,
				distance: Number(aiResult.distance) || 0,
				hours: Number(aiResult.hours) || 0,
				isLocal: Boolean(aiResult.isLocal),
				isOutStation: Boolean(aiResult.isOutStation),
				// Handle approxPrice as string or number, convert to number for response
				approxPrice: typeof aiResult.approxPrice === 'string' 
					? parseFloat(aiResult.approxPrice) 
					: Number(aiResult.approxPrice) || 0,
			};

			// Sanity checks
			if (result.distance < 0 || result.hours < 0 || result.approxPrice < 0) {
				throw new Error("Invalid calculation result from AI");
			}

			return {
				success: true,
				result,
			};

		} catch (error) {
			console.error("Route calculation error:", error);
			
			// Return error response
			return c.json({
				success: false,
				errors: [{
					code: 5001,
					message: error instanceof Error ? error.message : "Failed to calculate route pricing",
				}],
			}, 500);
		}
	}

	/**
	 * Fallback pricing calculation when AI fails
	 * Uses simple distance heuristics based on PIN code patterns
	 */
	private calculateFallbackPricing(fromPin: string, toPin: string): any {
		// Simple heuristic: first 3 digits of PIN represent region
		const fromRegion = parseInt(fromPin.substring(0, 3));
		const toRegion = parseInt(toPin.substring(0, 3));
		const regionDiff = Math.abs(fromRegion - toRegion);

		let distance: number;
		let hours: number;
		let isLocal: boolean;
		let isOutStation: boolean;

		if (regionDiff === 0) {
			// Same region (first 3 digits match) - likely local
			distance = 15 + Math.random() * 35; // 15-50 km
			hours = distance / 30; // ~30 km/h average in city
			isLocal = true;
			isOutStation = false;
		} else if (regionDiff <= 5) {
			// Nearby regions - short outstation
			distance = 80 + Math.random() * 120; // 80-200 km
			hours = distance / 45; // ~45 km/h average
			isLocal = false;
			isOutStation = true;
		} else if (regionDiff <= 20) {
			// Medium distance
			distance = 200 + Math.random() * 300; // 200-500 km
			hours = distance / 50; // ~50 km/h average
			isLocal = false;
			isOutStation = true;
		} else {
			// Long distance
			distance = 500 + Math.random() * 500; // 500-1000 km
			hours = distance / 55; // ~55 km/h average
			isLocal = false;
			isOutStation = true;
		}

		// Calculate price based on distance
		let pricePerKm: number;
		if (distance < 50) {
			pricePerKm = 12;
		} else if (distance < 150) {
			pricePerKm = 15;
		} else if (distance < 400) {
			pricePerKm = 12;
		} else {
			pricePerKm = 10;
		}

		const baseFare = 80;
		const approxPrice = Math.round(baseFare + (distance * pricePerKm));

		return {
			distance: Math.round(distance * 10) / 10, // Round to 1 decimal
			hours: Math.round(hours * 100) / 100, // Round to 2 decimals
			isLocal,
			isOutStation,
			approxPrice,
		};
	}
}
