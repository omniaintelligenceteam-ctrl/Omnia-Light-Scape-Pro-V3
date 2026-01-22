import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Zap,
  Target,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';
import {
  TeamPerformanceResult,
  TechnicianPerformance,
  PerformanceQuadrant
} from '../../hooks/useTeamPerformance';

interface TeamPerformanceMatrixProps {
  data: TeamPerformanceResult;
}

type SortField = 'revenue' | 'efficiency' | 'quality' | 'speed' | 'utilization';

const quadrantConfig: Record<PerformanceQuadrant, { label: string; color: string; icon: React.ElementType; description: string }> = {
  star: {
    label: 'Star',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    icon: Star,
    description: 'High efficiency & quality'
  },
  workhorse: {
    label: 'Workhorse',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    icon: Zap,
    description: 'Fast but needs quality focus'
  },
  perfectionist: {
    label: 'Perfectionist',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    icon: Target,
    description: 'Quality-focused, can improve speed'
  },
  developing: {
    label: 'Developing',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: AlertCircle,
    description: 'Needs coaching & support'
  }
};

export const TeamPerformanceMatrix: React.FC<TeamPerformanceMatrixProps> = ({ data }) => {
  const { technicians, teamAverages, needsCoaching, quadrantCounts } = data;
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  // Sort technicians
  const sortedTechnicians = [...technicians].sort((a, b) => {
    const multiplier = sortAsc ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="bg-gradient-to-b from-[#151515] to-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Team Performance</h3>
            <p className="text-xs text-gray-400">{technicians.length} technicians</p>
          </div>
        </div>
      </div>

      {/* Quadrant Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {(Object.keys(quadrantConfig) as PerformanceQuadrant[]).map(quadrant => {
          const config = quadrantConfig[quadrant];
          const Icon = config.icon;
          const count = quadrantCounts[quadrant];

          return (
            <div
              key={quadrant}
              className={`p-3 rounded-xl border ${config.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-[10px] text-gray-400">{config.description}</p>
            </div>
          );
        })}
      </div>

      {/* Team Averages */}
      <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Team Averages</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Efficiency</p>
            <p className="text-lg font-bold text-white">{teamAverages.efficiency}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Quality</p>
            <p className="text-lg font-bold text-white">{teamAverages.quality}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Avg Revenue</p>
            <p className="text-lg font-bold text-white">${teamAverages.revenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Utilization</p>
            <p className="text-lg font-bold text-white">{teamAverages.utilization}%</p>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-400">Technician</th>
              <th
                onClick={() => handleSort('revenue')}
                className="text-right py-3 px-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Revenue <SortIcon field="revenue" />
                </div>
              </th>
              <th
                onClick={() => handleSort('efficiency')}
                className="text-right py-3 px-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Efficiency <SortIcon field="efficiency" />
                </div>
              </th>
              <th
                onClick={() => handleSort('quality')}
                className="text-right py-3 px-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Quality <SortIcon field="quality" />
                </div>
              </th>
              <th
                onClick={() => handleSort('utilization')}
                className="text-right py-3 px-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Utilization <SortIcon field="utilization" />
                </div>
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-gray-400">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sortedTechnicians.map((tech: TechnicianPerformance, idx: number) => {
              const qConfig = quadrantConfig[tech.quadrant];
              const QIcon = qConfig.icon;
              const isExpanded = expandedTech === tech.id;

              return (
                <React.Fragment key={tech.id}>
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setExpandedTech(isExpanded ? null : tech.id)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${qConfig.color}`}>
                          <QIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tech.name}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {tech.badges.slice(0, 2).map(badge => (
                              <span
                                key={badge}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-[#F6B45A]/20 text-[#F6B45A] flex items-center gap-1"
                              >
                                <Award className="w-2.5 h-2.5" />
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-sm font-medium text-white">${tech.revenue.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tech.efficiency >= 70 ? 'bg-emerald-500' : tech.efficiency >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${tech.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm text-white w-8">{tech.efficiency}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tech.quality >= 70 ? 'bg-emerald-500' : tech.quality >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${tech.quality}%` }}
                          />
                        </div>
                        <span className="text-sm text-white w-8">{tech.quality}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`text-sm ${
                        tech.utilization >= 80 ? 'text-emerald-400' : tech.utilization >= 50 ? 'text-amber-400' : 'text-gray-400'
                      }`}>
                        {tech.utilization}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className={`inline-flex items-center gap-1 text-xs ${
                        tech.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tech.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(tech.trend)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <td colSpan={6} className="bg-white/5 px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-[10px] text-gray-500">Jobs Completed</p>
                                <p className="text-sm font-medium text-white">{tech.jobsCompleted}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-[10px] text-gray-500">Avg Job Time</p>
                                <p className="text-sm font-medium text-white">{tech.avgJobTime} hrs</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-[10px] text-gray-500">Jobs/Week</p>
                                <p className="text-sm font-medium text-white">{tech.speed}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-[10px] text-gray-500">Callbacks</p>
                                <p className="text-sm font-medium text-white">{tech.callbacks}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-[10px] text-gray-500">Revenue/Job</p>
                                <p className="text-sm font-medium text-white">
                                  ${tech.jobsCompleted > 0 ? Math.round(tech.revenue / tech.jobsCompleted).toLocaleString() : 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Coaching Alert */}
      {needsCoaching.length > 0 && (
        <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-amber-400">Coaching Opportunities</h4>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {needsCoaching.length} team member{needsCoaching.length > 1 ? 's' : ''} may benefit from additional support
          </p>
          <div className="flex flex-wrap gap-2">
            {needsCoaching.map(tech => (
              <span key={tech.id} className="text-xs px-2 py-1 bg-white/5 rounded-lg text-white">
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {technicians.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No technician data available</p>
          <p className="text-xs text-gray-500 mt-1">Assign technicians to projects to see performance metrics</p>
        </div>
      )}
    </div>
  );
};
