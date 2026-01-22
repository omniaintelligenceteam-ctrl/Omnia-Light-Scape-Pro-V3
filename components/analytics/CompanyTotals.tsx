import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FolderCheck,
  Clock,
  FileText,
  AlertTriangle,
  Users,
  MapPin,
  Percent,
  Building2
} from 'lucide-react';
import { CompanyMetrics, ARAgingBuckets } from '../../types';

interface CompanyTotalsProps {
  metrics: CompanyMetrics;
  isLoading?: boolean;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatPercentage = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'gold' | 'emerald' | 'red' | 'blue' | 'purple';
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color = 'gold',
  delay = 0
}) => {
  const colorClasses = {
    gold: 'from-[#F6B45A]/20 to-[#F6B45A]/5 border-[#F6B45A]/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30'
  };

  const iconColorClasses = {
    gold: 'text-[#F6B45A]',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={`relative p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg bg-white/5 ${iconColorClasses[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{formatPercentage(trend)}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
      {trendLabel && (
        <p className="text-xs text-gray-500 mt-1">{trendLabel}</p>
      )}
    </motion.div>
  );
};

interface ARAgingDisplayProps {
  buckets: ARAgingBuckets;
  total: number;
}

const ARAgingDisplay: React.FC<ARAgingDisplayProps> = ({ buckets, total }) => {
  const getPercentage = (value: number) => total > 0 ? (value / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">AR Aging</h3>
        <span className="ml-auto text-sm font-bold text-white">{formatCurrency(total)}</span>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-white/5">
        {buckets.current > 0 && (
          <div
            className="bg-emerald-500 h-full"
            style={{ width: `${getPercentage(buckets.current)}%` }}
            title={`Current: ${formatCurrency(buckets.current)}`}
          />
        )}
        {buckets.days30 > 0 && (
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${getPercentage(buckets.days30)}%` }}
            title={`31-60 days: ${formatCurrency(buckets.days30)}`}
          />
        )}
        {buckets.days60 > 0 && (
          <div
            className="bg-orange-500 h-full"
            style={{ width: `${getPercentage(buckets.days60)}%` }}
            title={`61-90 days: ${formatCurrency(buckets.days60)}`}
          />
        )}
        {buckets.days90Plus > 0 && (
          <div
            className="bg-red-500 h-full"
            style={{ width: `${getPercentage(buckets.days90Plus)}%` }}
            title={`90+ days: ${formatCurrency(buckets.days90Plus)}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-gray-400">Current (0-30d)</span>
          <span className="ml-auto text-white font-medium">{formatCurrency(buckets.current)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span className="text-gray-400">31-60 days</span>
          <span className="ml-auto text-white font-medium">{formatCurrency(buckets.days30)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span className="text-gray-400">61-90 days</span>
          <span className="ml-auto text-white font-medium">{formatCurrency(buckets.days60)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-gray-400">90+ days</span>
          <span className="ml-auto text-white font-medium">{formatCurrency(buckets.days90Plus)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export const CompanyTotals: React.FC<CompanyTotalsProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-5 h-5 text-[#F6B45A]" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Company Overview</h2>
        <span className="ml-auto text-xs text-gray-500">
          {metrics.locationCount} locations • {metrics.technicianCount} technicians
        </span>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue YTD"
          value={formatCurrency(metrics.totalRevenueYTD)}
          icon={<DollarSign className="w-5 h-5" />}
          trend={metrics.yoyGrowth}
          trendLabel="vs last year"
          color="gold"
          delay={0}
        />
        <MetricCard
          title="Jobs Completed"
          value={metrics.totalJobsCompleted.toLocaleString()}
          icon={<FolderCheck className="w-5 h-5" />}
          color="emerald"
          delay={1}
        />
        <MetricCard
          title="Active Pipeline"
          value={metrics.totalActiveProjects.toLocaleString()}
          subtitle={`${metrics.totalQuotesPending} quotes pending`}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          delay={2}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.companyConversionRate}%`}
          icon={<Percent className="w-5 h-5" />}
          color="purple"
          delay={3}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="This Month"
          value={formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          color="gold"
          delay={4}
        />
        <MetricCard
          title="Avg Project Value"
          value={formatCurrency(metrics.avgProjectValue)}
          icon={<FileText className="w-5 h-5" />}
          color="emerald"
          delay={5}
        />
        <MetricCard
          title="Locations"
          value={metrics.locationCount.toString()}
          icon={<MapPin className="w-5 h-5" />}
          color="blue"
          delay={6}
        />
        <MetricCard
          title="Technicians"
          value={metrics.technicianCount.toString()}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          delay={7}
        />
      </div>

      {/* AR Aging */}
      <ARAgingDisplay
        buckets={metrics.arAgingBuckets}
        total={metrics.totalOutstandingAR}
      />
    </div>
  );
};
