import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';
import {
  CapacityPlanningResult,
  TechnicianCapacity,
  DayCapacity,
  LoadBalancingAlert
} from '../../hooks/useCapacityPlanning';

interface CapacityDashboardProps {
  data: CapacityPlanningResult;
  onViewJob?: (jobId: string) => void;
}

export const CapacityDashboard: React.FC<CapacityDashboardProps> = ({ data, onViewJob }) => {
  const { technicians, teamCapacity, alerts, canTakeMoreJobs, suggestedCapacity } = data;
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  // Get utilization color
  const getUtilizationColor = (percent: number) => {
    if (percent > 100) return 'text-red-400 bg-red-500';
    if (percent >= 80) return 'text-emerald-400 bg-emerald-500';
    if (percent >= 50) return 'text-amber-400 bg-amber-500';
    return 'text-gray-400 bg-gray-500';
  };

  const getUtilizationBgColor = (percent: number) => {
    if (percent > 100) return 'bg-red-500/20 border-red-500/30';
    if (percent >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
    if (percent >= 50) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-white/5 border-white/10';
  };

  return (
    <div className="bg-gradient-to-b from-[#151515] to-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Capacity Dashboard</h3>
            <p className="text-xs text-gray-400">7-day scheduling overview</p>
          </div>
        </div>
        {/* Capacity Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          canTakeMoreJobs ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          {canTakeMoreJobs ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {canTakeMoreJobs ? `Can take ${suggestedCapacity} more jobs` : 'Near capacity'}
          </span>
        </div>
      </div>

      {/* Team Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Jobs This Week</span>
          </div>
          <p className="text-2xl font-bold text-white">{teamCapacity.jobsThisWeek}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Scheduled Hours</span>
          </div>
          <p className="text-2xl font-bold text-white">{teamCapacity.totalScheduledHours}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Team Utilization</span>
          </div>
          <p className={`text-2xl font-bold ${getUtilizationColor(teamCapacity.teamUtilization).split(' ')[0]}`}>
            {teamCapacity.teamUtilization}%
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Available Hours</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{teamCapacity.remainingCapacity}</p>
        </div>
      </div>

      {/* Technician Capacity Grid */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          Weekly Capacity by Technician
        </h4>
        <div className="space-y-3">
          {technicians.map((tech: TechnicianCapacity) => (
            <motion.div
              key={tech.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border transition-all ${
                selectedTech === tech.id ? 'bg-white/10 border-blue-500/30' : 'bg-white/5 border-white/10'
              }`}
            >
              {/* Tech Header */}
              <div
                onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                className="flex items-center justify-between p-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getUtilizationBgColor(tech.weeklyUtilization)}`}>
                    <span className="text-sm font-bold">{tech.weeklyUtilization}%</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tech.name}</p>
                    <p className="text-xs text-gray-400">
                      {tech.totalScheduledHours}h scheduled / {tech.totalAvailableHours}h available
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {tech.isOverbooked && (
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                      Overbooked
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                    selectedTech === tech.id ? 'rotate-90' : ''
                  }`} />
                </div>
              </div>

              {/* Weekly Timeline */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-7 gap-1">
                  {tech.weeklyCapacity.map((day: DayCapacity) => (
                    <div
                      key={day.date}
                      className={`text-center p-2 rounded-lg ${
                        day.isToday ? 'ring-2 ring-blue-500/50' : ''
                      } ${getUtilizationBgColor(day.utilizationPercent)}`}
                    >
                      <p className="text-[10px] text-gray-400">{day.dayName}</p>
                      <p className={`text-lg font-bold ${
                        day.utilizationPercent > 100
                          ? 'text-red-400'
                          : day.utilizationPercent >= 80
                          ? 'text-emerald-400'
                          : day.utilizationPercent > 0
                          ? 'text-amber-400'
                          : 'text-gray-500'
                      }`}>
                        {day.scheduledJobs}
                      </p>
                      <p className="text-[10px] text-gray-500">{day.scheduledHours}h</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expanded Job Details */}
              <AnimatePresence>
                {selectedTech === tech.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10"
                  >
                    <div className="p-4 max-h-64 overflow-y-auto">
                      {tech.weeklyCapacity.map((day: DayCapacity) => {
                        if (day.jobs.length === 0) return null;
                        return (
                          <div key={day.date} className="mb-4 last:mb-0">
                            <p className="text-xs font-medium text-gray-400 mb-2">
                              {day.dayName} - {day.date}
                            </p>
                            <div className="space-y-2">
                              {day.jobs.map(job => (
                                <div
                                  key={job.id}
                                  onClick={() => onViewJob?.(job.id)}
                                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                                >
                                  <div>
                                    <p className="text-sm text-white">{job.name}</p>
                                    <p className="text-xs text-gray-400">{job.clientName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400">{job.timeSlot}</p>
                                    <p className="text-xs text-gray-500">{job.hours}h</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {tech.weeklyCapacity.every(d => d.jobs.length === 0) && (
                        <p className="text-sm text-gray-400 text-center py-4">
                          No jobs scheduled this week
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Load Balancing Alerts */}
      {alerts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Load Balancing Alerts
          </h4>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert: LoadBalancingAlert, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-3 rounded-xl border ${
                  alert.severity === 'high'
                    ? 'bg-red-500/5 border-red-500/20'
                    : alert.severity === 'medium'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'high'
                      ? 'bg-red-500/20'
                      : alert.severity === 'medium'
                      ? 'bg-amber-500/20'
                      : 'bg-blue-500/20'
                  }`}>
                    {alert.type === 'overbooked' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    {alert.type === 'underutilized' && <TrendingUp className="w-3 h-3 text-blue-400" />}
                    {alert.type === 'suggestion' && <Zap className="w-3 h-3 text-amber-400" />}
                    {alert.type === 'gap' && <Clock className="w-3 h-3 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-white">{alert.message}</p>
                    {alert.date && (
                      <p className="text-xs text-gray-400 mt-1">{alert.date}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {alerts.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                +{alerts.length - 5} more alerts
              </p>
            )}
          </div>
        </div>
      )}

      {/* No Alerts State */}
      {alerts.length === 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Workload is balanced</p>
            <p className="text-xs text-gray-400">No scheduling conflicts or capacity issues detected</p>
          </div>
        </div>
      )}

      {/* No Technicians State */}
      {technicians.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No technicians configured</p>
          <p className="text-xs text-gray-500 mt-1">Add technicians to track capacity</p>
        </div>
      )}
    </div>
  );
};
