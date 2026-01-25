import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Camera,
  Calendar,
  Users,
  Sparkles,
  ArrowRight,
  Plus,
  Lightbulb,
  DollarSign,
  ClipboardList,
} from 'lucide-react';
import { Button } from './Button';

type EmptyStateType = 'projects' | 'schedule' | 'clients' | 'quotes' | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  showTips?: boolean;
  className?: string;
}

// Predefined configurations for common empty states
const presetConfigs: Record<EmptyStateType, {
  title: string;
  description: string;
  icon: React.ElementType;
  actionLabel: string;
  tips?: { icon: React.ElementType; text: string }[];
}> = {
  projects: {
    title: 'No Projects Yet',
    description: 'Create your first project to generate stunning AI lighting designs and professional quotes.',
    icon: FolderOpen,
    actionLabel: 'Create First Project',
    tips: [
      { icon: Camera, text: 'Upload any daytime photo' },
      { icon: Sparkles, text: 'AI generates night lighting' },
      { icon: DollarSign, text: 'Auto-generate pricing quotes' },
    ],
  },
  schedule: {
    title: 'No Scheduled Installs',
    description: 'Once you approve projects, they will appear here for scheduling.',
    icon: Calendar,
    actionLabel: 'View Projects',
    tips: [
      { icon: ClipboardList, text: 'Drag projects to schedule' },
      { icon: Users, text: 'Assign technicians to jobs' },
      { icon: Calendar, text: 'View daily/weekly calendar' },
    ],
  },
  clients: {
    title: 'No Clients Yet',
    description: 'Your clients will appear here as you create and send quotes.',
    icon: Users,
    actionLabel: 'Create Project',
    tips: [
      { icon: Lightbulb, text: 'Clients are added from quotes' },
      { icon: DollarSign, text: 'Track client history & value' },
    ],
  },
  quotes: {
    title: 'No Quotes Generated',
    description: 'Generate a quote from any project with a completed design.',
    icon: DollarSign,
    actionLabel: 'Go to Projects',
  },
  custom: {
    title: 'Nothing here yet',
    description: 'Get started by taking an action.',
    icon: FolderOpen,
    actionLabel: 'Get Started',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'custom',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showTips = true,
  className = '',
}) => {
  const config = presetConfigs[type];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;
  const tips = type !== 'custom' ? config.tips : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 ${className}`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center">
          <Icon className="w-10 h-10 text-gray-500" />
        </div>
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-10 bg-[#F6B45A]/10 blur-2xl rounded-full scale-150 opacity-30" />
      </motion.div>

      {/* Text */}
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
        {displayTitle}
      </h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">
        {displayDescription}
      </p>

      {/* Tips */}
      {showTips && tips && tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-8"
        >
          {tips.map((tip, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-6 h-6 rounded-lg bg-[#F6B45A]/10 flex items-center justify-center">
                <tip.icon className="w-3.5 h-3.5 text-[#F6B45A]" />
              </div>
              <span>{tip.text}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onAction && (
          <Button onClick={onAction}>
            <Plus className="w-4 h-4" />
            {displayActionLabel}
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {secondaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sample data option */}
      {type === 'projects' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-xs text-gray-600"
        >
          New to the platform?{' '}
          <button className="text-[#F6B45A] hover:underline">
            View a sample project
          </button>
        </motion.p>
      )}
    </motion.div>
  );
};

// Specialized empty states for common scenarios
export const ProjectsEmptyState: React.FC<{ onCreateProject: () => void }> = ({ onCreateProject }) => (
  <EmptyState type="projects" onAction={onCreateProject} />
);

export const ScheduleEmptyState: React.FC<{ onViewProjects: () => void }> = ({ onViewProjects }) => (
  <EmptyState type="schedule" onAction={onViewProjects} />
);

export const ClientsEmptyState: React.FC<{ onCreateProject: () => void }> = ({ onCreateProject }) => (
  <EmptyState type="clients" onAction={onCreateProject} />
);

export const QuotesEmptyState: React.FC<{ onGoToProjects: () => void }> = ({ onGoToProjects }) => (
  <EmptyState type="quotes" onAction={onGoToProjects} />
);

export default EmptyState;
