import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Award,
  Zap
} from 'lucide-react';
import { TechnicianMetrics } from '../../types';

type SortField = 'rank' | 'jobsCompleted' | 'revenue' | 'efficiency' | 'customerRating';
type SortDirection = 'asc' | 'desc';

interface TechnicianLeaderboardProps {
  technicians: TechnicianMetrics[];
  onTechnicianClick?: (technicianId: string) => void;
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

const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 90) return 'text-emerald-400';
  if (efficiency >= 75) return 'text-amber-400';
  return 'text-red-400';
};

const getRatingStars = (rating: number): React.ReactNode => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < fullStars
              ? 'text-amber-400 fill-amber-400'
              : i === fullStars && hasHalf
              ? 'text-amber-400 fill-amber-400/50'
              : 'text-gray-600'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-400">{rating.toFixed(1)}</span>
    </div>
  );
};

export const TechnicianLeaderboard: React.FC<TechnicianLeaderboardProps> = ({
  technicians,
  onTechnicianClick,
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

  const sortedTechnicians = [...technicians].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'rank':
        comparison = a.rank - b.rank;
        break;
      case 'jobsCompleted':
        comparison = a.jobsCompleted - b.jobsCompleted;
        break;
      case 'revenue':
        comparison = a.revenue - b.revenue;
        break;
      case 'efficiency':
        comparison = a.efficiency - b.efficiency;
        break;
      case 'customerRating':
        comparison = a.customerRating - b.customerRating;
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

  if (technicians.length === 0) {
    return (
      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
        <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No technicians yet</p>
        <p className="text-xs text-gray-600 mt-1">Add technicians in Settings to see the leaderboard</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedTechnicians.slice(0, 5).map((tech, idx) => (
          <motion.div
            key={tech.technicianId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onTechnicianClick?.(tech.technicianId)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
              ${tech.rank <= 3 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/10'}
              hover:bg-white/10`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{getRankIcon(tech.rank)}</span>
              <div>
                <p className="text-sm font-medium text-white">{tech.name}</p>
                <p className="text-xs text-gray-500">{tech.locationName || 'Unassigned'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{tech.jobsCompleted} jobs</p>
              <div className={`flex items-center justify-end gap-1 text-xs ${getEfficiencyColor(tech.efficiency)}`}>
                <Zap className="w-3 h-3" />
                <span>{tech.efficiency}% eff</span>
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
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Performers</h3>
        </div>
        <span className="text-xs text-gray-500">{technicians.length} technicians</span>
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
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Technician</span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="jobsCompleted" label="Jobs" icon={<Clock className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="revenue" label="Revenue" icon={<DollarSign className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="efficiency" label="Efficiency" icon={<Zap className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader field="customerRating" label="Rating" icon={<Star className="w-3 h-3" />} />
              </th>
              <th className="px-4 py-3 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Callbacks</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTechnicians.map((tech, idx) => (
              <motion.tr
                key={tech.technicianId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onTechnicianClick?.(tech.technicianId)}
                className={`border-b border-white/5 cursor-pointer transition-colors
                  ${tech.rank <= 3 ? 'bg-emerald-500/5' : ''}
                  hover:bg-white/5`}
              >
                <td className="px-4 py-3">
                  <span className="text-lg">{getRankIcon(tech.rank)}</span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{tech.name}</p>
                    <p className="text-xs text-gray-500">{tech.locationName || 'Unassigned'}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-sm text-white">{tech.jobsCompleted}</p>
                  <p className="text-xs text-gray-500">{tech.avgJobTime.toFixed(1)}h avg</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(tech.revenue)}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          tech.efficiency >= 90 ? 'bg-emerald-500' :
                          tech.efficiency >= 75 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${tech.efficiency}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${getEfficiencyColor(tech.efficiency)}`}>
                      {tech.efficiency}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {getRatingStars(tech.customerRating)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm ${tech.callbacks > 2 ? 'text-red-400' : 'text-gray-400'}`}>
                    {tech.callbacks}
                  </span>
                  {tech.callbacks > 2 && (
                    <AlertCircle className="w-3 h-3 text-red-400 inline ml-1" />
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
