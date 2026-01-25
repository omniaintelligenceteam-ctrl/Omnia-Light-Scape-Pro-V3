/**
 * Geocoding Service
 * Converts addresses to latitude/longitude coordinates using Google Geocoding API
 */

import type { GeoCoordinates } from '../types';

// Get API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Cache geocoding results in memory to reduce API calls
const geocodeCache = new Map<string, GeoCoordinates>();

/**
 * Normalize address string for cache key
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Geocode a single address to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeoCoordinates | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  const normalizedAddress = normalizeAddress(address);

  // Check cache first
  if (geocodeCache.has(normalizedAddress)) {
    return geocodeCache.get(normalizedAddress)!;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured. Geocoding disabled.');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const coords: GeoCoordinates = {
        lat: location.lat,
        lng: location.lng,
      };

      // Cache the result
      geocodeCache.set(normalizedAddress, coords);

      return coords;
    }

    if (data.status === 'ZERO_RESULTS') {
      console.warn(`No geocoding results for address: ${address}`);
      return null;
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Geocoding API quota exceeded');
      throw new Error('Geocoding quota exceeded. Please try again later.');
    }

    console.error('Geocoding API error:', data.status, data.error_message);
    return null;
  } catch (error) {
    console.error('Geocoding request failed:', error);
    throw error;
  }
}

/**
 * Batch geocode multiple addresses
 * Respects rate limits by spacing requests
 */
export async function batchGeocodeAddresses(
  addresses: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeoCoordinates | null>> {
  const results = new Map<string, GeoCoordinates | null>();
  const uniqueAddresses = [...new Set(addresses.filter(a => a && a.trim()))];

  for (let i = 0; i < uniqueAddresses.length; i++) {
    const address = uniqueAddresses[i];

    try {
      const coords = await geocodeAddress(address);
      results.set(address, coords);
    } catch (error) {
      results.set(address, null);
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, uniqueAddresses.length);
    }

    // Rate limit: ~10 requests per second max for standard API
    // Add small delay between requests to be safe
    if (i < uniqueAddresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(coords: GeoCoordinates): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(from: GeoCoordinates, to: GeoCoordinates): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Clear the geocode cache (useful for testing or forced refresh)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Get cache size (for debugging)
 */
export function getGeocacheCacheSize(): number {
  return geocodeCache.size;
}
