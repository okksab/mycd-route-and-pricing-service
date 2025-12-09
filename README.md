# MyCallDriver Route & Pricing Service

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/chanfana-openapi-template)

<!-- dash-content-start -->

**AI-powered route calculation and pricing service for the MyCallDriver platform.**

This Cloudflare Worker provides OpenAPI 3.1 compliant endpoints with automatic schema generation and validation using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

## Core Features

### 🚗 Route Intelligence & Pricing Estimation
Calculate distance, duration, trip type, and approximate pricing between Indian PIN codes using Cloudflare Workers AI (Mistral-7B model).

**Endpoint:** `POST /routes/estimate`

**Example Request:**
```json
{
  "fromPin": "560001",
  "toPin": "400001"
}
```

**Example Response:**
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

📖 **[Full Endpoint Documentation](./PRICING_ENDPOINT.md)**

### 🌍 Multi-Environment Support

Two fully configured environments:
- **Development (Local)** - Local development with detailed logging
- **Production** - Optimized live environment

Each environment has:
- Separate Wrangler configuration
- Environment-specific variables
- Isolated database instances
- Custom deployment pipelines

📖 **[Environment Setup Guide](./ENVIRONMENT_SETUP.md)**

### 🔐 Secure API Key Management

Optional `MYCD_LLM_KEY` environment variable for:
- Custom AI/LLM provider integration
- Environment-specific API keys
- Usage tracking and monitoring
- Rate limiting per environment

### 🚀 CI/CD Pipelines

Automated GitHub Actions workflows for:
- **Development** - Auto-deploy on push to `develop` branch
- **Test** - Auto-deploy on push to `test` branch + PR testing
- **Production** - Auto-deploy on push to `main` with confirmation

📖 **[Deployment Guide](./DEPLOYMENT.md)**

## Technology Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono (lightweight web framework)
- **API Schema:** Chanfana (OpenAPI 3.1 auto-generation)
- **Database:** D1 (SQLite on Cloudflare)
- **AI:** Cloudflare Workers AI (Mistral-7B)
- **Validation:** Zod schemas
- **Testing:** Vitest

## Quick Start

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test the endpoint
curl -X POST http://localhost:8787/routes/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "400001"}'
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
