import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Home, CalendarDays, Sun, Sunset, Moon } from 'lucide-react';
import { SavedProject, ScheduleData, TimeSlot } from '../types';

interface ScheduleViewProps {
  projects: SavedProject[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onViewProject: (project: SavedProject) => void;
  onReschedule: (project: SavedProject) => void;
  onComplete: (project: SavedProject) => void;
}

// Helper to format date for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

// Helper to format short date
const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper to get time slot display
const getTimeSlotDisplay = (slot: TimeSlot, customTime?: string): { label: string; icon: React.ReactNode; time: string } => {
  switch (slot) {
    case 'morning':
      return { label: 'Morning', icon: <Sun className="w-4 h-4" />, time: '8 AM - 12 PM' };
    case 'afternoon':
      return { label: 'Afternoon', icon: <Sunset className="w-4 h-4" />, time: '12 PM - 5 PM' };
    case 'evening':
      return { label: 'Evening', icon: <Moon className="w-4 h-4" />, time: '5 PM - 8 PM' };
    case 'custom':
      return { label: 'Custom', icon: <Clock className="w-4 h-4" />, time: customTime || '' };
    default:
      return { label: 'TBD', icon: <Clock className="w-4 h-4" />, time: '' };
  }
};

// Calendar Component
const CalendarGrid: React.FC<{
  currentMonth: Date;
  selectedDate: Date;
  scheduledDates: Set<string>;
  onDateSelect: (date: Date) => void;
  onMonthChange: (delta: number) => void;
}> = ({ currentMonth, selectedDate, scheduledDates, onDateSelect, onMonthChange }) => {
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 md:h-12" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const isToday = date.toDateString() === today.toDateString();
    const hasJobs = scheduledDates.has(dateStr);
    const isPast = date < today;

    days.push(
      <motion.button
        key={day}
        onClick={() => onDateSelect(date)}
        className={`relative h-10 md:h-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200
          ${isSelected ? 'bg-blue-500 text-white' : isPast ? 'text-gray-600' : 'text-white hover:bg-white/10'}
          ${isToday && !isSelected ? 'ring-1 ring-blue-500/50' : ''}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className={`text-sm md:text-base font-medium ${isSelected ? 'text-white' : ''}`}>{day}</span>
        {hasJobs && (
          <div className={`absolute bottom-1 flex gap-0.5`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />
          </div>
        )}
      </motion.button>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-2xl p-4 md:p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={() => onMonthChange(-1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </motion.button>
        <h3 className="text-lg md:text-xl font-semibold text-white">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <motion.button
          onClick={() => onMonthChange(1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs md:text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
};

// Job Card Component
const JobCard: React.FC<{
  project: SavedProject;
  onViewProject: () => void;
  onReschedule: () => void;
  onComplete: () => void;
}> = ({ project, onViewProject, onReschedule, onComplete }) => {
  const schedule = project.schedule;
  if (!schedule) return null;

  const timeSlotInfo = getTimeSlotDisplay(schedule.timeSlot, schedule.customTime);
  const clientName = project.quote?.clientDetails?.name || 'Client';
  const clientPhone = project.quote?.clientDetails?.phone;
  const clientAddress = project.quote?.clientDetails?.address || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {project.image && (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0">
              <img src={project.image} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400" />
              {project.name}
            </h4>
            <p className="text-sm text-gray-400">~{schedule.estimatedDuration} hrs</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
          {timeSlotInfo.icon}
          <span className="text-xs text-blue-400 font-medium">{timeSlotInfo.time}</span>
        </div>
      </div>

      {/* Client Info */}
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <User className="w-4 h-4 text-gray-500" />
          {clientName}
          {clientPhone && (
            <>
              <span className="text-gray-600">·</span>
              <a href={`tel:${clientPhone}`} className="text-blue-400 hover:underline flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {clientPhone}
              </a>
            </>
          )}
        </div>
        {clientAddress && (
          <div className="flex items-start gap-2 text-gray-400">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{clientAddress}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {schedule.installationNotes && (
        <div className="text-sm text-gray-400 bg-white/5 rounded-lg p-2 border-l-2 border-blue-500/50">
          {schedule.installationNotes}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <motion.button
          onClick={onViewProject}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          View Project
        </motion.button>
        <motion.button
          onClick={onReschedule}
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Reschedule
        </motion.button>
        <motion.button
          onClick={onComplete}
          className="flex-1 px-3 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Complete
        </motion.button>
      </div>
    </motion.div>
  );
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  projects,
  selectedDate,
  onDateSelect,
  onViewProject,
  onReschedule,
  onComplete,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate));

  // Get all scheduled projects
  const scheduledProjects = useMemo(() => {
    return projects.filter(p => p.status === 'scheduled' && p.schedule);
  }, [projects]);

  // Get set of dates with scheduled jobs
  const scheduledDates = useMemo(() => {
    const dates = new Set<string>();
    scheduledProjects.forEach(p => {
      if (p.schedule?.scheduledDate) {
        dates.add(p.schedule.scheduledDate);
      }
    });
    return dates;
  }, [scheduledProjects]);

  // Get jobs for selected date
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const jobsForSelectedDate = useMemo(() => {
    return scheduledProjects.filter(p => p.schedule?.scheduledDate === selectedDateStr);
  }, [scheduledProjects, selectedDateStr]);

  // Group jobs by time slot
  const jobsByTimeSlot = useMemo(() => {
    const grouped: Record<TimeSlot, SavedProject[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      custom: [],
    };
    jobsForSelectedDate.forEach(job => {
      if (job.schedule) {
        grouped[job.schedule.timeSlot].push(job);
      }
    });
    return grouped;
  }, [jobsForSelectedDate]);

  const handleMonthChange = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Schedule</h2>
          <p className="text-sm text-gray-400">Manage your installation appointments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <CalendarGrid
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          scheduledDates={scheduledDates}
          onDateSelect={(date) => {
            onDateSelect(date);
            // If date is in different month, update current month view
            if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
              setCurrentMonth(new Date(date));
            }
          }}
          onMonthChange={handleMonthChange}
        />

        {/* Day View */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {formatDate(selectedDate)}
          </h3>

          {jobsForSelectedDate.length === 0 ? (
            <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-2xl p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No jobs scheduled for this day</p>
              <p className="text-sm text-gray-500 mt-1">
                Schedule a job from the Projects tab
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Morning Jobs */}
              {jobsByTimeSlot.morning.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Sun className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wide">Morning</span>
                  </div>
                  {jobsByTimeSlot.morning.map(job => (
                    <JobCard
                      key={job.id}
                      project={job}
                      onViewProject={() => onViewProject(job)}
                      onReschedule={() => onReschedule(job)}
                      onComplete={() => onComplete(job)}
                    />
                  ))}
                </div>
              )}

              {/* Afternoon Jobs */}
              {jobsByTimeSlot.afternoon.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Sunset className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wide">Afternoon</span>
                  </div>
                  {jobsByTimeSlot.afternoon.map(job => (
                    <JobCard
                      key={job.id}
                      project={job}
                      onViewProject={() => onViewProject(job)}
                      onReschedule={() => onReschedule(job)}
                      onComplete={() => onComplete(job)}
                    />
                  ))}
                </div>
              )}

              {/* Evening Jobs */}
              {jobsByTimeSlot.evening.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Moon className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wide">Evening</span>
                  </div>
                  {jobsByTimeSlot.evening.map(job => (
                    <JobCard
                      key={job.id}
                      project={job}
                      onViewProject={() => onViewProject(job)}
                      onReschedule={() => onReschedule(job)}
                      onComplete={() => onComplete(job)}
                    />
                  ))}
                </div>
              )}

              {/* Custom Time Jobs */}
              {jobsByTimeSlot.custom.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wide">Custom Time</span>
                  </div>
                  {jobsByTimeSlot.custom.map(job => (
                    <JobCard
                      key={job.id}
                      project={job}
                      onViewProject={() => onViewProject(job)}
                      onReschedule={() => onReschedule(job)}
                      onComplete={() => onComplete(job)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Jobs Summary */}
      {scheduledProjects.length > 0 && (
        <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Jobs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledProjects
              .filter(p => p.schedule && new Date(p.schedule.scheduledDate) >= new Date(new Date().toISOString().split('T')[0]))
              .sort((a, b) => new Date(a.schedule!.scheduledDate).getTime() - new Date(b.schedule!.scheduledDate).getTime())
              .slice(0, 6)
              .map(project => (
                <motion.button
                  key={project.id}
                  onClick={() => {
                    if (project.schedule) {
                      const date = new Date(project.schedule.scheduledDate);
                      onDateSelect(date);
                      setCurrentMonth(date);
                    }
                  }}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {project.image && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0">
                      <img src={project.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{project.name}</p>
                    <p className="text-xs text-gray-400">
                      {project.schedule && formatShortDate(project.schedule.scheduledDate)} · {getTimeSlotDisplay(project.schedule!.timeSlot).label}
                    </p>
                  </div>
                </motion.button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
