import { Hono } from "hono";
import { fromHono } from "chanfana";
import { SearchPincodes } from "./searchPincodes";

export const pincodeRouter = fromHono(new Hono());

// POST /pincodes/search - Search pincodes by partial match (min 4 digits)
pincodeRouter.post("/search", SearchPincodes);
