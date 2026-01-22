import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  ChevronRight,
  Calendar,
  Wrench,
  User,
  FileText
} from 'lucide-react';
import { SavedProject } from '../types';

interface TechnicianDashboardProps {
  projects: SavedProject[];
  onMarkComplete: (projectId: string) => void;
  onViewDetails: (projectId: string) => void;
}

interface JobCardProps {
  project: SavedProject;
  timeSlot: string;
  onMarkComplete: () => void;
  onViewDetails: () => void;
  onNavigate: () => void;
  isNext?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({
  project,
  timeSlot,
  onMarkComplete,
  onViewDetails,
  onNavigate,
  isNext = false
}) => {
  const clientName = project.quote?.clientDetails?.name || 'Client';
  const clientPhone = project.quote?.clientDetails?.phone;
  const clientAddress = project.quote?.clientDetails?.address || 'Address not provided';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${
        isNext
          ? 'bg-[#F6B45A]/10 border-[#F6B45A]/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isNext ? 'bg-[#F6B45A]/20' : 'bg-white/5'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isNext ? 'text-[#F6B45A]' : 'text-gray-400'}`} />
          <span className={`text-sm font-semibold ${isNext ? 'text-[#F6B45A]' : 'text-gray-300'}`}>
            {timeSlot}
          </span>
          {isNext && (
            <span className="px-2 py-0.5 rounded-full bg-[#F6B45A] text-black text-[10px] font-bold uppercase">
              Next
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{project.name}</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Client Info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{clientName}</p>
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{clientAddress}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {clientPhone && (
            <a
              href={`tel:${clientPhone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5
                border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">Call</span>
            </a>
          )}
          <button
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/20
              border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span className="text-sm font-medium">Navigate</span>
          </button>
          <button
            onClick={onViewDetails}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5
              border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Details</span>
          </button>
        </div>
      </div>

      {/* Mark Complete Button */}
      {project.status === 'scheduled' && (
        <button
          onClick={onMarkComplete}
          className="w-full py-3 flex items-center justify-center gap-2 bg-emerald-500/20
            border-t border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Mark Complete</span>
        </button>
      )}
    </motion.div>
  );
};

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  projects,
  onMarkComplete,
  onViewDetails
}) => {
  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Filter and sort today's jobs
  const todaysJobs = useMemo(() => {
    return projects
      .filter(p => {
        if (p.status !== 'scheduled' && p.status !== 'approved') return false;
        if (!p.schedule?.scheduledDate) return false;
        return p.schedule.scheduledDate === today;
      })
      .sort((a, b) => {
        // Sort by time slot
        const timeOrder = { morning: 0, afternoon: 1, evening: 2, custom: 3 };
        const aSlot = a.schedule?.timeSlot || 'custom';
        const bSlot = b.schedule?.timeSlot || 'custom';
        return timeOrder[aSlot] - timeOrder[bSlot];
      });
  }, [projects, today]);

  // Get upcoming jobs (next 7 days)
  const upcomingJobs = useMemo(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return projects
      .filter(p => {
        if (p.status !== 'scheduled' && p.status !== 'approved') return false;
        if (!p.schedule?.scheduledDate) return false;
        return p.schedule.scheduledDate > today && p.schedule.scheduledDate <= nextWeekStr;
      })
      .sort((a, b) => {
        const aDate = a.schedule?.scheduledDate || '';
        const bDate = b.schedule?.scheduledDate || '';
        return aDate.localeCompare(bDate);
      })
      .slice(0, 5);
  }, [projects, today]);

  const getTimeSlotDisplay = (project: SavedProject): string => {
    if (!project.schedule) return 'Time TBD';
    const slot = project.schedule.timeSlot;
    if (slot === 'custom' && project.schedule.customTime) {
      return project.schedule.customTime;
    }
    const labels: Record<string, string> = {
      morning: '8:00 AM - 12:00 PM',
      afternoon: '12:00 PM - 5:00 PM',
      evening: '5:00 PM - 8:00 PM'
    };
    return labels[slot] || slot;
  };

  const handleNavigate = (project: SavedProject) => {
    const address = project.quote?.clientDetails?.address;
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
    }
  };

  const completedToday = projects.filter(p =>
    p.status === 'completed' &&
    p.schedule?.scheduledDate === today
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#080808] to-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F6B45A]/20">
              <Wrench className="w-6 h-6 text-[#F6B45A]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">My Jobs</h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 py-3 flex gap-3">
        <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{todaysJobs.length}</p>
          <p className="text-xs text-gray-500">jobs scheduled</p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-500/70 uppercase tracking-wider">Done</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{completedToday}</p>
          <p className="text-xs text-gray-500">completed</p>
        </div>
      </div>

      {/* Today's Jobs */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Today's Schedule
        </h2>

        {todaysJobs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No jobs scheduled for today</p>
            <p className="text-sm text-gray-500 mt-1">Enjoy your day off!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysJobs.map((project, index) => (
              <JobCard
                key={project.id}
                project={project}
                timeSlot={getTimeSlotDisplay(project)}
                isNext={index === 0}
                onMarkComplete={() => onMarkComplete(project.id)}
                onViewDetails={() => onViewDetails(project.id)}
                onNavigate={() => handleNavigate(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Jobs */}
      {upcomingJobs.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Coming Up
          </h2>
          <div className="space-y-2">
            {upcomingJobs.map((project) => {
              const scheduleDate = new Date(project.schedule!.scheduledDate + 'T00:00:00');
              const dayName = scheduleDate.toLocaleDateString('en-US', { weekday: 'short' });
              const dateStr = scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <button
                  key={project.id}
                  onClick={() => onViewDetails(project.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10
                    hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500 uppercase">{dayName}</span>
                    <span className="text-sm font-bold text-white">{dateStr.split(' ')[1]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {project.quote?.clientDetails?.name || project.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {getTimeSlotDisplay(project)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;
