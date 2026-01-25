/**
 * Route Optimization Service
 * Uses Google Maps Routes API to optimize travel routes for installers
 *
 * This service solves the Traveling Salesman Problem (TSP) to find
 * the most efficient route visiting all scheduled jobs.
 */

import type {
  GeoCoordinates,
  RouteRequest,
  OptimizedRoute,
  RouteStop,
  RouteJob,
} from '../types';
import { calculateDistance, formatDuration } from './geocodingService';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// API endpoints
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * Main function to optimize a route for a technician's day
 */
export async function optimizeRoute(request: RouteRequest): Promise<OptimizedRoute> {
  const { technicianId, technicianName, startLocation, startAddress, jobs } = request;

  if (jobs.length === 0) {
    return createEmptyRoute(technicianId, technicianName, startLocation, startAddress);
  }

  // For a single job, no optimization needed
  if (jobs.length === 1) {
    return createSingleJobRoute(request);
  }

  // Try Google Routes API first
  if (GOOGLE_MAPS_API_KEY) {
    try {
      return await optimizeWithGoogleRoutes(request);
    } catch (error) {
      console.warn('Google Routes API failed, falling back to local optimization:', error);
    }
  }

  // Fallback to local nearest-neighbor algorithm
  return optimizeWithNearestNeighbor(request);
}

/**
 * Optimize route using Google Routes API with waypoint optimization
 */
async function optimizeWithGoogleRoutes(request: RouteRequest): Promise<OptimizedRoute> {
  const { startLocation, jobs, constraints } = request;

  // Build the request for Google Routes API
  const origin = {
    location: {
      latLng: {
        latitude: startLocation.lat,
        longitude: startLocation.lng,
      },
    },
  };

  // Use start as destination if returning home, otherwise use last job
  const returnToStart = constraints?.returnToStart ?? true;
  const destination = returnToStart ? origin : {
    location: {
      latLng: {
        latitude: jobs[jobs.length - 1].location.lat,
        longitude: jobs[jobs.length - 1].location.lng,
      },
    },
  };

  // All jobs as intermediates (waypoints)
  const intermediates = jobs.map(job => ({
    location: {
      latLng: {
        latitude: job.location.lat,
        longitude: job.location.lng,
      },
    },
  }));

  // If not returning to start, remove the last job from intermediates
  // (it becomes the destination)
  if (!returnToStart) {
    intermediates.pop();
  }

  const routeRequest = {
    origin,
    destination,
    intermediates: intermediates.length > 0 ? intermediates : undefined,
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: true, // This is the key flag for route optimization
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: constraints?.avoidTolls ?? false,
      avoidHighways: false,
      avoidFerries: false,
    },
  };

  const response = await fetch(ROUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.optimizedIntermediateWaypointIndex',
    },
    body: JSON.stringify(routeRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Google Routes API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = data.routes[0];

  // Get the optimized order of waypoints
  const optimizedOrder = route.optimizedIntermediateWaypointIndex || jobs.map((_, i) => i);

  // Build the optimized route with stop details
  return buildOptimizedRoute(
    request,
    optimizedOrder,
    route.legs,
    route.distanceMeters,
    parseInt(route.duration?.replace('s', '') || '0'),
    route.polyline?.encodedPolyline
  );
}

/**
 * Fallback: Nearest Neighbor algorithm for route optimization
 * Not optimal but works without external API
 */
