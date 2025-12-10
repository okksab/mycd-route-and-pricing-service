import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks/router";
import { pricingRouter } from "./endpoints/pricing/router";
import { pincodeRouter } from "./endpoints/pincodes/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
	if (err instanceof ApiException) {
		// If it's a Chanfana ApiException, let Chanfana handle the response
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err); // Log the error if it's not known

	// For other errors, return a generic 500 response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
	schema: {
		info: {
			title: "MyCallDriver Route Intelligence API",
			version: "2.1.0",
			description: "AI-powered route intelligence and pricing service for MyCallDriver platform. Provides intelligent route estimation, distance calculation, travel time prediction, and dynamic pricing between Indian locations using advanced LLM capabilities.",
		},
	},
});

// Register Tasks Sub router
openapi.route("/tasks", tasksRouter);

// Register Route Intelligence router
openapi.route("/routes", pricingRouter);

// Register Pincode Lookup router
openapi.route("/pincodes", pincodeRouter);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);

// Export the Hono app
export default app;
