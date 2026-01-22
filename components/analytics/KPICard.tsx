import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number; // Percentage change
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-gray-400',
  trend,
  prefix = '',
  suffix = '',
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'bg-white/5 border-white/10',
    success: 'bg-emerald-500/10 border-emerald-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    danger: 'bg-red-500/10 border-red-500/30'
  };

  const valueColors = {
    default: 'text-white',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400'
  };

  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    if (trend > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === null) return 'text-gray-500';
    if (trend > 0) return 'text-emerald-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{title}</p>
        {Icon && (
          <div className={`p-1.5 rounded-lg bg-white/5 ${iconColor}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className={`text-2xl font-bold ${valueColors[variant]}`}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface KPICardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const KPICardGrid: React.FC<KPICardGridProps> = ({ children, columns = 4 }) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-3`}>
      {children}
    </div>
  );
};
