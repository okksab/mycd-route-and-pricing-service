# Route Intelligence Endpoint - Estimate Route Details

## Overview
AI-powered endpoint that calculates route distance, travel time, trip classification, and approximate pricing between two Indian PIN codes using Cloudflare Workers AI with the Mistral-7B model.

**API Version:** 2.1.0  
**OpenAPI Tag:** Route Intelligence  
**Operation ID:** estimate-route-details  
**Environments:** Development, Test, Production

## Endpoint Details

**URL:** `POST /routes/estimate`

**Request Body:**
```json
{
  "fromPin": "560001",
  "toPin": "400001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "result": {
    "fromPin": "560001",
    "toPin": "400001",
    "distance": 842.5,
    "hours": 15.3,
    "isLocal": false,
    "isOutStation": true,
    "approxPrice": 10110
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "errors": [
    {
      "code": 5001,
      "message": "Failed to calculate route pricing"
    }
  ]
}
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `fromPin` | string | 6-digit source PIN code |
| `toPin` | string | 6-digit destination PIN code |
| `distance` | number | Distance in kilometers |
| `hours` | number | Estimated travel time in hours (with decimals) |
| `isLocal` | boolean | `true` if trip is within same city/district (< 50km) |
| `isOutStation` | boolean | `true` if trip is intercity/interstate |
| `approxPrice` | number | Approximate price in INR (₹) |

## Pricing Logic

The AI model uses the following base pricing structure:

- **Local trips** (< 50km): ₹10-15/km
- **Short outstation** (50-150km): ₹12-18/km  
- **Medium outstation** (150-400km): ₹10-15/km
- **Long outstation** (> 400km): ₹8-12/km

Additional charges:
- Base fare: ₹50-100
- Time charges: ₹2-3/minute for waiting time

## Validation Rules

- Both PIN codes must be exactly 6 digits
- PIN codes must contain only numeric characters (0-9)
- Invalid formats return 400 error with validation details

## AI Model

**Model:** `@cf/mistral/mistral-7b-instruct-v0.1` (Cloudflare Workers AI)

The model is prompted to:
1. Identify geographic locations from PIN codes
2. Calculate actual road distance (not straight-line)
3. Estimate travel time based on Indian road conditions
4. Classify trip as local vs outstation
5. Calculate pricing using driver-as-a-service rates

## Fallback Mechanism

If AI parsing fails, the service uses a heuristic fallback:
- Compares first 3 digits of PIN codes (region codes)
- Estimates distance based on region difference
- Applies standard pricing rates
- Ensures service availability even during AI failures

## Example Usage

### cURL
```bash
curl -X POST https://your-worker.workers.dev/route/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "fromPin": "560001",
    "toPin": "400001"
  }'
```

### JavaScript/Fetch
```javascript
const response = await fetch('https://your-worker.workers.dev/pricing/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fromPin: '560001',
    toPin: '400001',
  }),
});

const data = await response.json();
console.log(data.result);
```

### TypeScript/React
```typescript
interface RoutePricing {
  fromPin: string;
  toPin: string;
  distance: number;
  hours: number;
  isLocal: boolean;
  isOutStation: boolean;
  approxPrice: number;
}

const calculateRoute = async (fromPin: string, toPin: string): Promise<RoutePricing> => {
  const response = await fetch('https://your-worker.workers.dev/route/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromPin, toPin }),
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.errors[0].message);
  }
  
  return data.result;
};
```

## Performance

- **Cold start:** ~200-500ms (Cloudflare Workers)
- **Warm request:** ~50-150ms
- **AI inference:** ~300-800ms (Mistral-7B)
- **Total latency:** ~400-1000ms typical

## Rate Limits

Cloudflare Workers AI has the following limits on the free tier:
- 10,000 neurons per day
- Mistral-7B uses ~1 neuron per request
- Upgrade to Workers Paid for higher limits

## Error Codes

| Code | Description |
|------|-------------|
| 5001 | AI calculation failure or invalid result |
| 400  | Invalid request format or validation error |
| 500  | Internal server error |

## Development

### Local Testing
```bash
npm run dev
# Access at http://localhost:8787/route/estimate
```

### Deploy
```bash
# Deploy to development
npm run dev

# Deploy to test
npm run deploy:test

# Deploy to production
npm run deploy:prod
```

### View OpenAPI Documentation
Visit the root URL of your deployed worker to see interactive API documentation with this endpoint included.

## Integration Points

This endpoint is designed to be called by:
- **mycd-webapp** (Laravel admin) - For manual pricing estimates
- **mycd-driver-app** (React Native) - For driver route preview
- **mycd-cf-customer-app** (PWA) - For customer fare estimates
- **mycd-core-platform-services** (Spring Boot) - For lead pricing calculations
