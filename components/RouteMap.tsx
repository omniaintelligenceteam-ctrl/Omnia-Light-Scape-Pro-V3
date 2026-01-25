import React, { useEffect, useRef, useState } from 'react';
import type { OptimizedRoute, GeoCoordinates } from '../types';

interface RouteMapProps {
  route: OptimizedRoute | null;
  className?: string;
  onStopClick?: (projectId: string) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Google Maps types (simplified for this usage)
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any;
    initRouteMap: () => void;
  }
}

type GoogleMap = any;
type GoogleMarker = any;
type GooglePolyline = any;

const RouteMap: React.FC<RouteMapProps> = ({ route, className = '', onStopClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const polylineRef = useRef<GooglePolyline | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      return;
    }

    // Check if already loaded
    if (window.google && window.window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initRouteMap`;
    script.async = true;
    script.defer = true;

    window.initRouteMap = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup callback
      delete (window as any).initRouteMap;
    };
  }, []);

  // Initialize map and render route
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !route) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.window.google.maps.Map(mapRef.current, {
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          // Dark theme styles matching app
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b8b' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });
    }

    const map = mapInstanceRef.current;

    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // No stops to show
    if (route.stops.length === 0) {
      // Just show start location
      map.setCenter({ lat: route.startLocation.lat, lng: route.startLocation.lng });
      map.setZoom(14);

      // Add home marker
      const homeMarker = new window.window.google.maps.Marker({
        position: route.startLocation,
        map,
        icon: {
          path: window.window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Start Location',
      });
      markersRef.current.push(homeMarker);
      return;
    }

    // Build bounds to fit all points
    const bounds = new window.window.google.maps.LatLngBounds();
    bounds.extend(route.startLocation);

    // Add start/home marker
    const homeMarker = new window.window.google.maps.Marker({
      position: route.startLocation,
      map,
      icon: {
        path: window.window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#22c55e',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: 'Start: ' + route.startAddress,
      zIndex: 1000,
    });
    markersRef.current.push(homeMarker);

    // Add numbered markers for each stop
    route.stops.forEach((stop, index) => {
      bounds.extend(stop.location);

      const marker = new window.google.maps.Marker({
        position: stop.location,
        map,
        label: {
          text: String(index + 1),
          color: '#000000',
          fontWeight: 'bold',
          fontSize: '14px',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: '#F6B45A',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: `${stop.order}. ${stop.clientName}\n${stop.address}`,
        zIndex: 100 + index,
      });

      // Add click handler
      if (onStopClick) {
        marker.addListener('click', () => {
          onStopClick(stop.projectId);
        });
      }

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #000; padding: 4px;">
            <strong>${stop.order}. ${stop.projectName}</strong><br/>
            <span style="color: #666;">${stop.clientName}</span><br/>
            <small>${stop.address}</small><br/>
            <small>Arrive: ${formatTime(stop.arrivalTime)}</small>
          </div>
        `,
      });

      marker.addListener('mouseover', () => {
        infoWindow.open(map, marker);
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });

    // Draw route polyline if available
    if (route.polyline) {
      const path = window.google.maps.geometry?.encoding?.decodePath(route.polyline);
      if (path) {
        polylineRef.current = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#F6B45A',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });
      }
    } else {
      // Draw simple lines between points
      const path: GeoCoordinates[] = [
        route.startLocation,
        ...route.stops.map(s => s.location),
      ];

      if (route.returnToStart) {
        path.push(route.startLocation);
      }

      polylineRef.current = new window.google.maps.Polyline({
        path: path.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#F6B45A',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        map,
      });
    }

    // Fit map to bounds
    map.fitBounds(bounds, { padding: 50 });

  }, [isLoaded, route, onStopClick]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900/50 rounded-xl ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-400 mb-2">{error}</div>
          <p className="text-gray-500 text-sm">
            Add VITE_GOOGLE_MAPS_API_KEY to your .env file
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-900/50 rounded-xl ${className}`}>
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: '300px' }}
    />
  );
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default RouteMap;
