# Migration Guide: MySQL geo_pincode_master → Cloudflare D1

## Table Structure Match

| MySQL Column | Type | D1 Column | Type | Notes |
|--------------|------|-----------|------|-------|
| id | bigint(20) | id | INTEGER | Auto-increment |
| pincode | varchar(10) | pincode | VARCHAR(10) | UNIQUE key |
| city | varchar(100) | city | VARCHAR(100) | Can be NULL |
| district | varchar(100) | district | VARCHAR(100) | Can be NULL |
| state_name | varchar(100) | state_name | VARCHAR(100) | |
| state_code | varchar(10) | state_code | VARCHAR(10) | |
| country_code | varchar(5) | country_code | VARCHAR(5) | |
| latitude | decimal(10,8) | latitude | REAL | Converted to SQLite REAL |
| longitude | decimal(11,8) | longitude | REAL | Converted to SQLite REAL |
| location_type | varchar(20) | location_type | VARCHAR(20) | |
| provider | varchar(20) | provider | VARCHAR(20) | Default: 'google' |
| place_id | varchar(100) | place_id | VARCHAR(100) | |
| formatted_address | text | formatted_address | TEXT | |
| raw_file_name | varchar(255) | raw_file_name | VARCHAR(255) | |
| created_at | timestamp | created_at | DATETIME | Auto-generated |
| updated_at | timestamp | updated_at | DATETIME | Auto-generated |

## Step-by-Step Migration Process

### Step 1: Export from MySQL

**Option A: Using MySQL Workbench (Easiest)**
1. Open MySQL Workbench
2. Connect to your database
3. Run query from `export-from-mysql.sql`
4. Right-click on Results Grid → Export
5. Choose CSV format
6. Save as `pincodes_export.csv`

**Option B: Using Command Line**
```bash
mysql -u root -p mycd < migrations/export-from-mysql.sql
```

### Step 2: Convert CSV to D1-Compatible SQL

```bash
cd migrations
node convert-csv-to-sql.js
```

This will generate `pincodes_import.sql` with:
- Batched INSERT statements (500 records per batch)
- SQLite-compatible syntax
- Proper escaping for special characters
- Transaction wrapping for performance

### Step 3: Create D1 Database

```bash
# Create the database
wrangler d1 create mycd-pincodes-db

# Output will show database_id - copy it!
```

### Step 4: Update wrangler.jsonc

Replace the existing database_id in `wrangler.jsonc`:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mycd-pincodes-db",
      "database_id": "YOUR_NEW_DATABASE_ID_HERE"
    }
  ]
}
```

### Step 5: Run Schema Migration

```bash
# Create table structure
wrangler d1 execute mycd-pincodes-db --file=migrations/0002_add_pincodes_table.sql --remote
```

### Step 6: Import Data

```bash
# Import all data (this may take 5-10 minutes for 30k+ records)
wrangler d1 execute mycd-pincodes-db --file=migrations/pincodes_import.sql --remote
```

### Step 7: Verify Import

```bash
# Check record count
wrangler d1 execute mycd-pincodes-db --remote --command="SELECT COUNT(*) as total FROM pincodes"

# Check sample data
wrangler d1 execute mycd-pincodes-db --remote --command="SELECT pincode, city, district, latitude, longitude FROM pincodes LIMIT 10"

# Verify coordinates exist
wrangler d1 execute mycd-pincodes-db --remote --command="SELECT COUNT(*) as with_coords FROM pincodes WHERE latitude IS NOT NULL AND longitude IS NOT NULL"

# Test search functionality
wrangler d1 execute mycd-pincodes-db --remote --command="SELECT * FROM pincodes WHERE pincode LIKE '6000%' LIMIT 5"
```

## Troubleshooting

### Error: "Query too large"
- The conversion script already batches in groups of 500
- If still failing, edit `convert-csv-to-sql.js` and reduce `BATCH_SIZE` to 250

### Error: "Duplicate pincode"
- Check for duplicate pincodes in source data:
```sql
SELECT pincode, COUNT(*) FROM geo_pincode_master GROUP BY pincode HAVING COUNT(*) > 1;
```

### Missing coordinates
- Query will only export records with non-NULL latitude/longitude
- Check source data:
```sql
SELECT COUNT(*) FROM geo_pincode_master WHERE latitude IS NULL OR longitude IS NULL;
```

## Performance Expectations

- **Export from MySQL:** ~30 seconds
- **CSV to SQL conversion:** ~1-2 minutes
- **D1 import:** ~5-10 minutes for 30k records
- **Total time:** ~15 minutes

## Next Steps After Migration

1. Test the new endpoints:
```bash
# Test pincode-based route estimation
curl -X POST http://localhost:8787/routes/estimate-by-pincode \
  -H "Content-Type: application/json" \
  -d '{"fromPincode": "613001", "toPincode": "600078"}'

# Test pincode search
curl -X POST http://localhost:8787/pincodes/search \
  -H "Content-Type: application/json" \
  -d '{"pincode": "6000"}'
```

2. Deploy to production:
```bash
npm run deploy:prod
```

3. Update production D1 database with same data
