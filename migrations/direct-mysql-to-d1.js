/**
 * Direct MySQL to Cloudflare D1 Migration Script
 * 
 * This script connects to your local MySQL database, reads geo_pincode_master table,
 * and directly inserts data into Cloudflare D1 using Wrangler CLI
 * 
 * Prerequisites:
 * - npm install mysql2
 * 
 * Usage:
 * node direct-mysql-to-d1.js
 */

const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'YOUR_MYSQL_PASSWORD',  // ⚠️ UPDATE THIS
  database: 'mycd'  // Your database name
};

const D1_DATABASE = 'mycd-route-and-pricing-service-db';
const BATCH_SIZE = 500;
const USE_LOCAL = true; // Set to false for remote D1 database

async function migrateMySQLtoD1() {
  console.log('🚀 Starting MySQL to D1 migration...\n');

  let connection;
  try {
    // Connect to MySQL
    console.log('📡 Connecting to MySQL...');
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL\n');

    // Query data from MySQL
    console.log('📊 Fetching data from geo_pincode_master...');
    const [rows] = await connection.execute(`
      SELECT 
        pincode,
        COALESCE(city, '') as city,
        COALESCE(district, '') as district,
        COALESCE(state_name, '') as state_name,
        COALESCE(state_code, '') as state_code,
        COALESCE(country_code, 'IN') as country_code,
        latitude,
        longitude,
        COALESCE(location_type, '') as location_type,
        COALESCE(provider, 'google') as provider,
        COALESCE(place_id, '') as place_id,
        COALESCE(formatted_address, '') as formatted_address,
        COALESCE(raw_file_name, '') as raw_file_name
      FROM geo_pincode_master
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
      ORDER BY pincode
    `);

    console.log(`✅ Fetched ${rows.length} records from MySQL\n`);

    if (rows.length === 0) {
      console.log('⚠️  No records found to migrate.');
      return;
    }

    // Process in batches
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    let importedCount = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * BATCH_SIZE;
      const batchEnd = Math.min((i + 1) * BATCH_SIZE, rows.length);
      const batch = rows.slice(batchStart, batchEnd);

      console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${batch.length} records)...`);

      // Generate SQL INSERT statements
      const sqlStatements = batch.map(row => {
        const values = [
          escapeSQL(row.pincode),
          escapeSQL(row.city),
          escapeSQL(row.district),
          escapeSQL(row.state_name),
          escapeSQL(row.state_code),
          escapeSQL(row.country_code),
          row.latitude || 'NULL',
          row.longitude || 'NULL',
          escapeSQL(row.location_type),
          escapeSQL(row.provider),
          escapeSQL(row.place_id),
          escapeSQL(row.formatted_address),
          escapeSQL(row.raw_file_name)
        ].join(', ');

        return `INSERT INTO pincodes (pincode, city, district, state_name, state_code, country_code, latitude, longitude, location_type, provider, place_id, formatted_address, raw_file_name) VALUES (${values});`;
      }).join('\n');

      // Create temporary SQL file
      const tempFile = `temp_batch_${i}.sql`;
      const sqlContent = `BEGIN TRANSACTION;\n${sqlStatements}\nCOMMIT;`;
      fs.writeFileSync(tempFile, sqlContent);

      // Execute via Wrangler
      try {
        const localFlag = USE_LOCAL ? '--local' : '--remote';
        const command = `wrangler d1 execute ${D1_DATABASE} ${localFlag} --file=${tempFile}`;
        execSync(command, { stdio: 'inherit' });
        importedCount += batch.length;
        console.log(`✅ Batch ${i + 1} imported successfully (${importedCount}/${rows.length} total)\n`);
      } catch (error) {
        console.error(`❌ Error importing batch ${i + 1}:`, error.message);
        throw error;
      } finally {
        // Clean up temp file
        fs.unlinkSync(tempFile);
      }

      // Small delay to avoid rate limits
      await sleep(100);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Total records migrated: ${importedCount}`);

    // Verify the import
    console.log('\n🔍 Verifying import...');
    const verifyCommand = `wrangler d1 execute ${D1_DATABASE} ${USE_LOCAL ? '--local' : '--remote'} --command="SELECT COUNT(*) as total FROM pincodes"`;
    execSync(verifyCommand, { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 MySQL connection closed');
    }
  }
}

function escapeSQL(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return value;
  }
  // Escape single quotes
  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the migration
migrateMySQLtoD1().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
