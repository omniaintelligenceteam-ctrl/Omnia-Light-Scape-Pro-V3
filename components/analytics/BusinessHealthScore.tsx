import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Wallet,
  Target,
  Users,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { BusinessHealthResult, FocusArea } from '../../hooks/useBusinessHealthScore';

interface BusinessHealthScoreProps {
  healthData: BusinessHealthResult;
}

export const BusinessHealthScore: React.FC<BusinessHealthScoreProps> = ({ healthData }) => {
  const { overallScore, breakdown, trend, focusAreas, status } = healthData;

  // Status colors
  const statusConfig = {
    excellent: { color: 'text-emerald-400', bg: 'bg-emerald-500', label: 'Excellent' },
    good: { color: 'text-blue-400', bg: 'bg-blue-500', label: 'Good' },
    fair: { color: 'text-amber-400', bg: 'bg-amber-500', label: 'Needs Attention' },
    poor: { color: 'text-red-400', bg: 'bg-red-500', label: 'Critical' }
  };

  const config = statusConfig[status];

  // Score breakdown items
  const scoreItems = [
    { name: 'Revenue', score: breakdown.revenueScore, icon: DollarSign, weight: '25%' },
    { name: 'Cash Flow', score: breakdown.cashFlowScore, icon: Wallet, weight: '25%' },
    { name: 'Pipeline', score: breakdown.pipelineScore, icon: Target, weight: '20%' },
    { name: 'Utilization', score: breakdown.utilizationScore, icon: Users, weight: '15%' },
    { name: 'Conversion', score: breakdown.conversionScore, icon: BarChart3, weight: '15%' }
  ];

  // Calculate gauge rotation (0-180 degrees for half circle)
  const gaugeRotation = (overallScore / 100) * 180;

  return (
    <div className="bg-gradient-to-b from-[#151515] to-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Business Health Score</h3>
            <p className="text-xs text-gray-400">Real-time business performance</p>
          </div>
        </div>
        {/* Trend Badge */}
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
          trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="text-sm font-medium">{Math.abs(trend)}% vs last week</span>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
        {/* Gauge */}
        <div className="relative w-48 h-24">
          {/* Background arc */}
          <svg className="w-full h-full" viewBox="0 0 200 100">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Red zone (0-40) */}
            <path
              d="M 20 100 A 80 80 0 0 1 52 42"
              fill="none"
              stroke="rgba(239,68,68,0.3)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Yellow zone (40-60) */}
            <path
              d="M 52 42 A 80 80 0 0 1 100 20"
              fill="none"
              stroke="rgba(245,158,11,0.3)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Green zone (60-100) */}
            <path
              d="M 100 20 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(16,185,129,0.3)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Active score indicator */}
            <motion.circle
              initial={{ cx: 20, cy: 100 }}
              animate={{
                cx: 100 + 80 * Math.cos((Math.PI * (180 - gaugeRotation)) / 180),
                cy: 100 - 80 * Math.sin((Math.PI * (180 - gaugeRotation)) / 180)
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              r="10"
              fill={overallScore >= 60 ? '#10b981' : overallScore >= 40 ? '#f59e0b' : '#ef4444'}
              className="drop-shadow-lg"
            />
          </svg>

          {/* Center score display */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className={`text-4xl font-bold ${config.color}`}
            >
              {overallScore}
            </motion.span>
            <span className="text-xs text-gray-400">out of 100</span>
          </div>
        </div>

        {/* Status & Summary */}
        <div className="flex-1 text-center md:text-left">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg}/20 border border-${config.bg.replace('bg-', '')}/30 mb-3`}>
            {status === 'excellent' && <TrendingUp className={`w-4 h-4 ${config.color}`} />}
            {status === 'good' && <Activity className={`w-4 h-4 ${config.color}`} />}
            {status === 'fair' && <AlertCircle className={`w-4 h-4 ${config.color}`} />}
            {status === 'poor' && <AlertCircle className={`w-4 h-4 ${config.color}`} />}
            <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-sm text-gray-400 max-w-xs">
            {status === 'excellent' && 'Your business is performing exceptionally well across all metrics.'}
            {status === 'good' && 'Business is healthy with some room for improvement.'}
            {status === 'fair' && 'Several areas need attention to optimize performance.'}
            {status === 'poor' && 'Immediate action needed to improve business health.'}
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Score Breakdown</h4>
        <div className="space-y-3">
          {scoreItems.map((item) => {
            const Icon = item.icon;
            const barColor = item.score >= 60 ? 'bg-emerald-500' : item.score >= 40 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.weight}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                    <span className="text-sm font-medium text-white w-8 text-right">{item.score}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus Areas */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Top Focus Areas
        </h4>
        <div className="space-y-2">
          {focusAreas.map((area: FocusArea, idx: number) => (
            <motion.div
              key={area.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3 rounded-xl border ${
                area.priority === 'high'
                  ? 'bg-red-500/5 border-red-500/20'
                  : area.priority === 'medium'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-blue-500/5 border-blue-500/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      area.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : area.priority === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {area.priority === 'high' ? 'High Priority' : area.priority === 'medium' ? 'Medium' : 'Low'}
                    </span>
                    <span className="text-sm font-medium text-white">{area.name}</span>
                    <span className="text-xs text-gray-500">Score: {area.score}</span>
                  </div>
                  <p className="text-xs text-gray-400">{area.tip}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
