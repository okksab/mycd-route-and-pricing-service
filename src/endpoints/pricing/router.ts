import { Hono } from "hono";
import { fromHono } from "chanfana";
import { EstimateRouteDetails } from "./estimateRouteDetails";
import { EstimateRouteByCoordinates } from "./estimateRouteByCoordinates";
import { CalculateDistanceHaversine } from "./calculateDistanceHaversine";

export const pricingRouter = fromHono(new Hono());

// POST /routes/estimate - Estimate route details (distance, time, pricing) between two PIN codes using AI
pricingRouter.post("/estimate", EstimateRouteDetails);

// POST /routes/estimate-by-coordinates - Estimate route using lat/lon coordinates with Haversine method
pricingRouter.post("/estimate-by-coordinates", EstimateRouteByCoordinates);

// POST /routes/distance-haversine - Calculate pure distance using Haversine formula (no pricing)
pricingRouter.post("/distance-haversine", CalculateDistanceHaversine);
