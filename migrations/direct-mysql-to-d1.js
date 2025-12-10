/**
 * Direct MySQL to Cloudflare D1 Migration Script (Smart Sync)
 * 
 * Features:
 * - Checks for existing pincodes in D1 before inserting
 * - Logs all operations to CSV files
 * - Skips duplicates automatically
 * - Detailed progress tracking
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
const path = require('path');

// Configuration
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'admin',  // ⚠️ UPDATE THIS
  database: 'mycddb'  // Your database name
};

const D1_DATABASE = 'mycd-route-and-pricing-service-db';
const BATCH_SIZE = 500;
const USE_LOCAL = true; // Set to false for remote D1 database

// Log files
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const LOG_DIR = path.join(__dirname, 'logs');
const INSERTED_LOG = path.join(LOG_DIR, `inserted_${TIMESTAMP}.csv`);
const SKIPPED_LOG = path.join(LOG_DIR, `skipped_${TIMESTAMP}.csv`);
const ERROR_LOG = path.join(LOG_DIR, `errors_${TIMESTAMP}.csv`);

// Create logs directory
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

// Initialize log files with headers
fs.writeFileSync(INSERTED_LOG, 'pincode,city,district,state_name,latitude,longitude,timestamp\n');
fs.writeFileSync(SKIPPED_LOG, 'pincode,reason,timestamp\n');
fs.writeFileSync(ERROR_LOG, 'pincode,error,timestamp\n');

async function migrateMySQLtoD1() {
  console.log('🚀 Starting MySQL to D1 Smart Sync Migration...\n');
  console.log(`📁 Logs will be saved in: ${LOG_DIR}\n`);

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

    // Get existing pincodes from D1
    console.log('🔍 Checking existing pincodes in D1...');
    const existingPincodes = await getExistingPincodes();
    console.log(`✅ Found ${existingPincodes.size} existing pincodes in D1\n`);

    // Filter out duplicates
    const newRecords = rows.filter(row => !existingPincodes.has(row.pincode));
    const skippedCount = rows.length - newRecords.length;

    // Log skipped records
    rows.forEach(row => {
      if (existingPincodes.has(row.pincode)) {
        const logEntry = `${escapeCSV(row.pincode)},Already exists in D1,${new Date().toISOString()}\n`;
        fs.appendFileSync(SKIPPED_LOG, logEntry);
      }
    });

    console.log(`📊 Summary:`);
    console.log(`   Total records from MySQL: ${rows.length}`);
    console.log(`   Already in D1 (skipped): ${skippedCount}`);
    console.log(`   New records to insert: ${newRecords.length}\n`);

    if (newRecords.length === 0) {
      console.log('✅ All pincodes already exist in D1. Nothing to migrate.');
      return;
    }

    // Process in batches
    const totalBatches = Math.ceil(newRecords.length / BATCH_SIZE);
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * BATCH_SIZE;
      const batchEnd = Math.min((i + 1) * BATCH_SIZE, newRecords.length);
      const batch = newRecords.slice(batchStart, batchEnd);

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
        execSync(command, { stdio: 'pipe' }); // Use pipe to suppress output
        
        // Log successful inserts
        batch.forEach(row => {
          const logEntry = `${escapeCSV(row.pincode)},${escapeCSV(row.city)},${escapeCSV(row.district)},${escapeCSV(row.state_name)},${row.latitude},${row.longitude},${new Date().toISOString()}\n`;
          fs.appendFileSync(INSERTED_LOG, logEntry);
        });
        
        importedCount += batch.length;
        console.log(`✅ Batch ${i + 1} imported successfully (${importedCount}/${newRecords.length} total)\n`);
      } catch (error) {
        console.error(`❌ Error importing batch ${i + 1}: ${error.message}`);
        
        // Log errors for each record in failed batch
        batch.forEach(row => {
          const logEntry = `${escapeCSV(row.pincode)},${escapeCSV(error.message)},${new Date().toISOString()}\n`;
          fs.appendFileSync(ERROR_LOG, logEntry);
        });
        
        errorCount += batch.length;
        console.log(`⚠️  Continuing with next batch...\n`);
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }

      // Small delay to avoid rate limits
      await sleep(100);
    }

    console.log('\n🎉 Migration completed!');
    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Successfully inserted: ${importedCount}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n📁 Log files:`);
    console.log(`   Inserted: ${INSERTED_LOG}`);
    console.log(`   Skipped: ${SKIPPED_LOG}`);
    console.log(`   Errors: ${ERROR_LOG}`);

    // Verify the import
    console.log('\n🔍 Verifying final count in D1...');
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

async function getExistingPincodes() {
  const tempFile = 'temp_check_existing.json';
  const localFlag = USE_LOCAL ? '--local' : '--remote';
  
  try {
    // Query all existing pincodes from D1
    const command = `wrangler d1 execute ${D1_DATABASE} ${localFlag} --command="SELECT pincode FROM pincodes" --json > ${tempFile}`;
    execSync(command, { stdio: 'pipe' });
    
    // Read and parse the output
    const output = fs.readFileSync(tempFile, 'utf8');
    const result = JSON.parse(output);
    
    // Extract pincodes into a Set for fast lookup
    const pincodes = new Set();
    if (result && result[0] && result[0].results) {
      result[0].results.forEach(row => {
        pincodes.add(row.pincode);
      });
    }
    
    return pincodes;
  } catch (error) {
    console.warn('⚠️  Could not fetch existing pincodes, assuming empty database');
    return new Set();
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
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

function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the migration
migrateMySQLtoD1().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