function optimizeWithNearestNeighbor(request: RouteRequest): OptimizedRoute {
  const { technicianId, technicianName, startLocation, startAddress, jobs, constraints } = request;

  const unvisited = [...jobs];
  const orderedJobs: RouteJob[] = [];
  let currentLocation = startLocation;

  // Greedy nearest-neighbor selection
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateDistance(currentLocation, unvisited[i].location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    orderedJobs.push(nearest);
    currentLocation = nearest.location;
  }

  // Build stops with estimated times
  const stops: RouteStop[] = [];
  let totalDistance = 0;
  let totalDrivingTime = 0;
  let totalJobTime = 0;

  // Get working hours or default to 8 AM
  const workStartHour = constraints?.workingHoursStart
    ? parseInt(constraints.workingHoursStart.split(':')[0])
    : 8;
  const workStartMinute = constraints?.workingHoursStart
    ? parseInt(constraints.workingHoursStart.split(':')[1] || '0')
    : 0;

  let currentTime = new Date();
  currentTime.setHours(workStartHour, workStartMinute, 0, 0);
  let prevLocation = startLocation;

  for (let i = 0; i < orderedJobs.length; i++) {
    const job = orderedJobs[i];

    // Calculate driving time (rough estimate: 40 km/h average including traffic)
    const distance = calculateDistance(prevLocation, job.location);
    const drivingSeconds = Math.round((distance / 40000) * 3600); // 40 km/h

    totalDistance += distance;
    totalDrivingTime += drivingSeconds;

    // Arrival time
    currentTime = new Date(currentTime.getTime() + drivingSeconds * 1000);
    const arrivalTime = currentTime.toISOString();

    // Job duration
    const jobDurationSeconds = job.duration * 60;
    totalJobTime += jobDurationSeconds;

    // Departure time
    currentTime = new Date(currentTime.getTime() + jobDurationSeconds * 1000);
    const departureTime = currentTime.toISOString();

    stops.push({
      order: i + 1,
      projectId: job.projectId,
      projectName: job.projectName,
      clientName: job.clientName,
      address: job.address,
      location: job.location,
      arrivalTime,
      departureTime,
      jobDuration: job.duration,
      drivingTimeFromPrevious: drivingSeconds,
      distanceFromPrevious: Math.round(distance),
    });

    prevLocation = job.location;
  }

  // Calculate return to start if needed
  const returnToStart = constraints?.returnToStart ?? true;
  let returnArrivalTime: string | undefined;

  if (returnToStart && orderedJobs.length > 0) {
    const returnDistance = calculateDistance(
      orderedJobs[orderedJobs.length - 1].location,
      startLocation
    );
    const returnDrivingSeconds = Math.round((returnDistance / 40000) * 3600);
    totalDistance += returnDistance;
    totalDrivingTime += returnDrivingSeconds;
    currentTime = new Date(currentTime.getTime() + returnDrivingSeconds * 1000);
    returnArrivalTime = currentTime.toISOString();
  }

  // Calculate leave time: first job arrival - driving time - 15 min buffer
  let leaveTime: string | undefined;
  if (stops.length > 0) {
    const firstArrival = new Date(stops[0].arrivalTime);
    const drivingToFirst = stops[0].drivingTimeFromPrevious * 1000; // Convert to ms
    const bufferTime = 15 * 60 * 1000; // 15 minutes in ms
    leaveTime = new Date(firstArrival.getTime() - drivingToFirst - bufferTime).toISOString();
  }

  return {
    technicianId,
    technicianName,
    planDate: new Date().toISOString().split('T')[0],
    startLocation,
    startAddress,
    totalDistance: Math.round(totalDistance),
    totalDuration: totalDrivingTime + totalJobTime,
    totalDrivingTime,
    totalJobTime,
    stops,
    returnToStart,
    returnArrivalTime,
    leaveTime,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build optimized route from Google API response
 */
function buildOptimizedRoute(
  request: RouteRequest,
  optimizedOrder: number[],
  legs: any[],
  totalDistanceMeters: number,
  _totalDurationSeconds: number,
  polyline?: string
): OptimizedRoute {
  const { technicianId, technicianName, startLocation, startAddress, jobs, constraints } = request;

  // Get working hours or default to 8 AM
  const workStartHour = constraints?.workingHoursStart
    ? parseInt(constraints.workingHoursStart.split(':')[0])
    : 8;
  const workStartMinute = constraints?.workingHoursStart
    ? parseInt(constraints.workingHoursStart.split(':')[1] || '0')
    : 0;

  let currentTime = new Date();
  currentTime.setHours(workStartHour, workStartMinute, 0, 0);

  const stops: RouteStop[] = [];
  let totalDrivingTime = 0;
  let totalJobTime = 0;

  // Reorder jobs based on optimized order
  const orderedJobs = optimizedOrder.map(index => jobs[index]);

  // Process each leg of the route
  for (let i = 0; i < orderedJobs.length; i++) {
    const job = orderedJobs[i];
    const leg = legs[i];

    const legDuration = parseInt(leg?.duration?.replace('s', '') || '0');
    const legDistance = leg?.distanceMeters || 0;

    totalDrivingTime += legDuration;

    // Arrival time
    currentTime = new Date(currentTime.getTime() + legDuration * 1000);
    const arrivalTime = currentTime.toISOString();

    // Job duration
    const jobDurationSeconds = job.duration * 60;
    totalJobTime += jobDurationSeconds;

    // Departure time
    currentTime = new Date(currentTime.getTime() + jobDurationSeconds * 1000);
    const departureTime = currentTime.toISOString();

    stops.push({
      order: i + 1,
      projectId: job.projectId,
      projectName: job.projectName,
      clientName: job.clientName,
      address: job.address,
      location: job.location,
      arrivalTime,
      departureTime,
      jobDuration: job.duration,
      drivingTimeFromPrevious: legDuration,
      distanceFromPrevious: legDistance,
    });
  }

  // Handle return leg if applicable
  const returnToStart = constraints?.returnToStart ?? true;
  let returnArrivalTime: string | undefined;

  if (returnToStart && legs.length > orderedJobs.length) {
    const returnLeg = legs[legs.length - 1];
    const returnDuration = parseInt(returnLeg?.duration?.replace('s', '') || '0');
    totalDrivingTime += returnDuration;
    currentTime = new Date(currentTime.getTime() + returnDuration * 1000);
    returnArrivalTime = currentTime.toISOString();
  }

  // Calculate leave time: first job arrival - driving time - 15 min buffer
  let leaveTime: string | undefined;
  if (stops.length > 0) {
    const firstArrival = new Date(stops[0].arrivalTime);
    const drivingToFirst = stops[0].drivingTimeFromPrevious * 1000; // Convert to ms
    const bufferTime = 15 * 60 * 1000; // 15 minutes in ms
    leaveTime = new Date(firstArrival.getTime() - drivingToFirst - bufferTime).toISOString();
  }

  return {
    technicianId,
    technicianName,
    planDate: new Date().toISOString().split('T')[0],
    startLocation,
    startAddress,
    totalDistance: totalDistanceMeters,
    totalDuration: totalDrivingTime + totalJobTime,
    totalDrivingTime,
    totalJobTime,
    stops,
    returnToStart,
    returnArrivalTime,
    leaveTime,
    polyline,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create an empty route when there are no jobs
 */
function createEmptyRoute(
  technicianId: string,
  technicianName: string,
  startLocation: GeoCoordinates,
  startAddress: string
): OptimizedRoute {
  return {
    technicianId,
    technicianName,
    planDate: new Date().toISOString().split('T')[0],
    startLocation,
    startAddress,
    totalDistance: 0,
    totalDuration: 0,
    totalDrivingTime: 0,
    totalJobTime: 0,
    stops: [],
    returnToStart: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create route for a single job (no optimization needed)
 */
function createSingleJobRoute(request: RouteRequest): OptimizedRoute {
  const { technicianId, technicianName, startLocation, startAddress, jobs, constraints } = request;
  const job = jobs[0];

  // Calculate distance and estimated driving time
  const distance = calculateDistance(startLocation, job.location);
  const drivingSeconds = Math.round((distance / 40000) * 3600); // ~40 km/h average

  // Get working hours or default to 8 AM
  const workStartHour = constraints?.workingHoursStart
    ? parseInt(constraints.workingHoursStart.split(':')[0])
    : 8;
  const workStartMinute = constraints?.workingHoursStart
    ? parseInt(constraints.workingHoursStart.split(':')[1] || '0')
    : 0;

  let currentTime = new Date();
  currentTime.setHours(workStartHour, workStartMinute, 0, 0);

  // Arrival at job
  currentTime = new Date(currentTime.getTime() + drivingSeconds * 1000);
  const arrivalTime = currentTime.toISOString();

  // Departure from job
  const jobDurationSeconds = job.duration * 60;
  currentTime = new Date(currentTime.getTime() + jobDurationSeconds * 1000);
  const departureTime = currentTime.toISOString();

  const returnToStart = constraints?.returnToStart ?? true;
  let returnArrivalTime: string | undefined;
  let totalDistance = Math.round(distance);
  let totalDrivingTime = drivingSeconds;

  if (returnToStart) {
    totalDistance += Math.round(distance);
    totalDrivingTime += drivingSeconds;
    currentTime = new Date(currentTime.getTime() + drivingSeconds * 1000);
    returnArrivalTime = currentTime.toISOString();
  }

  // Calculate leave time: arrival - driving time - 15 min buffer
  const firstArrival = new Date(arrivalTime);
  const bufferTime = 15 * 60 * 1000; // 15 minutes in ms
  const leaveTime = new Date(firstArrival.getTime() - (drivingSeconds * 1000) - bufferTime).toISOString();

  return {
    technicianId,
    technicianName,
    planDate: new Date().toISOString().split('T')[0],
    startLocation,
    startAddress,
    totalDistance,
    totalDuration: totalDrivingTime + jobDurationSeconds,
    totalDrivingTime,
    totalJobTime: jobDurationSeconds,
    stops: [{
      order: 1,
      projectId: job.projectId,
      projectName: job.projectName,
      clientName: job.clientName,
      address: job.address,
      location: job.location,
      arrivalTime,
      departureTime,
      jobDuration: job.duration,
      drivingTimeFromPrevious: drivingSeconds,
      distanceFromPrevious: Math.round(distance),
    }],
    returnToStart,
    returnArrivalTime,
    leaveTime,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a Google Maps URL for the optimized route
 */
export function generateGoogleMapsUrl(route: OptimizedRoute): string {
  const { startLocation, stops, returnToStart } = route;

  // Google Maps URL format: origin -> waypoints -> destination
  const origin = `${startLocation.lat},${startLocation.lng}`;

  if (stops.length === 0) {
    return `https://www.google.com/maps?q=${origin}`;
  }

  const waypoints = stops.map(stop => `${stop.location.lat},${stop.location.lng}`);
  const destination = returnToStart ? origin : waypoints.pop()!;

  let url = `https://www.google.com/maps/dir/${origin}`;

  for (const wp of waypoints) {
    url += `/${wp}`;
  }

  url += `/${destination}`;

  return url;
}

/**
 * Generate Apple Maps URL for the optimized route
 */
export function generateAppleMapsUrl(route: OptimizedRoute): string {
  const { startLocation, stops, returnToStart } = route;

  if (stops.length === 0) {
    return `https://maps.apple.com/?q=${startLocation.lat},${startLocation.lng}`;
  }

  // Apple Maps supports multiple destinations with saddr, daddr, and dirflg
  const origin = `${startLocation.lat},${startLocation.lng}`;
  const lastStop = returnToStart ? origin : `${stops[stops.length - 1].location.lat},${stops[stops.length - 1].location.lng}`;

  return `https://maps.apple.com/?saddr=${origin}&daddr=${lastStop}&dirflg=d`;
}

/**
 * Format route summary for display
 */
export function formatRouteSummary(route: OptimizedRoute): string {
  const workHours = (route.totalJobTime / 3600).toFixed(1);
  const miles = (route.totalDistance / 1609.34).toFixed(1);

  return `${route.stops.length} jobs • ${miles} mi • ${formatDuration(route.totalDrivingTime)} driving • ${workHours}h work`;
}
