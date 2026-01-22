import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, PieChart, ArrowRight } from 'lucide-react';
import { CashFlowForecast } from '../../types';
import { KPICard, KPICardGrid } from './KPICard';

interface CashFlowDashboardProps {
  forecast: CashFlowForecast;
}

type ForecastPeriod = '30' | '60' | '90';

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const CashFlowDashboard: React.FC<CashFlowDashboardProps> = ({ forecast }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ForecastPeriod>('30');

  const getProjections = () => {
    switch (selectedPeriod) {
      case '30':
        return forecast.projections30Day;
      case '60':
        return forecast.projections60Day;
      case '90':
        return forecast.projections90Day;
    }
  };

  const getProjectedCollections = () => {
    switch (selectedPeriod) {
      case '30':
        return forecast.projectedCollections30Day;
      case '60':
        return forecast.projectedCollections60Day;
      case '90':
        return forecast.projectedCollections90Day;
    }
  };

  const projections = getProjections();
  const projectedCollections = getProjectedCollections();

  // Check if we have any data
  const hasData = forecast.totalOutstandingAR > 0 || projectedCollections > 0;

  if (!hasData) {
    return (
      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
        <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No cash flow data yet</p>
        <p className="text-xs text-gray-600 mt-1">Send invoices and schedule projects to see forecasts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cash Flow Forecasting</h2>
            <p className="text-xs text-gray-500">Predictive revenue analysis with DSO tracking</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['30', '60', '90'] as ForecastPeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === period
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {period} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <KPICardGrid columns={4}>
        <KPICard
          title="Outstanding AR"
          value={forecast.totalOutstandingAR}
          prefix="$"
          icon={DollarSign}
          iconColor="text-yellow-400"
        />
        <KPICard
          title={`Projected Collections (${selectedPeriod}d)`}
          value={projectedCollections}
          prefix="$"
          icon={TrendingUp}
          iconColor="text-emerald-400"
        />
        <KPICard
          title="Current DSO"
          value={forecast.dsoMetrics.currentDSO}
          suffix=" days"
          icon={Clock}
          iconColor="text-purple-400"
          variant={
            forecast.dsoMetrics.currentDSO <= 30 ? 'success' :
            forecast.dsoMetrics.currentDSO <= 45 ? 'warning' : 'danger'
          }
        />
        <KPICard
          title="Avg Payment Delay"
          value={Math.round(forecast.paymentPatterns.averagePaymentDelay)}
          suffix=" days"
          icon={Calendar}
          iconColor="text-blue-400"
        />
      </KPICardGrid>

      {/* Payment Patterns Breakdown */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
            Payment Pattern Analysis
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-emerald-400">
              {forecast.paymentPatterns.percentPaidOnTime.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">Paid On Time</div>
            <div className="text-xs text-gray-600">≤30 days</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-yellow-400">
              {forecast.paymentPatterns.percentPaid30Days.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">30-60 Days</div>
            <div className="text-xs text-gray-600">Slightly late</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-orange-400">
              {forecast.paymentPatterns.percentPaid60Days.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">60-90 Days</div>
            <div className="text-xs text-gray-600">Late payment</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-red-400">
              {forecast.paymentPatterns.percentPaid90Plus.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">90+ Days</div>
            <div className="text-xs text-gray-600">Very late</div>
          </div>
        </div>
      </div>

      {/* Weekly Projections Table */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
            Weekly Cash Flow Projections
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                <th className="text-left p-3">Week Starting</th>
                <th className="text-right p-3">Inflow</th>
                <th className="text-right p-3">Outflow</th>
                <th className="text-right p-3">Net</th>
                <th className="text-right p-3">Cumulative</th>
                <th className="text-center p-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((proj, index) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div className="text-sm font-medium text-white">
                      {formatDate(proj.period)}
                    </div>
                  </td>
                  <td className="text-right p-3 text-sm text-emerald-400 font-medium">
                    {formatCurrency(proj.expectedInflow)}
                  </td>
                  <td className="text-right p-3 text-sm text-red-400">
                    {formatCurrency(proj.expectedOutflow)}
                  </td>
                  <td className="text-right p-3">
                    <span className={`text-sm font-bold ${
                      proj.netCashFlow > 0 ? 'text-emerald-400' :
                      proj.netCashFlow < 0 ? 'text-red-400' :
                      'text-gray-300'
                    }`}>
                      {formatCurrency(proj.netCashFlow)}
                    </span>
                  </td>
                  <td className="text-right p-3 text-sm font-semibold text-white">
                    {formatCurrency(proj.cumulativeCashFlow)}
                  </td>
                  <td className="text-center p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      proj.confidence === 'high' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' :
                      proj.confidence === 'medium' ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' :
                      'bg-gray-500/20 border border-gray-500/30 text-gray-400'
                    }`}>
                      {proj.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DSO Trend */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl p-4 border ${
          forecast.dsoMetrics.trend === 'improving'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : forecast.dsoMetrics.trend === 'worsening'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-start gap-3">
            {forecast.dsoMetrics.trend === 'improving' ? (
              <TrendingDown className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : forecast.dsoMetrics.trend === 'worsening' ? (
              <TrendingUp className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ArrowRight className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className={`text-sm font-bold mb-1 ${
                forecast.dsoMetrics.trend === 'improving' ? 'text-emerald-400' :
                forecast.dsoMetrics.trend === 'worsening' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                DSO Trend: {forecast.dsoMetrics.trend === 'improving' ? 'Improving' :
                           forecast.dsoMetrics.trend === 'worsening' ? 'Worsening' : 'Stable'}
              </h4>
              <p className="text-xs text-gray-300">
                Current DSO: {forecast.dsoMetrics.currentDSO} days vs Average: {forecast.dsoMetrics.averageDSO} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-400 mb-1">Payment Speed</h4>
              <p className="text-xs text-gray-300">
                Median: {Math.round(forecast.paymentPatterns.medianPaymentDelay)} days |
                Average: {Math.round(forecast.paymentPatterns.averagePaymentDelay)} days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DSO History Chart */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/10 p-6">
        <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
          DSO Trend (Last 6 Months)
        </h3>

        <div className="space-y-3">
          {forecast.dsoMetrics.dsoByMonth.map((monthData, index) => {
            const maxDSO = Math.max(...forecast.dsoMetrics.dsoByMonth.map(m => m.dso));
            const widthPercent = (monthData.dso / maxDSO) * 100;

            return (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-xs text-gray-400 font-medium">{monthData.month}</div>
                <div className="flex-1 bg-white/5 rounded-full h-8 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500/50 to-blue-500/30 rounded-full transition-all duration-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-xs font-bold text-white">{monthData.dso} days</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
