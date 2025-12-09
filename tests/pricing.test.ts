import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("Route Intelligence - Estimate Endpoint", () => {
	it("should estimate route details for valid PIN codes", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fromPin: "560001",
				toPin: "400001",
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("success", true);
		expect(data).toHaveProperty("result");
		expect(data.result).toHaveProperty("fromPin", "560001");
		expect(data.result).toHaveProperty("toPin", "400001");
		expect(data.result).toHaveProperty("distance");
		expect(data.result).toHaveProperty("hours");
		expect(data.result).toHaveProperty("isLocal");
		expect(data.result).toHaveProperty("isOutStation");
		expect(data.result).toHaveProperty("approxPrice");

		// Validate types
		expect(typeof data.result.distance).toBe("number");
		expect(typeof data.result.hours).toBe("number");
		expect(typeof data.result.isLocal).toBe("boolean");
		expect(typeof data.result.isOutStation).toBe("boolean");
		expect(typeof data.result.approxPrice).toBe("number");

		// Validate reasonable values
		expect(data.result.distance).toBeGreaterThan(0);
		expect(data.result.hours).toBeGreaterThan(0);
		expect(data.result.approxPrice).toBeGreaterThan(0);
	});

	it("should handle local trip (same PIN prefix)", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fromPin: "560001",
				toPin: "560050",
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.result.isLocal).toBe(true);
		expect(data.result.isOutStation).toBe(false);
		expect(data.result.distance).toBeLessThan(100); // Local trips should be < 100km
	});

	it("should reject invalid PIN code (not 6 digits)", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fromPin: "56001", // Only 5 digits
				toPin: "400001",
			}),
		});

		expect(response.status).toBe(400);

		const data = await response.json();
		expect(data.success).toBe(false);
		expect(data).toHaveProperty("errors");
	});

	it("should reject non-numeric PIN code", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fromPin: "56000A",
				toPin: "400001",
			}),
		});

		expect(response.status).toBe(400);

		const data = await response.json();
		expect(data.success).toBe(false);
		expect(data).toHaveProperty("errors");
	});

	it("should reject missing fromPin", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				toPin: "400001",
			}),
		});

		expect(response.status).toBe(400);
	});

	it("should reject missing toPin", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fromPin: "560001",
			}),
		});

		expect(response.status).toBe(400);
	});

	it("should calculate long distance outstation trip", async () => {
		const response = await app.request("/route/estimate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				fromPin: "110001", // Delhi
				toPin: "600001", // Chennai
			}),
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.result.isOutStation).toBe(true);
		expect(data.result.isLocal).toBe(false);
		expect(data.result.distance).toBeGreaterThan(1000); // Delhi to Chennai is 2000+ km
	});
});
