import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Home, CalendarDays, Sun, Sunset, Moon, Plus, Edit3, Trash2, Briefcase, Users, Eye, MessageSquare, Star, CheckCircle2, DollarSign, Filter } from 'lucide-react';
import { SavedProject, TimeSlot, CalendarEvent, EventType } from '../types';

type ViewMode = 'all' | 'my-jobs';

interface ScheduleViewProps {
  projects: SavedProject[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onViewProject: (project: SavedProject) => void;
  onReschedule: (project: SavedProject) => void;
  onComplete: (project: SavedProject) => void;
  onScheduleProject?: (project: SavedProject) => void;
  // Event props
  events?: CalendarEvent[];
  onCreateEvent?: () => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  // User filtering props
  currentUserId?: string;
  onEditTeam?: (project: SavedProject) => void;
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

// Helper to get event type display info
const getEventTypeDisplay = (type: EventType): { label: string; icon: React.ReactNode; color: string } => {
  switch (type) {
    case 'consultation':
      return { label: 'Consultation', icon: <Users className="w-4 h-4" />, color: 'purple' };
    case 'meeting':
      return { label: 'Meeting', icon: <Briefcase className="w-4 h-4" />, color: 'blue' };
    case 'site-visit':
      return { label: 'Site Visit', icon: <Eye className="w-4 h-4" />, color: 'green' };
    case 'follow-up':
      return { label: 'Follow-up', icon: <MessageSquare className="w-4 h-4" />, color: 'orange' };
    case 'service-call':
      return { label: 'Service Call', icon: <CalendarDays className="w-4 h-4" />, color: 'emerald' };
    case 'personal':
      return { label: 'Personal', icon: <Star className="w-4 h-4" />, color: 'pink' };
    case 'other':
    default:
      return { label: 'Other', icon: <Calendar className="w-4 h-4" />, color: 'gray' };
  }
};

// Calendar Component
const CalendarGrid: React.FC<{
  currentMonth: Date;
  selectedDate: Date;
  scheduledDates: Map<string, number>;
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
    const eventCount = scheduledDates.get(dateStr) || 0;
    const hasJobs = eventCount > 0;
    const isPast = date < today;

    days.push(
      <motion.button
        key={day}
        onClick={() => onDateSelect(date)}
        className={`relative h-10 md:h-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200
          ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : isPast ? 'text-gray-600' : 'text-white hover:bg-white/10'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={false}
        animate={isSelected ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {/* Pulsing ring for today */}
        {isToday && !isSelected && (
          <>
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-blue-500/50"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-lg"
              animate={{ boxShadow: ['0 0 0 0 rgba(59,130,246,0)', '0 0 8px 4px rgba(59,130,246,0.3)', '0 0 0 0 rgba(59,130,246,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </>
        )}
        {/* Today indicator dot */}
        {isToday && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <span className={`text-sm md:text-base font-medium relative z-10 ${isSelected ? 'text-white' : ''}`}>{day}</span>
        {/* Glowing event dots with count badge */}
        {hasJobs && (
          <div className="absolute bottom-1 flex items-center gap-0.5">
            <motion.div
              className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#F6B45A]'}`}
              animate={!isSelected ? {
                boxShadow: ['0 0 0 0 rgba(246,180,90,0.4)', '0 0 6px 2px rgba(246,180,90,0.6)', '0 0 0 0 rgba(246,180,90,0.4)']
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {eventCount > 1 && (
              <span className={`text-[8px] font-bold ${isSelected ? 'text-white' : 'text-[#F6B45A]'}`}>
                {eventCount}
              </span>
            )}
          </div>
        )}
      </motion.button>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-2xl p-4 md:p-6 overflow-hidden">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={() => onMonthChange(-1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </motion.button>
        <motion.h3
          key={currentMonth.toISOString()}
          className="text-lg md:text-xl font-semibold text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </motion.h3>
        <motion.button
          onClick={() => onMonthChange(1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
          whileHover={{ scale: 1.1, x: 2 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
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

      {/* Calendar Grid with fade transition on month change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMonth.toISOString()}
          className="grid grid-cols-7 gap-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {days}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Job Card Component
const JobCard: React.FC<{
  project: SavedProject;
  onViewProject: () => void;
  onReschedule: () => void;
  onComplete: () => void;
  onEditTeam?: () => void;
}> = ({ project, onViewProject, onReschedule, onComplete, onEditTeam }) => {
  const schedule = project.schedule;
  if (!schedule) return null;

  const timeSlotInfo = getTimeSlotDisplay(schedule.timeSlot, schedule.customTime);
  const clientName = project.quote?.clientDetails?.name || 'Client';
  const clientPhone = project.quote?.clientDetails?.phone;
  const clientAddress = project.quote?.clientDetails?.address || '';
  const isApproved = project.status === 'approved';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border rounded-xl p-4 space-y-3 ${
        isApproved ? 'border-emerald-500/20' : 'border-white/10'
      }`}
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
              <Home className={`w-4 h-4 ${isApproved ? 'text-emerald-400' : 'text-blue-400'}`} />
              {project.name}
              {isApproved && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                  Approved
                </span>
              )}
            </h4>
            <p className="text-sm text-gray-400">~{schedule.estimatedDuration} hrs</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
          isApproved ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20'
        }`}>
          {timeSlotInfo.icon}
          <span className={`text-xs font-medium ${isApproved ? 'text-emerald-400' : 'text-blue-400'}`}>{timeSlotInfo.time}</span>
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
        <div className={`text-sm text-gray-400 bg-white/5 rounded-lg p-2 border-l-2 ${
          isApproved ? 'border-emerald-500/50' : 'border-blue-500/50'
        }`}>
          {schedule.installationNotes}
        </div>
      )}

      {/* Team Assignment */}
      {project.assignedTo && project.assignedTo.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400">
            {project.assignedTo.length} team member{project.assignedTo.length > 1 ? 's' : ''} assigned
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
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
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isApproved
              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Reschedule
        </motion.button>
        {onEditTeam && (
          <motion.button
            onClick={onEditTeam}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#F6B45A] bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Users className="w-3.5 h-3.5" />
            Edit Team
          </motion.button>
        )}
        {!isApproved && (
          <motion.button
            onClick={onComplete}
            className="flex-1 px-3 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Complete
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// Event Card Component
const EventCard: React.FC<{
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ event, onEdit, onDelete }) => {
  const eventTypeInfo = getEventTypeDisplay(event.eventType);
  const timeSlotInfo = getTimeSlotDisplay(event.timeSlot, event.customTime);

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
    gray: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' },
  };

  const colors = colorClasses[eventTypeInfo.color] || colorClasses.gray;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border ${colors.border} rounded-xl p-4 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
            {eventTypeInfo.icon}
          </div>
          <div>
            <h4 className="font-semibold text-white">{event.title}</h4>
            <p className="text-sm text-gray-400">{eventTypeInfo.label} · ~{event.duration} hr{event.duration !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${colors.bg} border ${colors.border}`}>
          {timeSlotInfo.icon}
          <span className={`text-xs ${colors.text} font-medium`}>{timeSlotInfo.time}</span>
        </div>
      </div>

      {/* Client Info (if present) */}
      {(event.clientName || event.clientPhone) && (
        <div className="space-y-1.5 text-sm">
          {event.clientName && (
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-4 h-4 text-gray-500" />
              {event.clientName}
              {event.clientPhone && (
                <>
                  <span className="text-gray-600">·</span>
                  <a href={`tel:${event.clientPhone}`} className={`${colors.text} hover:underline flex items-center gap-1`}>
                    <Phone className="w-3 h-3" />
                    {event.clientPhone}
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Location */}
      {event.location && (
        <div className="flex items-start gap-2 text-gray-400 text-sm">
          <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{event.location}</span>
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className={`text-sm text-gray-400 bg-white/5 rounded-lg p-2 border-l-2 ${colors.border}`}>
          {event.notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <motion.button
          onClick={onEdit}
          className={`flex-1 px-3 py-2 text-sm font-medium ${colors.text} ${colors.bg} hover:opacity-80 rounded-lg transition-colors flex items-center justify-center gap-2`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </motion.button>
        <motion.button
          onClick={onDelete}
          className="flex-1 px-3 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Trash2 className="w-4 h-4" />
          Delete
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
  onScheduleProject,
  events = [],
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  currentUserId,
  onEditTeam,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Get all scheduled projects (including approved projects that have a schedule)
  const scheduledProjects = useMemo(() => {
    return projects.filter(p => (p.status === 'scheduled' || p.status === 'approved') && p.schedule);
  }, [projects]);

  // Get projects ready to schedule (approved or quoted, no schedule set yet)
  const approvedProjects = useMemo(() => {
    return projects.filter(p => (p.status === 'approved' || p.status === 'quoted') && !p.schedule);
  }, [projects]);

  // Get map of dates with scheduled jobs/events and their counts
  const scheduledDates = useMemo(() => {
    const dates = new Map<string, number>();
    scheduledProjects.forEach(p => {
      if (p.schedule?.scheduledDate) {
        const date = p.schedule.scheduledDate;
        dates.set(date, (dates.get(date) || 0) + 1);
      }
    });
    // Add event dates too
    events.forEach(e => {
      if (e.date) {
        dates.set(e.date, (dates.get(e.date) || 0) + 1);
      }
    });
    return dates;
  }, [scheduledProjects, events]);

  // Get jobs for selected date, filtered by view mode
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const jobsForSelectedDate = useMemo(() => {
    let filtered = scheduledProjects.filter(p => p.schedule?.scheduledDate === selectedDateStr);

    // Filter by user if in "my-jobs" mode
    if (viewMode === 'my-jobs' && currentUserId) {
      filtered = filtered.filter(p => p.assignedTo?.includes(currentUserId));
    }

    return filtered;
  }, [scheduledProjects, selectedDateStr, viewMode, currentUserId]);

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

  // Get events for selected date
  const eventsForSelectedDate = useMemo(() => {
    return events.filter(e => e.date === selectedDateStr);
  }, [events, selectedDateStr]);

  // Group events by time slot
  const eventsByTimeSlot = useMemo(() => {
    const grouped: Record<TimeSlot, CalendarEvent[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      custom: [],
    };
    eventsForSelectedDate.forEach(event => {
      grouped[event.timeSlot].push(event);
    });
    return grouped;
  }, [eventsForSelectedDate]);

  // Check if there's anything scheduled for the selected date
  const hasItemsForSelectedDate = jobsForSelectedDate.length > 0 || eventsForSelectedDate.length > 0;

  const handleMonthChange = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Schedule</h2>
            <p className="text-sm text-gray-400">Manage your installation appointments</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          {currentUserId && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
              <motion.button
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: viewMode === 'all' ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>All Jobs</span>
              </motion.button>
              <motion.button
                onClick={() => setViewMode('my-jobs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'my-jobs'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: viewMode === 'my-jobs' ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Jobs</span>
              </motion.button>
            </div>
          )}

          {onCreateEvent && (
            <motion.button
              onClick={onCreateEvent}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Event</span>
            </motion.button>
          )}
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

          {!hasItemsForSelectedDate ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-2xl p-6"
            >
              {approvedProjects.length > 0 ? (
                // Show quotes/approved jobs that need scheduling
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Ready to Schedule</p>
                      <p className="text-xs text-gray-500">{approvedProjects.length} quote{approvedProjects.length !== 1 ? 's' : ''} waiting for installation date</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {approvedProjects
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(project => {
                        const clientName = project.quote?.clientDetails?.name || project.clientName || 'Client';
                        const quoteValue = project.quote?.total;
                        const isApproved = project.status === 'approved';
                        return (
                          <motion.div
                            key={project.id}
                            className={`flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border ${
                              isApproved ? 'border-emerald-500/20' : 'border-[#F6B45A]/20'
                            }`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {project.image ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                                <img src={project.image} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                                isApproved ? 'bg-emerald-500/10' : 'bg-[#F6B45A]/10'
                              }`}>
                                <Home className={`w-5 h-5 ${isApproved ? 'text-emerald-400' : 'text-[#F6B45A]'}`} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white truncate">{project.name}</p>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  isApproved
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-[#F6B45A]/20 text-[#F6B45A]'
                                }`}>
                                  {isApproved ? 'Approved' : 'Quoted'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 truncate">{clientName}</p>
                              {quoteValue && quoteValue > 0 && (
                                <p className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${
                                  isApproved ? 'text-emerald-400' : 'text-[#F6B45A]'
                                }`}>
                                  <DollarSign className="w-3 h-3" />
                                  {quoteValue.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <motion.button
                              onClick={() => onScheduleProject?.(project)}
                              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                                isApproved
                                  ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                  : 'text-[#F6B45A] bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Schedule
                            </motion.button>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                // Empty state - no quotes to schedule
                <div className="text-center py-6">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-full bg-[#F6B45A]/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-7 h-7 text-[#F6B45A]" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-gray-300 font-medium"
                  >
                    No quotes ready to schedule
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-gray-500 mt-1 max-w-xs mx-auto"
                  >
                    Quotes will appear here once they're sent or approved by clients
                  </motion.p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Morning Section */}
              {(jobsByTimeSlot.morning.length > 0 || eventsByTimeSlot.morning.length > 0) && (
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
                      onEditTeam={onEditTeam ? () => onEditTeam(job) : undefined}
                    />
                  ))}
                  {eventsByTimeSlot.morning.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event.id)}
                    />
                  ))}
                </div>
              )}

              {/* Afternoon Section */}
              {(jobsByTimeSlot.afternoon.length > 0 || eventsByTimeSlot.afternoon.length > 0) && (
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
                      onEditTeam={onEditTeam ? () => onEditTeam(job) : undefined}
                    />
                  ))}
                  {eventsByTimeSlot.afternoon.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event.id)}
                    />
                  ))}
                </div>
              )}

              {/* Evening Section */}
              {(jobsByTimeSlot.evening.length > 0 || eventsByTimeSlot.evening.length > 0) && (
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
                      onEditTeam={onEditTeam ? () => onEditTeam(job) : undefined}
                    />
                  ))}
                  {eventsByTimeSlot.evening.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event.id)}
                    />
                  ))}
                </div>
              )}

              {/* Custom Time Section */}
              {(jobsByTimeSlot.custom.length > 0 || eventsByTimeSlot.custom.length > 0) && (
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
                      onEditTeam={onEditTeam ? () => onEditTeam(job) : undefined}
                    />
                  ))}
                  {eventsByTimeSlot.custom.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event.id)}
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
