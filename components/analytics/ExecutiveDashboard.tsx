import React, { useState, useMemo } from 'react';
import {
  Building2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { CompanyTotals } from './CompanyTotals';
import { LocationLeaderboard } from './LocationLeaderboard';
import { TechnicianLeaderboard } from './TechnicianLeaderboard';
import { SmartAlertsBanner, generateSmartAlerts } from './SmartAlertsBanner';
import {
  CompanyMetrics,
  LocationMetrics,
  TechnicianMetrics,
  SmartAlert,
  Location,
  Technician
} from '../../types';

type DateRange = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year';

interface ExecutiveDashboardProps {
  locations: Location[];
  technicians: Technician[];
  // In a real app, these would come from API/hooks
  // For now, we'll generate mock data or pass them in
  locationMetrics?: LocationMetrics[];
  technicianMetrics?: TechnicianMetrics[];
  companyMetrics?: CompanyMetrics;
  isLoading?: boolean;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  onRefresh?: () => void;
  onLocationClick?: (locationId: string) => void;
  onTechnicianClick?: (technicianId: string) => void;
}

const dateRangeLabels: Record<DateRange, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  this_quarter: 'This Quarter',
  this_year: 'This Year'
};

// Generate mock data for demo purposes
const generateMockLocationMetrics = (locations: Location[]): LocationMetrics[] => {
  return locations.map((loc, idx) => ({
    locationId: loc.id,
    locationName: loc.name,
    revenue: Math.floor(Math.random() * 50000) + 20000,
    revenueTarget: 50000,
    revenueProgress: Math.floor(Math.random() * 100),
    jobsCompleted: Math.floor(Math.random() * 30) + 10,
    activeProjects: Math.floor(Math.random() * 15) + 5,
    avgTicket: Math.floor(Math.random() * 500) + 1200,
    conversionRate: Math.floor(Math.random() * 30) + 50,
    outstandingAR: Math.floor(Math.random() * 15000) + 5000,
    trend: Math.floor(Math.random() * 30) - 10,
    rank: idx + 1
  })).sort((a, b) => b.revenue - a.revenue).map((m, idx) => ({ ...m, rank: idx + 1 }));
};

const generateMockTechnicianMetrics = (technicians: Technician[], locations: Location[]): TechnicianMetrics[] => {
  return technicians.map((tech, idx) => {
    const location = locations.find(l => l.id === tech.locationId);
    return {
      technicianId: tech.id,
      name: tech.name,
      locationId: tech.locationId,
      locationName: location?.name,
      jobsCompleted: Math.floor(Math.random() * 20) + 5,
      avgJobTime: Math.random() * 2 + 2,
      revenue: Math.floor(Math.random() * 30000) + 10000,
      efficiency: Math.floor(Math.random() * 25) + 70,
      potentialUtilization: Math.floor(Math.random() * 30) + 65,
      callbacks: Math.floor(Math.random() * 4),
      rank: idx + 1
    };
  }).sort((a, b) => b.revenue - a.revenue).map((m, idx) => ({ ...m, rank: idx + 1 }));
};

