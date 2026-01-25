import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Car,
  Briefcase,
  ChevronRight,
  Home,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Calendar,
  User,
  Route as RouteIcon,
  Clock,
} from 'lucide-react';
import type {
  SavedProject,
  Technician,
  OptimizedRoute,
  RouteRequest,
  RouteJob,
  GeoCoordinates,
} from '../types';
import { geocodeAddress } from '../services/geocodingService';
import {
  optimizeRoute,
  generateGoogleMapsUrl,
} from '../services/routeOptimizationService';
import RouteMap from './RouteMap';

interface RoutePlannerProps {
  projects: SavedProject[];
  technicians: Technician[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onProjectClick?: (projectId: string) => void;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({
  projects,
  technicians,
  selectedDate,
  onDateChange,
  onProjectClick,
}) => {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('all');
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filter scheduled projects for selected date
  const scheduledProjects = useMemo(() => {
    return projects.filter(p => {
      if (!p.schedule?.scheduledDate) return false;
      if (p.schedule.scheduledDate !== selectedDate) return false;
      if (p.status === 'completed') return false;

      // Filter by technician if selected
      if (selectedTechnicianId !== 'all' && p.assignedTechnicianId !== selectedTechnicianId) {
        return false;
      }

      return true;
    });
  }, [projects, selectedDate, selectedTechnicianId]);

  // Get selected technician
  const selectedTechnician = useMemo(() => {
    if (selectedTechnicianId === 'all') return null;
    return technicians.find(t => t.id === selectedTechnicianId) || null;
  }, [selectedTechnicianId, technicians]);

  // Reset route when date or technician changes
  useEffect(() => {
    setOptimizedRoute(null);
    setError(null);
  }, [selectedDate, selectedTechnicianId]);

  // Optimize route handler
  const handleOptimize = async () => {
    if (scheduledProjects.length === 0) {
      setError('No jobs scheduled for this date');
      return;
    }

    // Need a technician with a home address for route start
    if (selectedTechnicianId === 'all') {
      setError('Please select a technician to optimize their route');
      return;
    }

    const tech = selectedTechnician;
    if (!tech) {
      setError('Technician not found');
      return;
    }

    // Get start location (technician's home or default office)
    let startLocation: GeoCoordinates;
    let startAddress: string;

    if (tech.homeLatitude && tech.homeLongitude) {
      startLocation = { lat: tech.homeLatitude, lng: tech.homeLongitude };
      startAddress = tech.homeAddress || 'Home';
    } else if (tech.homeAddress) {
      // Try to geocode the home address
      setIsGeocoding(true);
      const coords = await geocodeAddress(tech.homeAddress);
      setIsGeocoding(false);

      if (!coords) {
        setError(`Could not geocode technician's home address: ${tech.homeAddress}`);
        return;
      }
      startLocation = coords;
      startAddress = tech.homeAddress;
    } else {
      setError('Technician has no home address set. Please set their home address in Settings.');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      // Build jobs list with geocoding
      const jobs: RouteJob[] = [];
      setIsGeocoding(true);

      for (const project of scheduledProjects) {
        const address = project.quote?.clientDetails?.address || '';

        if (!address) {
          console.warn(`Project ${project.name} has no address, skipping`);
          continue;
        }

        // Try to get coordinates
        let location: GeoCoordinates | null = null;

        // TODO: Use stored lat/lng from client if available
        location = await geocodeAddress(address);

        if (!location) {
          console.warn(`Could not geocode address for ${project.name}: ${address}`);
          continue;
        }

        jobs.push({
          projectId: project.id,
          projectName: project.name,
          clientName: project.quote?.clientDetails?.name || project.clientName || 'Unknown',
          location,
          address,
          duration: project.schedule?.estimatedDuration ? project.schedule.estimatedDuration * 60 : 120, // Default 2 hours
          timeSlot: project.schedule?.timeSlot,
          customTime: project.schedule?.customTime,
        });
      }

      setIsGeocoding(false);

      if (jobs.length === 0) {
        setError('No jobs with valid addresses found');
        setIsOptimizing(false);
        return;
      }

      // Build route request
      const routeRequest: RouteRequest = {
        technicianId: tech.id,
        technicianName: tech.name,
        startLocation,
        startAddress,
        jobs,
        constraints: {
          returnToStart: true,
          workingHoursStart: '08:00',
          workingHoursEnd: '18:00',
        },
      };

      // Optimize!
      const result = await optimizeRoute(routeRequest);
      setOptimizedRoute(result);
    } catch (err) {
      console.error('Route optimization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to optimize route');
    } finally {
      setIsOptimizing(false);
      setIsGeocoding(false);
    }
  };

  // Open in Google Maps
  const handleOpenInMaps = () => {
    if (!optimizedRoute) return;
    const url = generateGoogleMapsUrl(optimizedRoute);
    window.open(url, '_blank');
  };

  // Format time from ISO string
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-white/10">
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          />
        </div>

        {/* Technician Selector */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <select
            value={selectedTechnicianId}
            onChange={(e) => setSelectedTechnicianId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50 min-w-[160px]"
          >
            <option value="all">All Technicians</option>
            {technicians.filter(t => t.isActive).map(tech => (
              <option key={tech.id} value={tech.id}>{tech.name}</option>
            ))}
          </select>
        </div>

        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={isOptimizing || scheduledProjects.length === 0}
          className="flex items-center gap-2 bg-[#F6B45A] hover:bg-[#e5a34a] disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isOptimizing || isGeocoding ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              {isGeocoding ? 'Geocoding...' : 'Optimizing...'}
            </>
          ) : (
            <>
              <RouteIcon className="w-4 h-4" />
              Optimize Route
            </>
          )}
        </button>

        {/* Open in Maps */}
        {optimizedRoute && optimizedRoute.stops.length > 0 && (
          <button
            onClick={handleOpenInMaps}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Maps
          </button>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-4"
          >
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Map Section */}
        <div className="lg:flex-1 min-h-[300px]">
          <RouteMap
            route={optimizedRoute}
            className="w-full h-full"
            onStopClick={onProjectClick}
          />
        </div>

        {/* Stops List */}
        <div className="lg:w-96 flex flex-col bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {/* Summary Header */}
          {optimizedRoute && optimizedRoute.stops.length > 0 ? (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-medium mb-2">
                <Navigation className="w-4 h-4 text-[#F6B45A]" />
                <span>{optimizedRoute.technicianName}'s Route</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-gray-400 text-xs">Jobs</div>
                  <div className="text-white font-medium">{optimizedRoute.stops.length}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-gray-400 text-xs">Driving</div>
                  <div className="text-white font-medium">{formatDuration(optimizedRoute.totalDrivingTime)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-gray-400 text-xs">Work</div>
                  <div className="text-white font-medium">{(optimizedRoute.totalJobTime / 3600).toFixed(1)}h</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-medium">
                <RouteIcon className="w-4 h-4 text-gray-400" />
                <span>Route Stops</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {scheduledProjects.length === 0
                  ? 'No jobs scheduled for this date'
                  : 'Click "Optimize Route" to plan the best order'}
              </p>
            </div>
          )}

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto">
            {optimizedRoute ? (
              <div className="p-2">
                {/* Start Location with Leave Time */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-green-400 font-medium text-sm">Start</div>
                    <div className="text-gray-400 text-xs truncate">{optimizedRoute.startAddress}</div>
                    {optimizedRoute.leaveTime && (
                      <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Leave by {formatTime(optimizedRoute.leaveTime)}
                      </div>
                    )}
                  </div>
                  {optimizedRoute.leaveTime && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-amber-400 text-sm font-medium">{formatTime(optimizedRoute.leaveTime)}</div>
                      <div className="text-gray-500 text-[10px]">departure</div>
                    </div>
                  )}
                </div>

                {/* Job Stops */}
                {optimizedRoute.stops.map((stop, index) => (
                  <motion.div
                    key={stop.projectId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onProjectClick?.(stop.projectId)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer mb-2 group"
                  >
                    {/* Order Number */}
                    <div className="w-8 h-8 rounded-full bg-[#F6B45A] flex items-center justify-center flex-shrink-0">
                      <span className="text-black font-bold text-sm">{stop.order}</span>
                    </div>

                    {/* Stop Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate group-hover:text-[#F6B45A] transition-colors">
                        {stop.projectName}
                      </div>
                      <div className="text-gray-400 text-xs truncate">{stop.clientName}</div>
                      <div className="text-gray-500 text-xs truncate mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {stop.address}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="flex items-center gap-1 text-blue-400">
                          <Car className="w-3 h-3" />
                          {formatDuration(stop.drivingTimeFromPrevious)}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Briefcase className="w-3 h-3" />
                          {stop.jobDuration} min
                        </span>
                      </div>
                    </div>

                    {/* Times */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-white text-sm">{formatTime(stop.arrivalTime)}</div>
                      <div className="text-gray-500 text-xs">to {formatTime(stop.departureTime)}</div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </motion.div>
                ))}

                {/* Return Home */}
                {optimizedRoute.returnToStart && optimizedRoute.returnArrivalTime && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 mt-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/50 flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-green-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-green-400 font-medium text-sm">Return Home</div>
                      <div className="text-gray-500 text-xs truncate">{optimizedRoute.startAddress}</div>
                    </div>
                    <div className="text-green-400 text-sm">{formatTime(optimizedRoute.returnArrivalTime)}</div>
                  </div>
                )}
              </div>
            ) : (
              /* Unoptimized job list */
              <div className="p-2">
                {scheduledProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No jobs scheduled</p>
                  </div>
                ) : (
                  scheduledProjects.map((project, index) => (
                    <div
                      key={project.id}
                      onClick={() => onProjectClick?.(project.id)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer mb-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{project.name}</div>
                        <div className="text-gray-400 text-xs truncate">
                          {project.quote?.clientDetails?.name || project.clientName || 'Unknown'}
                        </div>
                        <div className="text-gray-500 text-xs truncate mt-1">
                          {project.quote?.clientDetails?.address || 'No address'}
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs flex-shrink-0">
                        {project.schedule?.timeSlot === 'morning' && 'AM'}
                        {project.schedule?.timeSlot === 'afternoon' && 'PM'}
                        {project.schedule?.timeSlot === 'evening' && 'Eve'}
                        {project.schedule?.timeSlot === 'custom' && project.schedule?.customTime}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Total Summary Footer */}
          {optimizedRoute && optimizedRoute.stops.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="text-sm text-gray-400">
                Total: {(optimizedRoute.totalDistance / 1609.34).toFixed(1)} miles •{' '}
                {formatDuration(optimizedRoute.totalDrivingTime)} driving
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
