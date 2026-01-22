import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, FileText, Users } from 'lucide-react';

export interface ComparisonData {
  current: {
    revenue: number;
    projects: number;
    clients: number;
    label: string;
  };
  previous: {
    revenue: number;
    projects: number;
    clients: number;
    label: string;
  };
}

interface ComparisonViewProps {
  data: ComparisonData;
}

interface MetricComparisonProps {
  title: string;
  currentValue: number;
  previousValue: number;
  icon: React.ReactNode;
  iconColor: string;
  format?: 'currency' | 'number';
}

const MetricComparison: React.FC<MetricComparisonProps> = ({
  title,
  currentValue,
  previousValue,
  icon,
  iconColor,
  format = 'number'
}) => {
  const change = currentValue - previousValue;
  const percentChange = previousValue > 0 ? (change / previousValue) * 100 : 0;

  const formatValue = (value: number): string => {
    if (format === 'currency') {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
      }
      return `$${Math.round(value).toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-emerald-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getTrendBgColor = () => {
    if (change > 0) return 'bg-emerald-500/10 border-emerald-500/30';
    if (change < 0) return 'bg-red-500/10 border-red-500/30';
    return 'bg-gray-500/10 border-gray-500/30';
  };

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-${iconColor.split('-')[1]}-500/10 border border-${iconColor.split('-')[1]}-500/30`}>
          {icon}
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {title}
        </div>
      </div>

      <div className="space-y-3">
        {/* Current Value */}
        <div>
          <div className="text-2xl font-bold text-white">
            {formatValue(currentValue)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Current period</div>
        </div>

        {/* Change Indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getTrendBgColor()}`}>
          <div className={getTrendColor()}>
            {getTrendIcon()}
          </div>
          <div className="flex-1">
            <div className={`text-sm font-bold ${getTrendColor()}`}>
              {change > 0 && '+'}{formatValue(Math.abs(change))}
            </div>
            <div className="text-xs text-gray-400">
              {percentChange > 0 && '+'}{percentChange.toFixed(1)}% vs previous
            </div>
          </div>
        </div>

        {/* Previous Value */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-sm text-gray-400">
            Previous: {formatValue(previousValue)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Period Comparison</h3>
          <p className="text-xs text-gray-500 mt-1">
            {data.current.label} vs {data.previous.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricComparison
          title="Revenue"
          currentValue={data.current.revenue}
          previousValue={data.previous.revenue}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          iconColor="text-emerald-400"
          format="currency"
        />

        <MetricComparison
          title="Projects"
          currentValue={data.current.projects}
          previousValue={data.previous.projects}
          icon={<FileText className="w-4 h-4 text-blue-400" />}
          iconColor="text-blue-400"
          format="number"
        />

        <MetricComparison
          title="New Clients"
          currentValue={data.current.clients}
          previousValue={data.previous.clients}
          icon={<Users className="w-4 h-4 text-purple-400" />}
          iconColor="text-purple-400"
          format="number"
        />
      </div>

      {/* Summary Insights */}
      <div className="bg-white/[0.02] rounded-xl border border-white/10 p-4">
        <h4 className="text-sm font-bold text-white mb-3">Insights</h4>

        <div className="space-y-2">
          {data.current.revenue > data.previous.revenue ? (
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300">
                Revenue is <span className="text-emerald-400 font-semibold">up {(((data.current.revenue - data.previous.revenue) / data.previous.revenue) * 100).toFixed(1)}%</span> compared to the previous period.
              </p>
            </div>
          ) : data.current.revenue < data.previous.revenue ? (
            <div className="flex items-start gap-2 text-sm">
              <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300">
                Revenue is <span className="text-red-400 font-semibold">down {(((data.previous.revenue - data.current.revenue) / data.previous.revenue) * 100).toFixed(1)}%</span> compared to the previous period.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm">
              <Minus className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300">
                Revenue remained <span className="text-gray-400 font-semibold">stable</span> compared to the previous period.
              </p>
            </div>
          )}

          {data.current.projects > data.previous.projects && (
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300">
                Completed <span className="text-blue-400 font-semibold">{data.current.projects - data.previous.projects} more projects</span> than the previous period.
              </p>
            </div>
          )}

          {data.current.clients > data.previous.clients && (
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300">
                Acquired <span className="text-purple-400 font-semibold">{data.current.clients - data.previous.clients} new clients</span> during this period.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
