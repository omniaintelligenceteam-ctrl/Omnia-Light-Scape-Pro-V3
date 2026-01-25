import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ExecutiveDashboard } from '../../analytics/ExecutiveDashboard';
import { AnalyticsDashboard } from '../../analytics/AnalyticsDashboard';
import { LeadSourceROIDashboard } from '../../analytics/LeadSourceROIDashboard';
import { CashFlowDashboard } from '../../analytics/CashFlowDashboard';
import { BusinessHealthScore } from '../../analytics/BusinessHealthScore';
import { PipelineForecast } from '../../analytics/PipelineForecast';
import { TeamPerformanceMatrix } from '../../analytics/TeamPerformanceMatrix';
import { CapacityDashboard } from '../../analytics/CapacityDashboard';
import { Technician } from '../../../types';

interface PipelineAnalytics {
  revenueThisMonth: number;
  pendingRevenue: number;
  overdueRevenue: number;
  avgQuoteValue: number;
  draftToQuotedRate: number;
  quotedToApprovedRate: number;
  approvedToCompletedRate: number;
}

interface AnalyticsSectionProps {
  analyticsMetrics?: any;
  leadSourceROI?: any;
  cashFlowForecast?: any;
  locationMetrics?: any;
  technicianMetrics?: any;
  companyMetrics?: any;
  technicians?: Technician[];
  pipelineAnalytics?: PipelineAnalytics;
  businessHealthData?: any;
  pipelineForecastData?: any;
  teamPerformanceData?: any;
  capacityPlanningData?: any;
  onViewProject?: (projectId: string) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  analyticsMetrics,
  leadSourceROI,
  cashFlowForecast,
  locationMetrics,
  technicianMetrics,
  companyMetrics,
  technicians = [],
  pipelineAnalytics,
  businessHealthData,
  pipelineForecastData,
  teamPerformanceData,
  capacityPlanningData,
  onViewProject
}) => {
  return (
    <motion.div
      key="analytics"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        View comprehensive analytics, metrics, and insights for your business.
      </p>

      {/* Pipeline Stats Grid */}
      {pipelineAnalytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Revenue This Month */}
            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500/70 mb-1">Paid This Month</p>
              <p className="text-xl font-bold text-emerald-400">${pipelineAnalytics.revenueThisMonth.toLocaleString()}</p>
            </div>

            {/* Pending Revenue */}
            <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <p className="text-[10px] uppercase tracking-wider text-blue-500/70 mb-1">Pending</p>
              <p className="text-xl font-bold text-blue-400">${pipelineAnalytics.pendingRevenue.toLocaleString()}</p>
            </div>

            {/* Overdue */}
            <div className={`p-3 rounded-xl border ${pipelineAnalytics.overdueRevenue > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-white/[0.02] border-white/5'}`}>
              <p className={`text-[10px] uppercase tracking-wider mb-1 ${pipelineAnalytics.overdueRevenue > 0 ? 'text-red-500/70' : 'text-gray-500'}`}>Overdue</p>
              <p className={`text-xl font-bold ${pipelineAnalytics.overdueRevenue > 0 ? 'text-red-400' : 'text-gray-600'}`}>${pipelineAnalytics.overdueRevenue.toLocaleString()}</p>
            </div>

            {/* Avg Quote Value */}
            <div className="p-3 bg-[#F6B45A]/5 rounded-xl border border-[#F6B45A]/10">
              <p className="text-[10px] uppercase tracking-wider text-[#F6B45A]/70 mb-1">Avg Quote</p>
              <p className="text-xl font-bold text-[#F6B45A]">${pipelineAnalytics.avgQuoteValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="flex items-center justify-center gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 mr-2">Conversion:</span>
            <span className="text-xs text-gray-400">Draft</span>
            <span className="text-sm font-bold text-purple-400">{pipelineAnalytics.draftToQuotedRate}%</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-400">Quoted</span>
            <span className="text-sm font-bold text-emerald-400">{pipelineAnalytics.quotedToApprovedRate}%</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-400">Approved</span>
            <span className="text-sm font-bold text-[#F6B45A]">{pipelineAnalytics.approvedToCompletedRate}%</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-400">Done</span>
          </div>
        </div>
      )}

      {/* Business Health & Pipeline Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {businessHealthData && <BusinessHealthScore healthData={businessHealthData} />}
        {pipelineForecastData && (
          <PipelineForecast
            data={pipelineForecastData}
            onViewProject={onViewProject}
          />
        )}
      </div>

      {/* Team Performance & Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {teamPerformanceData && <TeamPerformanceMatrix data={teamPerformanceData} />}
        {capacityPlanningData && (
          <CapacityDashboard
            data={capacityPlanningData}
            onViewJob={onViewProject}
          />
        )}
      </div>

      {/* Dashboard Selection: Executive vs Standard */}
      {locationMetrics && locationMetrics.locations?.length > 1 ? (
        <ExecutiveDashboard
          locations={locationMetrics.locations}
          technicians={technicians}
          locationMetrics={locationMetrics}
          technicianMetrics={technicianMetrics}
          companyMetrics={companyMetrics}
          isLoading={false}
        />
      ) : (
        analyticsMetrics && (
          <AnalyticsDashboard
            todayMetrics={analyticsMetrics.todayMetrics}
            thisWeekMetrics={analyticsMetrics.thisWeekMetrics}
            thisMonthMetrics={analyticsMetrics.thisMonthMetrics}
            thisYearMetrics={analyticsMetrics.thisYearMetrics}
            currentGoalsProgress={analyticsMetrics.currentGoalsProgress}
            pendingRevenue={analyticsMetrics.pendingRevenue}
            overdueCount={analyticsMetrics.overdueCount}
          />
        )
      )}

      {/* Lead Source ROI Dashboard */}
      {leadSourceROI && (
        <div className="mt-6">
          <LeadSourceROIDashboard metrics={leadSourceROI} />
        </div>
      )}

      {/* Cash Flow Dashboard */}
      {cashFlowForecast && (
        <div className="mt-6">
          <CashFlowDashboard forecast={cashFlowForecast} />
        </div>
      )}
    </motion.div>
  );
};
