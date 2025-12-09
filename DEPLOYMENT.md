# Deployment Guide - MyCallDriver Route & Pricing Service

## Overview

This service supports two deployment environments:
- **Development (Local)** - Local development with detailed logging
- **Production (Live)** - Optimized live environment

Each environment has:
- Separate Wrangler configuration file
- Independent database instances
- Environment-specific variables
- Automated CI/CD pipelines

📖 **See also:** [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Cloudflare account
- Wrangler CLI configured
- GitHub repository (for CI/CD)

## Initial Setup

### 1. Install Dependencies
```bash
cd mycd-route-and-pricing-service
npm install
```

### 2. Configure Wrangler
Login to Cloudflare:
```bash
npx wrangler login
```

### 3. Create D1 Databases

Create databases for each environment:

```bash
# Development database
npx wrangler d1 create mycd-route-and-pricing-service-db

# Production database
npx wrangler d1 create mycd-route-and-pricing-service-prod-db
```

Update the database IDs in each configuration file:
- `wrangler.jsonc` (development)
- `wrangler.production.jsonc` (production)

### 4. Run Database Migrations

```bash
# Development
npx wrangler d1 migrations apply DB --remote

# Production
npx wrangler d1 migrations apply DB --remote --config wrangler.production.jsonc
```

### 5. Configure Environment Variables

Create local environment files from templates:

```bash
# Development (local)
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your MYCD_LLM_KEY if needed

# Production
cp .env.production.example .env.production
# Edit .env.production if needed
```

**Important:** Never commit `.dev.vars` or `.env.*` files to Git!

## Local Development

### Start Dev Server
```bash
npm run dev
```

The service will be available at `http://localhost:8787`

### Test Locally
```bash
# Run integration tests
npm run test

# Test the route estimation endpoint
curl -X POST http://localhost:8787/routes/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "400001"}'
```

### View OpenAPI Documentation
Visit `http://localhost:8787/` to see the interactive API documentation.

## Manual Deployment

### Deploy to Development (Local)
```bash
npm run deploy
```

### Deploy to Production
```bash
# Set secrets (one-time)
npm run secrets:set:prod

# Deploy
npm run deploy:prod
```

### Deployment Output
```
✨ Successfully deployed to:
https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev         (Development)
https://mycd-route-and-pricing-service-prod.YOUR-SUBDOMAIN.workers.dev    (Production)
```

## Automated Deployment (CI/CD)

### GitHub Actions Workflows

Two automated workflows are configured:

**1. Development Deployment** (`.github/workflows/deploy-dev.yml`)
- **Triggers:** Push to `develop` or `dev` branches
- **Auto-deploys:** Yes
- **Environment:** Development
- **Secret required:** `MYCD_LLM_KEY_DEV`

**2. Production Deployment** (`.github/workflows/deploy-prod.yml`)
- **Triggers:** Push to `main` branch, version tags, manual with confirmation
- **Auto-deploys:** Yes (with security checks)
- **Environment:** Production
- **Secret required:** `MYCD_LLM_KEY_PROD`
- **Safety:** Manual deploys require typing "deploy-to-production"
- **Post-deploy:** Creates Git tag and GitHub release

### Configure GitHub Secrets

Navigate to GitHub repository → Settings → Secrets and variables → Actions:

```bash
# Required for all workflows
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Optional: Environment-specific LLM keys
MYCD_LLM_KEY_DEV=your_dev_llm_key
MYCD_LLM_KEY_PROD=your_production_llm_key
```

### Workflow Execution

```bash
# Development: Push to develop branch
git checkout develop
git add .
git commit -m "feat: new feature"
git push origin develop
# ✅ Auto-deploys to development

# Production: Push to main or create tag
git checkout main
git merge develop
git push origin main
# ✅ Auto-deploys to production

# Or create version tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
# ✅ Auto-deploys to production with GitHub release
```

## Post-Deployment Verification

### 1. Test Health Endpoint
```bash
# Development
curl https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev/

# Production
curl https://mycd-route-and-pricing-service-prod.YOUR-SUBDOMAIN.workers.dev/
```

Should return OpenAPI documentation HTML.

### 2. Test Route Estimation Endpoint
```bash
# Production example
curl -X POST https://mycd-route-and-pricing-service-prod.YOUR-SUBDOMAIN.workers.dev/routes/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "fromPin": "560001",
    "toPin": "400001"
  }'
```

Expected response:
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

### 3. View Real-time Logs
```bash
# Development
npx wrangler tail

# Production
npx wrangler tail --config wrangler.production.jsonc
```

## Environment Configuration

### wrangler.jsonc Structure
```jsonc
{
  "compatibility_date": "2025-10-08",
  "main": "src/index.ts",
  "name": "mycd-route-and-pricing-service",
  "upload_source_maps": true,
  "observability": {
    "enabled": true
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mycd-route-and-pricing-service-db",
      "database_id": "74d5a117-38a2-45aa-9913-8ad8771681ad"
    }
  ],
  "ai": {
    "binding": "AI"
  }
}
```

## Custom Domain Setup (Optional)

### Add Custom Domain
1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add custom domain: `pricing-api.mycalldriver.com`

### Update DNS
Add a CNAME record:
```
pricing-api.mycalldriver.com -> mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev
```

## Integration with Other Services

### Update API Base URLs

**Laravel (mycd-webapp):**
```php
// config/services.php
'pricing' => [
    'base_url' => env('PRICING_API_URL', 'https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev'),
],
```

**.env:**
```
PRICING_API_URL=https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev
```

**React Native (mycd-driver-app):**
```typescript
// src/config/api.ts
export const PRICING_API_URL = 
  __DEV__ 
    ? 'http://localhost:8787'
    : 'https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev';
```

**Spring Boot (mycd-core-platform-services):**
```yaml
# application.yml
external:
  pricing:
    api:
      url: https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev
```

## Monitoring & Observability

### View Analytics
```bash
# Real-time tail
npx wrangler tail

# View in dashboard
# Cloudflare Dashboard → Workers & Pages → Analytics
```

### Metrics Available
- Request count
- Error rate
- CPU time
- Duration (p50, p99)
- AI inference time

### Alerts Setup
1. Go to Cloudflare Dashboard → Notifications
2. Create alert for:
   - Error rate > 5%
   - CPU time > 50ms average
   - Request rate spike

## Troubleshooting

### Issue: AI binding not working
**Solution:** Ensure `wrangler.jsonc` has AI binding configured:
```jsonc
"ai": {
  "binding": "AI"
}
```

### Issue: D1 database not found
**Solution:** Run migrations:
```bash
npx wrangler d1 migrations apply DB --remote
```

### Issue: CORS errors
**Solution:** Add CORS middleware in `src/index.ts`:
```typescript
import { cors } from 'hono/cors';

app.use('/pricing/*', cors({
  origin: ['https://mycalldriver.com', 'http://localhost:3000'],
}));
```

### Issue: TypeScript errors
**Solution:** Regenerate types:
```bash
npm run cf-typegen
```

## Performance Optimization

### Enable Caching
Add cache headers to responses:
```typescript
return c.json(result, 200, {
  'Cache-Control': 'public, max-age=300', // 5 minutes
});
```

### Rate Limiting
Add rate limiting using Cloudflare Rate Limiting:
```jsonc
// wrangler.jsonc
"limits": {
  "cpu_ms": 50
}
```

## Rollback Procedure

### Rollback to Previous Version
```bash
# View deployments
npx wrangler deployments list

# Rollback to specific deployment
npx wrangler rollback [DEPLOYMENT_ID]
```

## CI/CD Setup

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Worker

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Security Checklist

- [ ] API token secured in environment variables
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose internals
- [ ] Observability enabled for monitoring
- [ ] Custom domain uses HTTPS
- [ ] Workers AI usage tracked

## Support

For issues or questions:
- Check logs: `npx wrangler tail`
- Review [Chanfana docs](https://chanfana.com/)
- Review [Cloudflare Workers AI docs](https://developers.cloudflare.com/workers-ai/)
- Contact DevOps team
