/**
 * Geographic utility functions shared across the application.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @returns Distance in kilometers
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a =
    sinDLat * sinDLat +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
