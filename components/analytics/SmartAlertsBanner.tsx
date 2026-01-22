import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  X,
  ChevronRight,
  Bell,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  MapPin
} from 'lucide-react';
import { SmartAlert, AlertType } from '../../types';

interface SmartAlertsBannerProps {
  alerts: SmartAlert[];
  onDismiss?: (alertId: string) => void;
  onAlertClick?: (alert: SmartAlert) => void;
  maxVisible?: number;
}

const alertConfig: Record<AlertType, {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
}> = {
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-200'
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-200'
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-200'
  },
  danger: {
    icon: <XCircle className="w-5 h-5" />,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    textColor: 'text-red-200'
  }
};

const getMetricIcon = (metric: string): React.ReactNode => {
  if (metric.includes('revenue') || metric.includes('ar')) return <DollarSign className="w-4 h-4" />;
  if (metric.includes('conversion')) return <TrendingDown className="w-4 h-4" />;
  if (metric.includes('goal')) return <TrendingUp className="w-4 h-4" />;
  if (metric.includes('overdue')) return <Clock className="w-4 h-4" />;
  return <Info className="w-4 h-4" />;
};

interface AlertCardProps {
  alert: SmartAlert;
  onDismiss?: () => void;
  onClick?: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onDismiss, onClick }) => {
  const config = alertConfig[alert.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative p-4 rounded-xl ${config.bgColor} border ${config.borderColor} cursor-pointer
        hover:bg-white/5 transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={config.iconColor}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${config.textColor}`}>{alert.title}</h4>
            {alert.locationName && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                {alert.locationName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{alert.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`flex items-center gap-1 text-xs ${config.iconColor}`}>
              {getMetricIcon(alert.metric)}
              <span className="capitalize">{alert.metric.replace(/_/g, ' ')}</span>
            </span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500">
              {new Date(alert.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-600" />
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-white" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const SmartAlertsBanner: React.FC<SmartAlertsBannerProps> = ({
  alerts,
  onDismiss,
  onAlertClick,
  maxVisible = 3
}) => {
  const [showAll, setShowAll] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.isRead);
  const visibleAlerts = showAll ? unreadAlerts : unreadAlerts.slice(0, maxVisible);
  const hiddenCount = unreadAlerts.length - maxVisible;

  if (unreadAlerts.length === 0) {
    return null;
  }

  // Group alerts by type for summary
  const alertCounts = {
    danger: unreadAlerts.filter(a => a.type === 'danger').length,
    warning: unreadAlerts.filter(a => a.type === 'warning').length,
    success: unreadAlerts.filter(a => a.type === 'success').length,
    info: unreadAlerts.filter(a => a.type === 'info').length
  };

  return (
    <div className="space-y-3">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#F6B45A]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Smart Alerts</h3>
          <span className="px-2 py-0.5 text-xs font-medium text-white bg-[#F6B45A]/20 rounded-full">
            {unreadAlerts.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {alertCounts.danger > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-red-400 bg-red-500/10 rounded-full">
              <XCircle className="w-3 h-3" />
              {alertCounts.danger}
            </span>
          )}
          {alertCounts.warning > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-amber-400 bg-amber-500/10 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {alertCounts.warning}
            </span>
          )}
          {alertCounts.success > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-full">
              <CheckCircle className="w-3 h-3" />
              {alertCounts.success}
            </span>
          )}
        </div>
      </div>

      {/* Alert cards */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={onDismiss ? () => onDismiss(alert.id) : undefined}
              onClick={onAlertClick ? () => onAlertClick(alert) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Show more/less toggle */}
      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors
            border border-dashed border-white/10 rounded-xl hover:border-white/20"
        >
          Show {hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
        </button>
      )}
      {showAll && unreadAlerts.length > maxVisible && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors
            border border-dashed border-white/10 rounded-xl hover:border-white/20"
        >
          Show less
        </button>
      )}
    </div>
  );
};

// Helper function to generate alerts from metrics (for use in hooks)
export const generateSmartAlerts = (
  locationMetrics: { locationId: string; locationName: string; trend: number; conversionRate: number; revenue: number; revenueTarget?: number }[],
  arAging: { days60: number; days90Plus: number },
  thresholds = {
    trendDropThreshold: -10,
    conversionDropThreshold: 50,
    arAgingWarningDays60: 5000,
    arAgingDangerDays90: 2000,
    goalCompletionThreshold: 100
  }
): SmartAlert[] => {
  const alerts: SmartAlert[] = [];
  const now = new Date().toISOString();

  // Check each location's metrics
  locationMetrics.forEach(loc => {
    // Trend drop alert
    if (loc.trend <= thresholds.trendDropThreshold) {
      alerts.push({
        id: `trend-${loc.locationId}`,
        type: 'warning',
        title: 'Performance Declining',
        message: `${loc.locationName} is down ${Math.abs(loc.trend)}% compared to last period`,
        locationId: loc.locationId,
        locationName: loc.locationName,
        metric: 'revenue_trend',
        value: loc.trend,
        threshold: thresholds.trendDropThreshold,
        createdAt: now,
        isRead: false
      });
    }

    // Conversion rate alert
    if (loc.conversionRate < thresholds.conversionDropThreshold) {
      alerts.push({
        id: `conv-${loc.locationId}`,
        type: 'warning',
        title: 'Low Conversion Rate',
        message: `${loc.locationName} conversion rate is at ${loc.conversionRate}%`,
        locationId: loc.locationId,
        locationName: loc.locationName,
        metric: 'conversion_rate',
        value: loc.conversionRate,
        threshold: thresholds.conversionDropThreshold,
        createdAt: now,
        isRead: false
      });
    }

    // Goal hit alert
    if (loc.revenueTarget && loc.revenue >= loc.revenueTarget) {
      alerts.push({
        id: `goal-${loc.locationId}`,
        type: 'success',
        title: 'Goal Achieved!',
        message: `${loc.locationName} hit their revenue target early!`,
        locationId: loc.locationId,
        locationName: loc.locationName,
        metric: 'goal_completion',
        value: (loc.revenue / loc.revenueTarget) * 100,
        threshold: thresholds.goalCompletionThreshold,
        createdAt: now,
        isRead: false
      });
    }
  });

  // AR aging alerts
  if (arAging.days60 > thresholds.arAgingWarningDays60) {
    alerts.push({
      id: 'ar-60',
      type: 'warning',
      title: 'AR Aging Warning',
      message: `$${arAging.days60.toLocaleString()} in receivables are 61-90 days overdue`,
      metric: 'ar_aging_60',
      value: arAging.days60,
      threshold: thresholds.arAgingWarningDays60,
      createdAt: now,
      isRead: false
    });
  }

  if (arAging.days90Plus > thresholds.arAgingDangerDays90) {
    alerts.push({
      id: 'ar-90',
      type: 'danger',
      title: 'AR Critical',
      message: `$${arAging.days90Plus.toLocaleString()} in receivables are 90+ days overdue`,
      metric: 'ar_aging_90plus',
      value: arAging.days90Plus,
      threshold: thresholds.arAgingDangerDays90,
      createdAt: now,
      isRead: false
    });
  }

  // Sort by severity (danger first, then warning, then success, then info)
  const severityOrder: Record<AlertType, number> = { danger: 0, warning: 1, success: 2, info: 3 };
  alerts.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);

  return alerts;
};
