# MyCallDriver Route & Pricing Service

**AI-powered & mathematical route calculation service for the MyCallDriver platform - Built on Cloudflare Workers Edge Network**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/chanfana-openapi-template)

---

## 📋 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Cost Analysis](#cost-analysis)
- [Documentation](#documentation)

---

## 🎯 Overview

**MyCallDriver Route & Pricing Service** is a serverless microservice that provides intelligent route calculation, distance estimation, and dynamic pricing for cab bookings across India. Built on Cloudflare's edge network, it delivers sub-50ms response times globally while maintaining zero infrastructure costs for most use cases.

### **What This Service Does**

1. **Route Intelligence** - Calculates distance, travel time, and trip classification (local/outstation)
2. **Dynamic Pricing** - Computes approximate fares based on distance, time, and trip category
3. **Pincode Lookup** - Provides fast autocomplete and geocoding for 32,775+ Indian pincodes
4. **AI-Powered Estimation** - Uses Mistral-7B LLM for intelligent route predictions when needed
5. **Mathematical Precision** - Haversine formula for accurate great-circle distance calculations

### **Why This Service Exists**

- **Fast:** Edge-deployed for <50ms latency across India
- **Accurate:** Real pincode data with lat/lon coordinates from geo_pincode_master database
- **Cost-Effective:** FREE for up to 5M requests/month on Cloudflare
- **Scalable:** Handles 1M+ requests/day without infrastructure management
- **Flexible:** Multiple calculation methods (AI, Haversine, coordinates, pincodes)

---

## ✨ Key Features

### 🚗 **Route Intelligence & Pricing**

#### **1. AI-Powered Route Estimation** (`/routes/estimate`)
- Uses Cloudflare Workers AI (Mistral-7B) for intelligent predictions
- Handles ambiguous or incomplete location data
- Provides fallback calculations when AI is unavailable
- **Caveat:** AI responses can vary (±20% variance observed)

#### **2. Pincode-Based Routing** (`/routes/estimate-by-pincode`) ⭐
- Queries D1 database for exact lat/lon coordinates
- Uses Haversine formula for consistent distance calculation
- Returns city/district names automatically
- **Recommended for production use**

#### **3. Coordinate-Based Routing** (`/routes/estimate-by-coordinates`)
- Direct lat/lon input for maximum flexibility
- No database lookup required
- Perfect for GPS-enabled applications

#### **4. Pure Distance Calculation** (`/routes/distance-haversine`)
- Lightweight endpoint for distance-only queries
- No pricing calculations
- Ultra-fast response (<10ms)

### 📍 **Pincode Services**

#### **5. Pincode Search & Autocomplete** (`/pincodes/search`)
- Typeahead-ready with minimum 4 digits
- Returns up to 100 matching results
- Includes city, district, state, and coordinates
- Smart fallback: shows district name when city is null

### 🗄️ **Database Integration**

- **D1 Database:** 32,775+ Indian pincodes with GPS coordinates
- **Source:** `geo_pincode_master` table from MySQL
- **Migration Tools:** Automated MySQL → D1 sync with duplicate detection
- **Data Quality:** Only includes pincodes with verified lat/lon coordinates

---

## 🛠 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Cloudflare Workers | Serverless edge compute |
| **Framework** | Hono v4.10.7 | Lightweight web framework |
| **API Schema** | Chanfana v2.8.3 | OpenAPI 3.1 auto-generation |
| **Database** | Cloudflare D1 (SQLite) | Serverless relational database |
| **AI Engine** | Cloudflare Workers AI | Mistral-7B-Instruct model |
| **Validation** | Zod v3.25.67 | Runtime type validation |
| **Testing** | Vitest v3.2.4 | Unit & integration tests |
| **Language** | TypeScript 5.9.3 | Type-safe development |

### **Why These Technologies?**

- **Cloudflare Workers:** Global edge network (310+ cities), cold start <10ms
- **Hono:** 3x faster than Express.js, built for edge
- **D1:** Co-located with Workers (no network latency), FREE tier sufficient
- **Workers AI:** No external API calls, pay-per-use, 10k requests/day free
- **TypeScript:** Type safety prevents 80% of common bugs

---

## 🌐 API Endpoints

### **Base URL**
```
Development: http://localhost:8787
Production: https://mycd-route-and-pricing-service.rb-a1d.workers.dev
```

### **Endpoints Summary**

| Method | Endpoint | Description | DB Queries |
|--------|----------|-------------|------------|
| `POST` | `/routes/estimate` | AI-powered route estimation | 0 |
| `POST` | `/routes/estimate-by-pincode` | ⭐ Pincode lookup + Haversine | 2 reads |
| `POST` | `/routes/estimate-by-coordinates` | Direct lat/lon calculation | 0 |
| `POST` | `/routes/distance-haversine` | Pure distance (no pricing) | 0 |
| `POST` | `/pincodes/search` | Pincode autocomplete | 1 read |
| `GET` | `/` | Interactive OpenAPI docs | 0 |

### **Detailed Endpoint Documentation**

#### **1. Estimate Route by Pincode** ⭐ **RECOMMENDED**

```bash
POST /routes/estimate-by-pincode
Content-Type: application/json

{
  "fromPincode": "560001",  # Bangalore
  "toPincode": "600001"     # Chennai
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "fromPincode": "560001",
    "fromLocation": "Bangalore",
    "fromCoordinates": { "lat": 12.9716, "lon": 77.5946 },
    "toPincode": "600001",
    "toLocation": "Chennai",
    "toCoordinates": { "lat": 13.0827, "lon": 80.2707 },
    "distance": 346.12,
    "hours": 6.92,
    "isLocal": false,
    "isOutStation": true,
    "category": "medium-outstation",
    "approxPrice": 4453.44,
    "method": "haversine-with-d1-lookup"
  }
}
```

#### **2. Search Pincodes**

```bash
POST /pincodes/search
Content-Type: application/json

{
  "pincode": "5600"  # Minimum 4 digits
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "query": "5600",
    "count": 15,
    "pincodes": [
      {
        "pincode": "560001",
        "location": "Bangalore",
        "district": "Bangalore Urban",
        "state": "Karnataka",
        "latitude": 12.9716,
        "longitude": 77.5946
      }
    ]
  }
}
```

📖 **[Full API Documentation](./PRICING_ENDPOINT.md)**

---

## 🏗 Architecture

### **System Design**

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                   │
│                                                               │
│  ┌────────────────┐         ┌─────────────────┐            │
│  │  Hono Router   │────────▶│  OpenAPI Docs   │            │
│  └────────┬───────┘         └─────────────────┘            │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────────────────────────────┐            │
│  │           Route Endpoints                   │            │
│  │  • /routes/estimate (AI)                   │            │
│  │  • /routes/estimate-by-pincode (D1+Math)   │            │
│  │  • /routes/estimate-by-coordinates (Math)  │            │
│  │  • /routes/distance-haversine (Math)       │            │
│  └───────┬────────────────────────────────────┘            │
│          │                                                  │
│          ▼                                                  │
│  ┌────────────────┐         ┌─────────────────┐            │
│  │   D1 Database  │         │  Workers AI     │            │
│  │  (32k pincodes)│         │  (Mistral-7B)   │            │
│  └────────────────┘         └─────────────────┘            │
│                                                               │
│  ┌────────────────────────────────────────────┐            │
│  │        Haversine Utility Module            │            │
│  │  • Distance calculation                     │            │
│  │  • Trip classification (local/outstation)   │            │
│  │  • Dynamic pricing logic                    │            │
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### **Data Flow**

**Option 1: Pincode-Based (Recommended)**
```
User Request (pincodes)
    ↓
Query D1 for FROM pincode lat/lon
    ↓
Query D1 for TO pincode lat/lon
    ↓
Calculate distance (Haversine formula)
    ↓
Estimate travel time (distance / 50 km/h)
    ↓
Classify trip (local/outstation based on distance)
    ↓
Calculate price (distance-based pricing tiers)
    ↓
Return structured response
```

**Option 2: AI-Powered (Fallback)**
```
User Request (pincodes)
    ↓
Send to Workers AI (Mistral-7B)
    ↓
AI generates route estimation
    ↓
Parse & validate AI response
    ↓
Return structured response (or use fallback logic)
```

### **Key Components**

#### **1. Haversine Utility (`src/utils/haversine.ts`)**
- **haversineKm()** - Great-circle distance calculation (Earth radius = 6371 km)
- **classifyTrip()** - Categorizes trips: local (<50km), short-outstation (50-150km), medium (150-400km), long (>400km)
- **calculatePrice()** - Dynamic pricing: ₹10-15/km base + distance tiers + time charges
- **estimateTravelTime()** - Speed-based estimation: 30 km/h (city), 45-55 km/h (highway)

#### **2. Database Schema (`migrations/0002_add_pincodes_table.sql`)**
```sql
CREATE TABLE pincodes (
  id INTEGER PRIMARY KEY,
  pincode VARCHAR(10) UNIQUE,
  city VARCHAR(100),
  district VARCHAR(100),
  state_name VARCHAR(100),
  state_code VARCHAR(10),
  latitude REAL,
  longitude REAL,
  -- 9 more metadata fields
);
-- 5 indexes for optimized queries
```

#### **3. Migration Tools (`migrations/direct-mysql-to-d1.js`)**
- Connects to MySQL `geo_pincode_master` table
- Queries D1 for existing pincodes (skip duplicates)
- Batches inserts (500 records/batch)
- Generates 3 CSV logs: inserted, skipped, errors
- Safe to run multiple times (idempotent)

---

## 🚀 Quick Start

### **Prerequisites**
```bash
Node.js >= 18.x
npm or pnpm
Cloudflare account (free tier works)
```

### **Installation**

```bash
# Clone repository
cd mycd-route-and-pricing-service

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Create D1 database (if not exists)
wrangler d1 create mycd-route-and-pricing-service-db
# Copy the database_id to wrangler.jsonc
```

### **Local Development**

```bash
# Apply migrations (creates tables)
npm run seedLocalDb

# Import pincode data (optional for testing)
# Edit migrations/direct-mysql-to-d1.js: USE_LOCAL = true
cd migrations && node direct-mysql-to-d1.js && cd ..

# Start dev server
npm run dev
```

Server starts at: `http://localhost:8787`

### **Test Endpoints**

```bash
# Test pincode search
curl -X POST http://localhost:8787/pincodes/search \
  -H "Content-Type: application/json" \
  -d '{"pincode": "5600"}'

# Test route calculation
curl -X POST http://localhost:8787/routes/estimate-by-pincode \
  -H "Content-Type: application/json" \
  -d '{"fromPincode": "560001", "toPincode": "600001"}'

# Test pure distance
curl -X POST http://localhost:8787/routes/distance-haversine \
  -H "Content-Type: application/json" \
  -d '{"fromLat": 12.9716, "fromLon": 77.5946, "toLat": 13.0827, "toLon": 80.2707}'
```

### **Interactive API Docs**
Open `http://localhost:8787/` in your browser to see the auto-generated OpenAPI documentation with a built-in API explorer.

---

## 📦 Deployment

### **Deploy to Production**

```bash
# Deploy Worker
npm run deploy:prod

# Apply migrations to remote D1
wrangler d1 migrations apply mycd-route-and-pricing-service-db --remote

# Import pincode data to remote
# Edit migrations/direct-mysql-to-d1.js: USE_LOCAL = false
cd migrations && node direct-mysql-to-d1.js
```

### **Environment Variables**

Optional: Set custom AI API key
```bash
# Development
wrangler secret put MYCD_LLM_KEY

# Production
wrangler secret put MYCD_LLM_KEY --config wrangler.production.jsonc
```

### **Verify Deployment**

```bash
# Check Worker status
wrangler deployments list

# Query remote D1
wrangler d1 execute mycd-route-and-pricing-service-db --remote \
  --command="SELECT COUNT(*) FROM pincodes"

# Test production endpoint
curl https://mycd-route-and-pricing-service.rb-a1d.workers.dev/pincodes/search \
  -X POST -H "Content-Type: application/json" -d '{"pincode":"5600"}'
```

📖 **[Complete Deployment Guide](./DEPLOYMENT.md)**

---

## 💰 Cost Analysis

### **Cloudflare Pricing Breakdown**

| Component | Free Tier | Usage | Cost |
|-----------|-----------|-------|------|
| **Workers Requests** | 100k/day | Unlimited after paid | $0 - $5/month |
| **D1 Reads** | 5M/month | ~2 reads per route request | **$0** (within free tier) |
| **D1 Writes** | 100k/month | Only during data import | **$0** |
| **D1 Storage** | 5 GB | 32k pincodes ≈ 6 MB | **$0** |
| **Workers AI** | 10k requests/day | Per AI endpoint call | **$0** (within free tier) |

### **Real-World Cost Examples**

**Scenario 1: Small App (10k requests/day)**
- 300k D1 reads/month (well below 5M limit)
- **Total Cost: $0/month** ✅

**Scenario 2: Medium App (100k requests/day)**
- 3M D1 reads/month (within free tier)
- **Total Cost: $0/month** ✅

**Scenario 3: High Traffic (1M requests/day)**
- 30M D1 reads/month
- Need Workers Paid Plan ($5/month)
- Includes 25M reads, overage: 5M × $0.001 = $0.005
- **Total Cost: $5.005/month** ✅

### **Cost Comparison with Alternatives**

| Solution | 10M requests/month |
|----------|-------------------|
| **This Service (Cloudflare)** | **$0** |
| Google Maps Distance Matrix | ~$50 |
| MapMyIndia API | ~$20 |
| AWS Lambda + RDS | ~$80 |
| Self-hosted on EC2 | ~$50-100 |

**⚡ 90-100% cost savings compared to traditional solutions**

---

## 📚 Documentation

### **Project Documentation**
- **[API Reference](./PRICING_ENDPOINT.md)** - Detailed endpoint documentation
- **[Environment Setup](./ENVIRONMENT_SETUP.md)** - Multi-environment configuration
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment steps
- **[Migration Guide](./migrations/MIGRATION_GUIDE.md)** - MySQL to D1 data migration
- **[Quick Start](./QUICKSTART.md)** - Get started in 5 minutes
- **[Release Notes](./V2.1.0_RELEASE_NOTES.md)** - Version history and changes
- **[Changelog](./CHANGELOG.md)** - Complete version timeline

### **Key Files**
```
mycd-route-and-pricing-service/
├── src/
│   ├── index.ts                    # Main Worker entry point
│   ├── types.ts                    # TypeScript type definitions
│   ├── endpoints/
│   │   ├── pricing/
│   │   │   ├── estimateRouteByPincode.ts      # ⭐ Recommended endpoint
│   │   │   ├── estimateRouteByCoordinates.ts  # Direct lat/lon
│   │   │   ├── estimateRouteDetails.ts        # AI-powered
│   │   │   └── calculateDistanceHaversine.ts  # Distance only
│   │   ├── pincodes/
│   │   │   ├── searchPincodes.ts   # Autocomplete endpoint
│   │   │   └── router.ts
│   │   └── tasks/                  # Demo CRUD endpoints
│   └── utils/
│       └── haversine.ts            # Core distance/pricing logic
├── migrations/
│   ├── 0001_add_tasks_table.sql
│   ├── 0002_add_pincodes_table.sql
│   ├── direct-mysql-to-d1.js       # Migration script
│   └── MIGRATION_GUIDE.md
├── wrangler.jsonc                  # Development config
├── wrangler.production.jsonc       # Production config
└── package.json
```

---

## 🔧 Development

### **Project Structure**
- **Endpoints:** RESTful routes with OpenAPI schema auto-generation
- **Database:** D1 (SQLite) with migration system
- **Validation:** Zod schemas ensure type safety at runtime
- **Testing:** Vitest for unit and integration tests

### **Available Scripts**

```bash
npm run dev              # Start local dev server
npm run deploy           # Deploy to development
npm run deploy:prod      # Deploy to production
npm run test             # Run test suite
npm run seedLocalDb      # Apply migrations locally
npm run secrets:set      # Set environment secrets
```

### **Adding New Endpoints**

1. Create endpoint file in `src/endpoints/`
2. Define OpenAPI schema with Zod
3. Register route in appropriate router
4. Test with `npm run dev`

Example:
```typescript
export class MyEndpoint extends OpenAPIRoute {
  public schema = {
    tags: ["My Feature"],
    summary: "Description",
    request: {
      body: contentJson(z.object({ ... }))
    },
    responses: { ... }
  };
  
  public async handle(c: AppContext) {
    // Implementation
  }
}
```

---

## 🤝 Integration

### **Using in MyCallDriver Platform**

```typescript
// Customer app: Pincode autocomplete
const searchPincodes = async (input: string) => {
  const response = await fetch('https://mycd-route-and-pricing-service.rb-a1d.workers.dev/pincodes/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pincode: input })
  });
  return response.json();
};

// Driver app: Calculate route for lead acceptance
const calculateRoute = async (fromPin: string, toPin: string) => {
  const response = await fetch('https://mycd-route-and-pricing-service.rb-a1d.workers.dev/routes/estimate-by-pincode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromPincode: fromPin, toPincode: toPin })
  });
  return response.json();
};
```

---

## 📊 Performance

- **Latency:** <50ms average (edge-deployed)
- **Cold Start:** <10ms (Cloudflare Workers)
- **Database Query:** <5ms (D1 indexed lookups)
- **Haversine Calculation:** <1ms (pure math)
- **AI Response:** 500-2000ms (when used)

**Recommendation:** Use `/routes/estimate-by-pincode` for production (no AI variance, consistent <50ms response)

---

## 🐛 Troubleshooting

### **Common Issues**

**1. "Database not found"**
```bash
# Apply migrations
wrangler d1 migrations apply mycd-route-and-pricing-service-db --local
```

**2. "Pincode not found"**
```bash
# Import data
cd migrations
node direct-mysql-to-d1.js
```

**3. "AI timeout"**
- Use `/routes/estimate-by-pincode` instead (no AI dependency)

**4. "Transaction not supported (remote D1)"**
- Script already handles this (transactions only for local)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🌟 Contributing

This is a microservice for the MyCallDriver platform. For contributions or issues, contact the platform team.

---

**Built with ❤️ for MyCallDriver by leveraging Cloudflare's edge network**
```

### Deploy to Production
```bash
# Configure production secrets (one-time)
npm run secrets:set:prod

# Deploy
npm run deploy:prod
```

📖 **[5-Minute Quick Start Guide](./QUICKSTART.md)**

A live public deployment of this service is available at [https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev](https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev)

<!-- dash-content-end -->

## Setup Steps

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "openapi-template-db":
   ```bash
   npx wrangler d1 create openapi-template-db
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
4. Deploy the project!
   ```bash
   npx wrangler deploy
   ```
5. Monitor your worker
   ```bash
   npx wrangler tail
   ```

## Testing

This template includes integration tests using [Vitest](https://vitest.dev/). To run the tests locally:

```bash
npm run test
```

Test files are located in the `tests/` directory, with examples demonstrating how to test your endpoints and database interactions.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. Integration tests are located in the `tests/` directory.
4. For more information read the [chanfana documentation](https://chanfana.com/), [Hono documentation](https://hono.dev/docs), and [Vitest documentation](https://vitest.dev/guide/).
