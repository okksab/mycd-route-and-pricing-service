# Environment Configuration Guide

## Overview

The MyCallDriver Route Intelligence Service supports two environments:
- **Development (Local)** - Local development and testing
- **Production** - Live production environment

## Environment Variable: MYCD_LLM_KEY

This optional environment variable allows you to:
1. Use a custom AI/LLM provider instead of Cloudflare's default AI
2. Track and monitor AI API usage separately per environment
3. Implement custom rate limiting or billing per environment

### When to Use MYCD_LLM_KEY

- **Development:** Optional - useful for testing custom AI integrations
- **Production:** Optional - set only if using custom AI provider

## Environment Setup

### 1. Development Environment

**File:** `.dev.vars` (create from `.dev.vars.example`)

```bash
# Copy example file
cp .dev.vars.example .dev.vars

# Edit the file
ENVIRONMENT=development
MYCD_LLM_KEY=sk-dev-your-development-key-here  # Optional
```

**Start Development Server:**
```bash
npm run dev
```

**Endpoint:** `http://localhost:8787/routes/estimate`

### 2. Production Environment
   - `ENVIRONMENT` = `test`
4. Settings → Environment Variables → Secrets
5. Add secret (if needed):
   - `MYCD_LLM_KEY` = your test key

**Or via CLI:**
```bash
# Set secret via command line
npm run secrets:set:prod
# When prompted, enter your production LLM key

# Deploy to production
npm run deploy:prod
```

**Endpoint:** `https://mycd-route-and-pricing-service-prod.YOUR-SUBDOMAIN.workers.dev/routes/estimate`

## Configuration Files

### wrangler.jsonc (Development)
```jsonc
{
  "name": "mycd-route-and-pricing-service",
  "vars": {
    "ENVIRONMENT": "development"
  }
}
```

### wrangler.production.jsonc (Production)
```jsonc
{
  "name": "mycd-route-and-pricing-service-prod",
  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

## NPM Scripts

### Development
```bash
npm run dev              # Start local dev server
```

### Deployment
```bash
npm run deploy           # Deploy to development
npm run deploy:prod      # Deploy to production
```

### Secrets Management
```bash
npm run secrets:set      # Set MYCD_LLM_KEY for development
npm run secrets:set:prod # Set MYCD_LLM_KEY for production
```

### Database Migrations
```bash
npm run predeploy        # Run migrations for dev
npm run predeploy:prod   # Run migrations for prod
```

## GitHub Actions CI/CD

### Secrets Required

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers write permissions | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Yes |
| `MYCD_LLM_KEY_DEV` | Development LLM API key | Optional |
| `MYCD_LLM_KEY_TEST` | Test LLM API key | Optional |
| `MYCD_LLM_KEY_PROD` | Production LLM API key | Optional |

### Deployment Triggers

**Development:**
- Automatic deployment on push to `develop` or `dev` branch
- Manual trigger via GitHub Actions UI

**Test:**
- Automatic deployment on push to `test` or `staging` branch
- Automatic deployment on PR to `main` branch
- Manual trigger via GitHub Actions UI

**Production:**
- Automatic deployment on push to `main` branch
- Automatic deployment on version tags (`v*`)
- Manual trigger via GitHub Actions UI (requires confirmation)

### Manual Production Deployment

1. Go to GitHub Actions → Deploy to Production
2. Click "Run workflow"
3. Type `deploy-to-production` in the confirmation field
4. Click "Run workflow"

## Environment Verification

### Check Current Environment

**Via Logs (Development):**
```bash
npm run dev
# Check console output for environment info
```

**Via API Request:**
The service logs environment info in non-production environments.

**Via Cloudflare Dashboard:**
1. Workers & Pages → Your Worker
2. Settings → Variables
3. Check `ENVIRONMENT` value

## Testing Endpoints

### Development
```bash
curl -X POST http://localhost:8787/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "400001"}'
```

### Production
```bash
curl -X POST https://mycd-route-and-pricing-service-prod.YOUR-SUBDOMAIN.workers.dev/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "400001"}'
```

## Environment-Specific Features

### Development
- ✅ Detailed logging enabled
- ✅ No caching
- ✅ Debug information included
- ✅ Console logs for AI calls

### Production
- ✅ Minimal logging
- ✅ Caching enabled
- ✅ Performance optimized
- ❌ No debug information
- ❌ No sensitive console logs

## Troubleshooting

### Issue: Environment variable not set
**Solution:**
```bash
# Check current variables
wrangler secret list

# Set the variable
npm run secrets:set:prod
```

### Issue: Wrong environment deployed
**Solution:**
```bash
# Check which config file is being used
wrangler deploy --dry-run --config wrangler.production.jsonc
```

### Issue: CI/CD deployment fails
**Solution:**
1. Check GitHub Secrets are set correctly
2. Verify Cloudflare API token has correct permissions
3. Check GitHub Actions logs for specific error
4. Ensure database migrations are successful

## Security Best Practices

1. ✅ **Never commit** `.dev.vars` or any file containing actual secrets
2. ✅ **Use GitHub Secrets** for CI/CD pipeline secrets
3. ✅ **Rotate keys** regularly (every 90 days)
4. ✅ **Use different keys** for each environment
5. ✅ **Monitor usage** of API keys
6. ✅ **Set up alerts** for unusual API usage

## Monitoring

### View Logs
```bash
# Development
npm run dev
# Watch console output

# Production
wrangler tail --config wrangler.production.jsonc
```

### Cloudflare Analytics
1. Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. View metrics:
   - Request count
   - Error rate
   - CPU time
   - Duration

## Rollback Procedure

### Via CLI
```bash
# List deployments
wrangler deployments list --config wrangler.production.jsonc

# Rollback to specific deployment
wrangler rollback [DEPLOYMENT_ID] --config wrangler.production.jsonc
```

### Via GitHub Actions
1. Revert the problematic commit
2. Push to main branch
3. Automatic deployment will restore previous version

## Environment Checklist

### Before Deploying to Production
- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] API documentation updated
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Secrets configured in Cloudflare
- [ ] Rollback plan documented
- [ ] Monitoring and alerts configured
- [ ] Team notified of deployment
