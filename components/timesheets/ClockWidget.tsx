import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Square, Coffee, Truck, Wrench, Loader2 } from 'lucide-react';
import { useTimesheets, type TimesheetEntry } from '../../hooks/useTimesheets';

interface ClockWidgetProps {
  technicianId: string;
  technicianName?: string;
  projectId?: string;
  projectName?: string;
  compact?: boolean;
}

const formatDuration = (startTime: string) => {
  const start = new Date(startTime);
  const now = new Date();
  const diff = now.getTime() - start.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
};

const formatHours = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const ENTRY_TYPES = [
  { id: 'driving', label: 'Driving', icon: Truck, color: 'blue' },
  { id: 'working', label: 'Working', icon: Wrench, color: 'green' },
  { id: 'break', label: 'Break', icon: Coffee, color: 'yellow' },
] as const;

export const ClockWidget: React.FC<ClockWidgetProps> = ({
  technicianId,
  technicianName,
  projectId,
  projectName,
  compact = false,
}) => {
  const {
    activeEntry,
    summary,
    clockIn,
    clockOut,
    startEntry,
    endEntry,
    isLoading,
  } = useTimesheets(technicianId);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isActioning, setIsActioning] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClockIn = async () => {
    setIsActioning(true);
    await clockIn(technicianId);
    setIsActioning(false);
  };

  const handleClockOut = async () => {
    setIsActioning(true);
    await clockOut();
    setIsActioning(false);
  };

  const handleStartEntry = async (entryType: 'driving' | 'working' | 'break') => {
    setIsActioning(true);
    await startEntry({
      technician_id: technicianId,
      project_id: projectId,
      entry_type: entryType,
      start_time: new Date().toISOString(),
    });
    setIsActioning(false);
  };

  const handleEndEntry = async () => {
    if (!activeEntry) return;
    setIsActioning(true);
    await endEntry(activeEntry.id);
    setIsActioning(false);
  };

  const getEntryTypeInfo = (type: string) => {
    return ENTRY_TYPES.find(t => t.id === type) || ENTRY_TYPES[1];
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#F6B45A]" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              activeEntry ? 'bg-green-500/10' : 'bg-white/5'
            }`}>
              <Clock className={`w-5 h-5 ${activeEntry ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {activeEntry ? `${getEntryTypeInfo(activeEntry.entry_type).label}` : 'Not Clocked In'}
              </p>
              {activeEntry && (
                <p className="text-xs text-gray-400">
                  {formatDuration(activeEntry.start_time)}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={activeEntry ? handleEndEntry : handleClockIn}
            disabled={isActioning}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeEntry
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : activeEntry ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${activeEntry ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <h3 className="text-lg font-semibold text-white">Time Tracker</h3>
        </div>
        <p className="text-sm text-gray-400">{technicianName}</p>
      </div>

      {/* Current Status */}
      <div className="p-6">
        {activeEntry ? (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400 mb-2">Currently {getEntryTypeInfo(activeEntry.entry_type).label}</p>
            <p className="text-4xl font-bold text-[#F6B45A]">
              {formatDuration(activeEntry.start_time)}
            </p>
            {activeEntry.project_name && (
              <p className="text-sm text-gray-400 mt-2">
                Job: {activeEntry.project_name}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400 mb-2">Not Clocked In</p>
            <p className="text-4xl font-bold text-gray-500">--:--:--</p>
          </div>
        )}

        {/* Action Buttons */}
        {activeEntry ? (
          <div className="space-y-3">
            {/* Switch Entry Type */}
            <div className="grid grid-cols-3 gap-2">
              {ENTRY_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = activeEntry.entry_type === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => !isActive && handleStartEntry(type.id)}
                    disabled={isActioning || isActive}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                      isActive
                        ? `bg-${type.color}-500/20 border-${type.color}-500/30 text-${type.color}-400`
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Clock Out */}
            <button
              onClick={handleClockOut}
              disabled={isActioning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-semibold hover:bg-red-500/20 transition-colors"
            >
              {isActioning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Square className="w-5 h-5" />
                  Clock Out
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleClockIn}
            disabled={isActioning}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-500 rounded-xl text-white font-semibold hover:bg-green-600 transition-colors"
          >
            {isActioning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                Clock In
              </>
            )}
          </button>
        )}
      </div>

      {/* Today's Summary */}
      <div className="px-6 py-4 bg-white/5 border-t border-white/5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Today's Summary</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-green-400">{formatHours(summary.workingHours * 60)}</p>
            <p className="text-xs text-gray-500">Working</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-400">{formatHours(summary.drivingHours * 60)}</p>
            <p className="text-xs text-gray-500">Driving</p>
          </div>
          <div>
            <p className="text-lg font-bold text-yellow-400">{formatHours(summary.breakHours * 60)}</p>
            <p className="text-xs text-gray-500">Break</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClockWidget;
