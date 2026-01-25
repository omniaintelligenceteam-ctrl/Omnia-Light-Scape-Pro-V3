import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, Check, ChevronLeft, ChevronRight,
  Loader2, Truck, Wrench, Coffee, FileText
} from 'lucide-react';
import { useTimesheets, type TimesheetEntry } from '../../hooks/useTimesheets';
import { useTechnicians } from '../../hooks/useTechnicians';

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getEntryIcon = (type: string) => {
  switch (type) {
    case 'driving':
      return Truck;
    case 'working':
      return Wrench;
    case 'break':
      return Coffee;
    default:
      return Clock;
  }
};

const getEntryColor = (type: string) => {
  switch (type) {
    case 'driving':
      return 'blue';
    case 'working':
      return 'green';
    case 'break':
      return 'yellow';
    default:
      return 'gray';
  }
};

export const TimesheetsSection: React.FC = () => {
  const { technicians, isLoading: techsLoading } = useTechnicians();
  const {
    entries,
    dailySummaries,
    isLoading,
    entriesByDate,
    approveTimesheets,
  } = useTimesheets();

  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  // Get week start/end dates
  const weekDates = useMemo(() => {
    const start = new Date(selectedWeek);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedWeek]);

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [weekDates]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (selectedTechnician !== 'all') {
      filtered = filtered.filter(e => e.technician_id === selectedTechnician);
    }

    // Filter to selected week
    const weekStart = weekDates[0].toISOString().split('T')[0];
    const weekEnd = weekDates[6].toISOString().split('T')[0];
    filtered = filtered.filter(e => {
      const date = e.start_time.split('T')[0];
      return date >= weekStart && date <= weekEnd;
    });

    return filtered;
  }, [entries, selectedTechnician, weekDates]);

  // Group by technician and date
  const technicianWeekData = useMemo(() => {
    const data: Record<string, Record<string, { entries: TimesheetEntry[]; total: number }>> = {};

    const techIds = selectedTechnician === 'all'
      ? [...new Set(filteredEntries.map(e => e.technician_id))]
      : [selectedTechnician];

    techIds.forEach(techId => {
      data[techId] = {};
      weekDates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayEntries = filteredEntries.filter(e =>
          e.technician_id === techId && e.start_time.split('T')[0] === dateStr
        );
        const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
        data[techId][dateStr] = { entries: dayEntries, total: totalMinutes / 60 };
      });
    });

    return data;
  }, [filteredEntries, weekDates, selectedTechnician]);

  const handlePrevWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeek(newDate);
  };

  const handleThisWeek = () => {
    setSelectedWeek(new Date());
  };

  const handleToggleEntry = (entryId: string) => {
    setSelectedEntries(prev =>
      prev.includes(entryId) ? prev.filter(id => id !== entryId) : [...prev, entryId]
    );
  };

  const handleApproveSelected = async () => {
    if (selectedEntries.length === 0) return;
    setIsApproving(true);
    await approveTimesheets(selectedEntries);
    setSelectedEntries([]);
    setIsApproving(false);
  };

  const loading = isLoading || techsLoading;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleThisWeek}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            {weekLabel}
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Technician Filter */}
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50 appearance-none min-w-[150px]"
          >
            <option value="all">All Technicians</option>
            {technicians.map(tech => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>

          {/* Approve Selected */}
          {selectedEntries.length > 0 && (
            <button
              onClick={handleApproveSelected}
              disabled={isApproving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-xl text-white font-semibold hover:bg-green-600 transition-colors"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve ({selectedEntries.length})
            </button>
          )}
        </div>
      </div>

      {/* Timesheets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F6B45A]" />
        </div>
      ) : Object.keys(technicianWeekData).length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No timesheets yet</h3>
          <p className="text-sm text-gray-400">
            Timesheet entries will appear here when technicians clock in and out.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(technicianWeekData).map(([techId, weekData]) => {
            const technician = technicians.find(t => t.id === techId);
            const weekTotal = Object.values(weekData).reduce((sum, day) => sum + day.total, 0);

            return (
              <motion.div
                key={techId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Technician Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F6B45A]/10 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{technician?.name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-500">{technician?.role || 'Technician'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{formatHours(weekTotal)}</p>
                    <p className="text-xs text-gray-500">This Week</p>
                  </div>
                </div>

                {/* Week Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/5">
                        {weekDates.map((date) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const isToday = dateStr === new Date().toISOString().split('T')[0];

                          return (
                            <th
                              key={dateStr}
                              className={`p-3 text-center border-r border-white/5 last:border-0 ${
                                isToday ? 'bg-[#F6B45A]/5' : ''
                              }`}
                            >
                              <p className={`text-xs font-medium ${isToday ? 'text-[#F6B45A]' : 'text-gray-500'}`}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                              <p className={`text-sm ${isToday ? 'text-white' : 'text-gray-400'}`}>
                                {date.getDate()}
                              </p>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {weekDates.map((date) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const dayData = weekData[dateStr];
                          const isToday = dateStr === new Date().toISOString().split('T')[0];

                          return (
                            <td
                              key={dateStr}
                              className={`p-2 border-r border-white/5 last:border-0 align-top ${
                                isToday ? 'bg-[#F6B45A]/5' : ''
                              }`}
                            >
                              {dayData.entries.length > 0 ? (
                                <div className="space-y-1">
                                  {dayData.entries.map((entry) => {
                                    const Icon = getEntryIcon(entry.entry_type);
                                    const color = getEntryColor(entry.entry_type);
                                    const isSelected = selectedEntries.includes(entry.id);

                                    return (
                                      <button
                                        key={entry.id}
                                        onClick={() => !entry.is_approved && handleToggleEntry(entry.id)}
                                        disabled={entry.is_approved}
                                        className={`w-full p-2 rounded-lg text-left transition-colors ${
                                          entry.is_approved
                                            ? 'bg-green-500/10 border border-green-500/20 cursor-default'
                                            : isSelected
                                            ? 'bg-[#F6B45A]/20 border border-[#F6B45A]/30'
                                            : 'bg-white/5 border border-white/10 hover:border-white/20'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Icon className={`w-3 h-3 text-${color}-400`} />
                                          <span className="text-xs text-white truncate">
                                            {formatTime(entry.start_time)}
                                          </span>
                                          {entry.is_approved && (
                                            <Check className="w-3 h-3 text-green-400 ml-auto" />
                                          )}
                                        </div>
                                        {entry.duration_minutes && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            {formatHours(entry.duration_minutes / 60)}
                                          </p>
                                        )}
                                      </button>
                                    );
                                  })}
                                  <div className="text-center pt-1 border-t border-white/5">
                                    <p className="text-xs font-medium text-white">
                                      {formatHours(dayData.total)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-xs text-gray-600">-</p>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimesheetsSection;
