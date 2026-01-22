import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
  BarChart3
} from 'lucide-react';
import { PipelineForecastResult, PipelineStage, StaleQuote } from '../../hooks/usePipelineForecast';

interface PipelineForecastProps {
  data: PipelineForecastResult;
  onViewProject?: (projectId: string) => void;
}

export const PipelineForecast: React.FC<PipelineForecastProps> = ({ data, onViewProject }) => {
  const {
    stages,
    totalPipelineValue,
    weightedForecast,
    averageDealSize,
    averageDaysInPipeline,
    staleQuotes,
    forecasts,
    winRateTrend,
    currentWinRate
  } = data;

  // Calculate funnel widths (relative to max stage value)
  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="bg-gradient-to-b from-[#151515] to-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Sales Pipeline</h3>
            <p className="text-xs text-gray-400">Forecast & conversion tracking</p>
          </div>
        </div>
        {/* Win Rate Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <p className="text-xs text-gray-400">Win Rate</p>
            <p className="text-lg font-bold text-white">{currentWinRate}%</p>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            winRateTrend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {winRateTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(winRateTrend)}%</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total Pipeline</p>
          <p className="text-xl font-bold text-white">${totalPipelineValue.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Weighted Forecast</p>
          <p className="text-xl font-bold text-purple-400">${weightedForecast.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Avg Deal Size</p>
          <p className="text-xl font-bold text-white">${averageDealSize.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Avg Days in Pipeline</p>
          <p className="text-xl font-bold text-white">{averageDaysInPipeline}</p>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Pipeline Funnel</h4>
        <div className="space-y-2">
          {stages.map((stage: PipelineStage, idx: number) => {
            const widthPercent = Math.max(20, (stage.value / maxValue) * 100);
            return (
              <motion.div
                key={stage.status}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="text-sm text-gray-300">{stage.label}</span>
                    <span className="text-xs text-gray-500">({stage.probability * 100}%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{stage.count} deals</span>
                    <span className="text-sm font-medium text-white">${stage.value.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full ${stage.color} flex items-center justify-end pr-3`}
                  >
                    <span className="text-xs font-medium text-white/80">
                      ${stage.weightedValue.toLocaleString()} weighted
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 30/60/90 Day Forecast */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          Revenue Forecast
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {forecasts.map((forecast, idx) => (
            <motion.div
              key={forecast.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className={`p-4 rounded-xl border ${
                forecast.confidence === 'high'
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : forecast.confidence === 'medium'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-blue-500/5 border-blue-500/20'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">{forecast.label}</p>
              <p className="text-lg font-bold text-white">${forecast.projectedRevenue.toLocaleString()}</p>
              <div className={`inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full ${
                forecast.confidence === 'high'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : forecast.confidence === 'medium'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                <BarChart3 className="w-3 h-3" />
                {forecast.confidence} confidence
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stale Quotes Alert */}
      {staleQuotes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Stale Quotes ({staleQuotes.length})
          </h4>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {staleQuotes.slice(0, 5).map((quote: StaleQuote, idx: number) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onViewProject?.(quote.id)}
                  className={`flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition-colors ${
                    idx < staleQuotes.length - 1 ? 'border-b border-amber-500/10' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{quote.name}</p>
                    <p className="text-xs text-gray-400">{quote.clientName}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-400">${quote.value.toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {quote.daysOld} days old
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                </motion.div>
              ))}
            </div>
            {staleQuotes.length > 5 && (
              <div className="p-2 border-t border-amber-500/10 text-center">
                <span className="text-xs text-amber-400">+{staleQuotes.length - 5} more stale quotes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {staleQuotes.length === 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Pipeline is healthy!</p>
            <p className="text-xs text-gray-400">No quotes older than 14 days without activity</p>
          </div>
        </div>
      )}
    </div>
  );
};