const generateMockCompanyMetrics = (locationMetrics: LocationMetrics[], techCount: number): CompanyMetrics => {
  const totalRevenue = locationMetrics.reduce((sum, l) => sum + l.revenue, 0);
  const totalJobs = locationMetrics.reduce((sum, l) => sum + l.jobsCompleted, 0);
  const totalActive = locationMetrics.reduce((sum, l) => sum + l.activeProjects, 0);
  const totalAR = locationMetrics.reduce((sum, l) => sum + l.outstandingAR, 0);
  const avgConversion = locationMetrics.length > 0
    ? locationMetrics.reduce((sum, l) => sum + l.conversionRate, 0) / locationMetrics.length
    : 0;

  return {
    totalRevenue,
    totalRevenueYTD: totalRevenue * 8, // Assume we're in month 8
    yoyGrowth: Math.floor(Math.random() * 30) + 5,
    totalJobsCompleted: totalJobs,
    totalActiveProjects: totalActive,
    totalQuotesPending: Math.floor(Math.random() * 20) + 10,
    totalOutstandingAR: totalAR,
    arAgingBuckets: {
      current: Math.floor(totalAR * 0.5),
      days30: Math.floor(totalAR * 0.25),
      days60: Math.floor(totalAR * 0.15),
      days90Plus: Math.floor(totalAR * 0.1)
    },
    companyConversionRate: Math.round(avgConversion),
    avgProjectValue: totalJobs > 0 ? Math.round(totalRevenue / totalJobs) : 0,
    locationCount: locationMetrics.length,
    technicianCount: techCount
  };
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  locations,
  technicians,
  locationMetrics: propLocationMetrics,
  technicianMetrics: propTechnicianMetrics,
  companyMetrics: propCompanyMetrics,
  isLoading = false,
  dateRange: propDateRange = 'this_month',
  onDateRangeChange,
  onRefresh,
  onLocationClick,
  onTechnicianClick
}) => {
  const [internalDateRange, setInternalDateRange] = useState<DateRange>(propDateRange);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Use controlled dateRange if provided, otherwise use internal state
  const dateRange = onDateRangeChange ? propDateRange : internalDateRange;

  // Use provided metrics or generate mock data
  const locationMetrics = useMemo(() => {
    return propLocationMetrics || generateMockLocationMetrics(locations);
  }, [propLocationMetrics, locations]);

  const technicianMetrics = useMemo(() => {
    return propTechnicianMetrics || generateMockTechnicianMetrics(technicians, locations);
  }, [propTechnicianMetrics, technicians, locations]);

  const companyMetrics = useMemo(() => {
    return propCompanyMetrics || generateMockCompanyMetrics(locationMetrics, technicians.length);
  }, [propCompanyMetrics, locationMetrics, technicians.length]);

  // Generate smart alerts
  const alerts = useMemo(() => {
    const generated = generateSmartAlerts(
      locationMetrics,
      companyMetrics.arAgingBuckets
    );
    return generated.filter(a => !dismissedAlerts.has(a.id));
  }, [locationMetrics, companyMetrics.arAgingBuckets, dismissedAlerts]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const handleAlertClick = (alert: SmartAlert) => {
    if (alert.locationId && onLocationClick) {
      onLocationClick(alert.locationId);
    }
  };

  // Show empty state if no locations
  if (locations.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Building2 className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Locations Yet</h2>
        <p className="text-gray-500 text-center max-w-md mb-6">
          Add your business locations in Settings to see the executive dashboard with
          company-wide metrics, location leaderboards, and performance tracking.
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Go to Settings → Locations to get started</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#F6B45A]/20">
            <Building2 className="w-6 h-6 text-[#F6B45A]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Executive Dashboard</h1>
            <p className="text-sm text-gray-500">{locations.length} locations • {technicians.length} technicians</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => {
                const newRange = e.target.value as DateRange;
                if (onDateRangeChange) {
                  onDateRangeChange(newRange);
                } else {
                  setInternalDateRange(newRange);
                }
              }}
              className="appearance-none pl-9 pr-8 py-2 text-sm text-white bg-white/5 border border-white/10
                rounded-xl focus:outline-none focus:border-[#F6B45A]/50 cursor-pointer"
            >
              {Object.entries(dateRangeLabels).map(([value, label]) => (
                <option key={value} value={value} className="bg-[#1a1a1a]">
                  {label}
                </option>
              ))}
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10
                transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <SmartAlertsBanner
          alerts={alerts}
          onDismiss={handleDismissAlert}
          onAlertClick={handleAlertClick}
          maxVisible={3}
        />
      )}

      {/* Company Totals */}
      <CompanyTotals metrics={companyMetrics} isLoading={isLoading} />

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Leaderboard */}
        <div>
          <LocationLeaderboard
            locations={locationMetrics}
            onLocationClick={onLocationClick}
          />
        </div>

        {/* Technician Leaderboard */}
        <div>
          <TechnicianLeaderboard
            technicians={technicianMetrics}
            onTechnicianClick={onTechnicianClick}
          />
        </div>
      </div>
    </div>
  );
};
