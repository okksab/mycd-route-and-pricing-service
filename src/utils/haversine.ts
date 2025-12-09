/**
 * Haversine Formula Utility
 * Calculates great-circle distance between two coordinates on Earth
 * 
 * Use cases:
 * - Quick distance calculation without external APIs
 * - Local vs outstation classification
 * - Price estimation
 * - Offline routing approximation
 */

/**
 * Convert degrees to radians
 */
function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of point 1 (in degrees)
 * @param lon1 - Longitude of point 1 (in degrees)
 * @param lat2 - Latitude of point 2 (in degrees)
 * @param lon2 - Longitude of point 2 (in degrees)
 * @returns Distance in kilometers (rounded to 2 decimal places)
 * 
 * @example
 * ```typescript
 * const distance = haversineKm(10.78523, 79.13909, 13.08369, 80.27070);
 * console.log(distance); // ~298.42 km
 * ```
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return Math.round(distance * 100) / 100; // round to 2 decimal places
}

/**
 * Classify trip type based on distance
 * 
 * @param distanceKm - Distance in kilometers
 * @returns Object with trip classification
 */
export function classifyTrip(distanceKm: number): {
  isLocal: boolean;
  isOutStation: boolean;
  category: 'local' | 'short-outstation' | 'medium-outstation' | 'long-outstation';
} {
  if (distanceKm < 50) {
    return {
      isLocal: true,
      isOutStation: false,
      category: 'local'
    };
  } else if (distanceKm < 150) {
    return {
      isLocal: false,
      isOutStation: true,
      category: 'short-outstation'
    };
  } else if (distanceKm < 400) {
    return {
      isLocal: false,
      isOutStation: true,
      category: 'medium-outstation'
    };
  } else {
    return {
      isLocal: false,
      isOutStation: true,
      category: 'long-outstation'
    };
  }
}

/**
 * Calculate approximate price based on distance
 * 
 * Pricing logic:
 * - Local trips (< 50km): ₹10-15/km base rate
 * - Short outstation (50-150km): ₹12-18/km
 * - Medium outstation (150-400km): ₹10-15/km
 * - Long outstation (> 400km): ₹8-12/km
 * 
 * @param distanceKm - Distance in kilometers
 * @param hoursEstimate - Estimated travel time in hours
 * @returns Approximate price in INR
 */
export function calculatePrice(distanceKm: number, hoursEstimate: number): number {
  let pricePerKm: number;
  let baseFare: number;

  if (distanceKm < 50) {
    // Local trip
    pricePerKm = 12;
    baseFare = 50;
  } else if (distanceKm < 150) {
    // Short outstation
    pricePerKm = 15;
    baseFare = 80;
  } else if (distanceKm < 400) {
    // Medium outstation
    pricePerKm = 12;
    baseFare = 100;
  } else {
    // Long outstation
    pricePerKm = 10;
    baseFare = 120;
  }

  // Add time-based charges (₹2/minute for waiting/traffic)
  const timeCharge = Math.round(hoursEstimate * 60 * 2);

  const totalPrice = baseFare + (distanceKm * pricePerKm) + timeCharge;

  return Math.round(totalPrice * 100) / 100; // round to 2 decimal places
}

/**
 * Estimate travel time based on distance and trip type
 * 
 * Average speeds:
 * - Local: ~30 km/h (city traffic)
 * - Short outstation: ~45 km/h
 * - Medium outstation: ~50 km/h
 * - Long outstation: ~55 km/h
 * 
 * @param distanceKm - Distance in kilometers
 * @returns Estimated time in hours (rounded to 2 decimal places)
 */
export function estimateTravelTime(distanceKm: number): number {
  let avgSpeed: number;

  if (distanceKm < 50) {
    avgSpeed = 30; // City traffic
  } else if (distanceKm < 150) {
    avgSpeed = 45;
  } else if (distanceKm < 400) {
    avgSpeed = 50;
  } else {
    avgSpeed = 55; // Highway
  }

  const hours = distanceKm / avgSpeed;
  return Math.round(hours * 100) / 100; // round to 2 decimal places
}
