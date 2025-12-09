# Quick Start Guide - Route & Pricing Service

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd mycd-route-and-pricing-service
npm install
```

This will install:
- Hono (web framework)
- Chanfana (OpenAPI)
- Zod (validation)
- Cloudflare Wrangler (deployment)
- Vitest (testing)

### Step 2: Start Development Server
```bash
npm run dev
```

You should see:
```
⛅️ wrangler 4.51.0
-------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### Step 3: Test the Endpoint

Open a new terminal and run:

```bash
curl -X POST http://localhost:8787/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "400001"}'
```

**Expected Response:**
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

### Step 4: View API Documentation

Open your browser to:
```
http://localhost:8787/
```

You'll see the interactive OpenAPI documentation with all endpoints, including the new `/route/estimate` endpoint.

---

## 🧪 Running Tests

```bash
npm run test
```

Expected output:
```
✓ tests/pricing.test.ts (7 tests)
  ✓ should calculate route pricing for valid PIN codes
  ✓ should handle local trip (same PIN prefix)
  ✓ should reject invalid PIN code (not 6 digits)
  ✓ should reject non-numeric PIN code
  ✓ should reject missing fromPin
  ✓ should reject missing toPin
  ✓ should calculate long distance outstation trip

Test Files  1 passed (1)
     Tests  7 passed (7)
```

---

## 📤 Deploy to Production

### Login to Cloudflare
```bash
npx wrangler login
```

### Deploy
```bash
npm run deploy
```

Output:
```
✨ Successfully deployed!
🌎 https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev
```

### Test Production
```bash
curl -X POST https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "110001", "toPin": "600001"}'
```

---

## 📋 Example Use Cases

### Local Trip (Bangalore)
```bash
curl -X POST http://localhost:8787/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "560050"}'
```

Response:
```json
{
  "success": true,
  "result": {
    "fromPin": "560001",
    "toPin": "560050",
    "distance": 25.3,
    "hours": 0.84,
    "isLocal": true,
    "isOutStation": false,
    "approxPrice": 380
  }
}
```

### Short Outstation (Bangalore to Mysore)
```bash
curl -X POST http://localhost:8787/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "560001", "toPin": "570001"}'
```

### Long Distance (Delhi to Chennai)
```bash
curl -X POST http://localhost:8787/route/estimate \
  -H "Content-Type: application/json" \
  -d '{"fromPin": "110001", "toPin": "600001"}'
```

---

## 🔍 View Logs

### Real-time Logs
```bash
npx wrangler tail
```

### View Specific Request
Watch logs while making requests to see:
- AI model calls
- Response times
- Error messages
- Fallback triggers

---

## 🛠️ Troubleshooting

### Issue: `npm install` fails
**Solution:** Ensure Node.js 18+ is installed
```bash
node --version  # Should be v18.0.0 or higher
npm install -g npm@latest
```

### Issue: Port 8787 already in use
**Solution:** Kill the process or use a different port
```bash
# Windows
netstat -ano | findstr :8787
taskkill /PID <PID> /F

# Or change port in wrangler.jsonc
```

### Issue: AI binding not working locally
**Solution:** AI binding works in production by default. For local dev, it uses fallback pricing (which still works perfectly for testing).

### Issue: TypeScript errors in VSCode
**Solution:** Install dependencies first
```bash
npm install
```

Then reload VSCode window:
- Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- Type "Reload Window"
- Press Enter

---

## 📖 Next Steps

1. **Read Full Documentation:** See `PRICING_ENDPOINT.md` for complete API reference
2. **Deploy to Production:** See `DEPLOYMENT.md` for production deployment guide
3. **Integrate with Apps:** Update other services to use this pricing API
4. **Monitor Performance:** Use Cloudflare dashboard analytics

---

## 💡 Pro Tips

### Use Environment-Specific Configs

**Development:**
```typescript
const API_URL = 'http://localhost:8787';
```

**Production:**
```typescript
const API_URL = 'https://mycd-route-and-pricing-service.YOUR-SUBDOMAIN.workers.dev';
```

### Cache Results
For frequently requested routes, cache the response:
```typescript
const cacheKey = `route:${fromPin}:${toPin}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

### Add Custom Domain
Instead of `.workers.dev`, use:
- `pricing.mycalldriver.com`
- `api.mycalldriver.com/pricing`

See DEPLOYMENT.md for instructions.

---

## 🎯 Success Criteria

You've successfully set up the service when you can:
- ✅ Visit `http://localhost:8787/` and see API docs
- ✅ POST to `/route/estimate` and get valid response
- ✅ Run `npm test` with all tests passing
- ✅ Deploy with `npm run deploy`
- ✅ Access production URL and get responses

---

## 📞 Support

**Documentation:**
- API Reference: `PRICING_ENDPOINT.md`
- Deployment: `DEPLOYMENT.md`
- Implementation: `IMPLEMENTATION_SUMMARY.md`

**Logs:**
```bash
npx wrangler tail
```

**Analytics:**
Cloudflare Dashboard → Workers & Pages → mycd-route-and-pricing-service

---

**Ready to go! 🚀**
