import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderCheck,
  Percent,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { LocationMetrics } from '../../types';

type SortField = 'rank' | 'revenue' | 'jobsCompleted' | 'conversionRate' | 'trend';
type SortDirection = 'asc' | 'desc';

interface LocationLeaderboardProps {
  locations: LocationMetrics[];
  onLocationClick?: (locationId: string) => void;
  compact?: boolean;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return rank.toString();
  }
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
};

export const LocationLeaderboard: React.FC<LocationLeaderboardProps> = ({
  locations,
  onLocationClick,
  compact = false
}) => {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortedLocations = [...locations].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'rank':
        comparison = a.rank - b.rank;
        break;
      case 'revenue':
        comparison = a.revenue - b.revenue;
        break;
      case 'jobsCompleted':
        comparison = a.jobsCompleted - b.jobsCompleted;
        break;
      case 'conversionRate':
        comparison = a.conversionRate - b.conversionRate;
        break;
      case 'trend':
        comparison = a.trend - b.trend;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortHeader: React.FC<{ field: SortField; label: string; icon?: React.ReactNode }> = ({
    field,
    label,
    icon
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-white transition-colors"
    >
      {icon}
      <span>{label}</span>
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );

  if (locations.length === 0) {
    return (
      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
        <MapPin className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No locations yet</p>
        <p className="text-xs text-gray-600 mt-1">Add locations in Settings to see the leaderboard</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedLocations.slice(0, 5).map((location, idx) => (
          <motion.div
            key={location.locationId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onLocationClick?.(location.locationId)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
              ${location.rank <= 3 ? 'bg-[#F6B45A]/10 border border-[#F6B45A]/20' : 'bg-white/5 border border-white/10'}
              hover:bg-white/10`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{getRankIcon(location.rank)}</span>
              <div>
                <p className="text-sm font-medium text-white">{location.locationName}</p>
                <p className="text-xs text-gray-500">{location.jobsCompleted} jobs</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{formatCurrency(location.revenue)}</p>
              <div className={`flex items-center justify-end gap-1 text-xs ${
                location.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {location.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(location.trend)}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#F6B45A]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Location Leaderboard</h3>
        </div>
        <span className="text-xs text-gray-500">{locations.length} locations</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left">
                <SortHeader field="rank" label="Rank" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Location</span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="revenue" label="Revenue" icon={<DollarSign className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="jobsCompleted" label="Jobs" icon={<FolderCheck className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="conversionRate" label="Conv %" icon={<Percent className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="trend" label="Trend" icon={<TrendingUp className="w-3 h-3" />} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLocations.map((location, idx) => (
              <motion.tr
                key={location.locationId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onLocationClick?.(location.locationId)}
                className={`border-b border-white/5 cursor-pointer transition-colors
                  ${location.rank <= 3 ? 'bg-[#F6B45A]/5' : ''}
                  hover:bg-white/5`}
              >
                <td className="px-4 py-3">
                  <span className="text-lg">{getRankIcon(location.rank)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{location.locationName}</p>
                    {location.trend < -10 && (
                      <span title="Needs attention">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(location.revenue)}</p>
                  {location.revenueTarget && (
                    <div className="mt-1 w-16 h-1 bg-white/10 rounded-full overflow-hidden ml-auto">
                      <div
                        className="h-full bg-[#F6B45A] rounded-full"
                        style={{ width: `${Math.min(100, location.revenueProgress)}%` }}
                      />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-sm text-white">{location.jobsCompleted}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className={`text-sm font-medium ${
                    location.conversionRate >= 70 ? 'text-emerald-400' :
                    location.conversionRate >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {location.conversionRate}%
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                    location.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {location.trend >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{location.trend >= 0 ? '+' : ''}{location.trend}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
