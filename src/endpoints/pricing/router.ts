import { Hono } from "hono";
import { fromHono } from "chanfana";
import { EstimateRouteDetails } from "./estimateRouteDetails";

export const pricingRouter = fromHono(new Hono());

// POST /route/estimate - Estimate route details (distance, time, pricing) between two PIN codes
pricingRouter.post("/estimate", EstimateRouteDetails);
