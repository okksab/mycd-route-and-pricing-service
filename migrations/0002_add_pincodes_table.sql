-- Create pincodes table for Indian PIN code lookup
-- Migration: 0002_add_pincodes_table.sql
-- Source: geo_pincode_master table from MySQL

DROP TABLE IF EXISTS pincodes;

CREATE TABLE pincodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pincode VARCHAR(10) NOT NULL UNIQUE,
  city VARCHAR(100),
  district VARCHAR(100),
  state_name VARCHAR(100),
  state_code VARCHAR(10),
  country_code VARCHAR(5),
  latitude REAL,  -- Converted from DECIMAL(10,8)
  longitude REAL,  -- Converted from DECIMAL(11,8)
  location_type VARCHAR(20),
  provider VARCHAR(20),
  place_id VARCHAR(100),
  formatted_address TEXT,
  raw_file_name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX idx_pincode ON pincodes(pincode);
CREATE INDEX idx_city ON pincodes(city);
CREATE INDEX idx_district ON pincodes(district);
CREATE INDEX idx_state_code ON pincodes(state_code);
CREATE INDEX idx_coordinates ON pincodes(latitude, longitude);

-- Data will be imported from geo_pincode_master export
