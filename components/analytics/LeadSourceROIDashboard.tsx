import React from 'react';
import { TrendingUp, DollarSign, Users, Target, Award } from 'lucide-react';
import { LeadSourceMetrics } from '../../types';
import { KPICard, KPICardGrid } from './KPICard';

interface LeadSourceROIDashboardProps {
  metrics: LeadSourceMetrics;
}

const sourceLabels: Record<string, string> = {
  google: 'Google Ads',
  referral: 'Referrals',
  angi: 'Angi/HomeAdvisor',
  thumbtack: 'Thumbtack',
  website: 'Website',
  social: 'Social Media',
  yard_sign: 'Yard Signs',
  other: 'Other'
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

const formatROI = (roi: number): string => {
  if (roi === Infinity) return '∞';
  if (roi >= 1000) return `${(roi / 1000).toFixed(1)}K%`;
  return `${Math.round(roi)}%`;
};

export const LeadSourceROIDashboard: React.FC<LeadSourceROIDashboardProps> = ({ metrics }) => {
  // Sort by ROI descending
  const sortedSources = [...metrics.bySource].sort((a, b) => {
    if (a.roi === Infinity) return -1;
    if (b.roi === Infinity) return 1;
    return b.roi - a.roi;
  });

  if (metrics.bySource.length === 0) {
    return (
      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
        <Target className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No lead source data yet</p>
        <p className="text-xs text-gray-600 mt-1">Add clients with lead sources to track ROI</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Target className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Lead Source ROI Tracking</h2>
          <p className="text-xs text-gray-500">Marketing performance by acquisition channel</p>
        </div>
      </div>

      {/* Overall KPIs */}
      <KPICardGrid columns={4}>
        <KPICard
          title="Total Marketing Spend"
          value={metrics.totalMarketingSpend}
          prefix="$"
          icon={DollarSign}
          iconColor="text-red-400"
        />
        <KPICard
          title="Revenue from Tracked Leads"
          value={metrics.totalRevenueFromTracked}
          prefix="$"
          icon={TrendingUp}
          iconColor="text-emerald-400"
        />
        <KPICard
          title="Overall ROI"
          value={metrics.overallROI >= 1000 ? `${(metrics.overallROI / 1000).toFixed(1)}K` : Math.round(metrics.overallROI)}
          suffix={metrics.overallROI < 1000 ? '%' : '%'}
          icon={Award}
          iconColor="text-purple-400"
          variant={metrics.overallROI > 200 ? 'success' : metrics.overallROI > 100 ? 'warning' : metrics.overallROI > 0 ? 'default' : 'danger'}
        />
        <KPICard
          title="Total Tracked Leads"
          value={metrics.bySource.reduce((sum, s) => sum + s.totalLeads, 0)}
          icon={Users}
          iconColor="text-blue-400"
        />
      </KPICardGrid>

      {/* Lead Source Performance Table */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
            Performance by Source
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                <th className="text-left p-3">Source</th>
                <th className="text-right p-3">Leads</th>
                <th className="text-right p-3">Converted</th>
                <th className="text-right p-3">Conv. Rate</th>
                <th className="text-right p-3">Revenue</th>
                <th className="text-right p-3">Cost</th>
                <th className="text-right p-3">ROI</th>
                <th className="text-right p-3">Cost/Lead</th>
                <th className="text-right p-3">CPA</th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.map((source) => (
                <tr key={source.source} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {sourceLabels[source.source] || source.source}
                      </span>
                      {source.source === metrics.topPerformingSource && (
                        <Award className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </td>
                  <td className="text-right p-3 text-sm text-gray-300">{source.totalLeads}</td>
                  <td className="text-right p-3 text-sm text-gray-300">{source.convertedLeads}</td>
                  <td className="text-right p-3 text-sm text-gray-300">{source.conversionRate.toFixed(1)}%</td>
                  <td className="text-right p-3 text-sm text-emerald-400 font-medium">
                    {formatCurrency(source.totalRevenue)}
                  </td>
                  <td className="text-right p-3 text-sm text-red-400">
                    {formatCurrency(source.totalMarketingCost)}
                  </td>
                  <td className="text-right p-3">
                    <span className={`text-sm font-bold ${
                      source.roi === Infinity ? 'text-emerald-400' :
                      source.roi > 200 ? 'text-emerald-400' :
                      source.roi > 100 ? 'text-yellow-400' :
                      source.roi > 0 ? 'text-gray-300' :
                      'text-red-400'
                    }`}>
                      {formatROI(source.roi)}
                    </span>
                  </td>
                  <td className="text-right p-3 text-sm text-gray-300">
                    ${source.costPerLead.toFixed(2)}
                  </td>
                  <td className="text-right p-3 text-sm text-gray-300">
                    {source.costPerAcquisition > 0 ? `$${source.costPerAcquisition.toFixed(2)}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-400 mb-1">Best Performing Source</h4>
              <p className="text-xs text-gray-300">
                {sourceLabels[metrics.topPerformingSource]} is your highest ROI channel
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-400 mb-1">Lowest Cost Per Acquisition</h4>
              <p className="text-xs text-gray-300">
                {sourceLabels[metrics.lowestCostPerAcquisition]} has the best CPA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
