import React from 'react';
import { GoalProgress } from '../../types';
import { Target, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface GoalTrackerProps {
  goalProgress: GoalProgress;
  compact?: boolean;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({ goalProgress, compact = false }) => {
  const { goal, currentValue, progress, daysRemaining, onTrack } = goalProgress;

  const getGoalLabel = () => {
    switch (goal.goalType) {
      case 'revenue':
        return goal.periodType === 'monthly' ? 'Monthly Revenue' : 'Yearly Revenue';
      case 'projects_completed':
        return 'Projects Completed';
      case 'new_clients':
        return 'New Clients';
      default:
        return 'Goal';
    }
  };

  const formatValue = (value: number) => {
    if (goal.goalType === 'revenue') {
      return `$${value.toLocaleString()}`;
    }
    return value.toString();
  };

  const getStatusColor = () => {
    if (progress >= 100) return 'emerald';
    if (onTrack) return 'blue';
    if (progress >= 50) return 'amber';
    return 'red';
  };

  const statusColor = getStatusColor();

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bgLight: 'bg-emerald-500/10'
    },
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      bgLight: 'bg-blue-500/10'
    },
    amber: {
      bg: 'bg-amber-500',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      bgLight: 'bg-amber-500/10'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-400',
      border: 'border-red-500/30',
      bgLight: 'bg-red-500/10'
    }
  };

  const colors = colorClasses[statusColor];

  if (compact) {
    return (
      <div className={`p-3 rounded-xl border ${colors.border} ${colors.bgLight}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">{getGoalLabel()}</span>
          <span className={`text-xs font-bold ${colors.text}`}>{progress}%</span>
        </div>
        <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bg} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className={colors.text}>{formatValue(currentValue)}</span>
          <span className="text-gray-500">/ {formatValue(goal.targetValue)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${colors.border} ${colors.bgLight}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.bg}/20`}>
            <Target className={`w-4 h-4 ${colors.text}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{getGoalLabel()}</h4>
            <p className="text-xs text-gray-500">
              {goal.periodType === 'monthly' && goal.month
                ? new Date(goal.year, goal.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
                : goal.year}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${colors.text}`}>{progress}%</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {onTrack ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span>{onTrack ? 'On track' : 'Behind'}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bg} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className={`font-bold ${colors.text}`}>{formatValue(currentValue)}</span>
          <span className="text-gray-500"> / {formatValue(goal.targetValue)}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{daysRemaining} days left</span>
        </div>
      </div>
    </div>
  );
};

interface GoalTrackerGridProps {
  goals: GoalProgress[];
  compact?: boolean;
}

export const GoalTrackerGrid: React.FC<GoalTrackerGridProps> = ({ goals, compact = false }) => {
  if (goals.length === 0) {
    return (
      <div className="p-6 text-center bg-white/5 rounded-xl border border-white/10">
        <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No goals set</p>
        <p className="text-xs text-gray-600 mt-1">Set goals in Settings to track progress</p>
      </div>
    );
  }

  return (
    <div className={`grid ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'} gap-3`}>
      {goals.map((gp) => (
        <GoalTracker key={gp.goal.id} goalProgress={gp} compact={compact} />
      ))}
    </div>
  );
};
