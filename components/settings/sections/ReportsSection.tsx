import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Receipt, Calculator, ChevronRight, Download, X, TrendingUp, Clock, Briefcase } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { SavedProject } from '../../../types';
import { useExpenses, type Expense, type ExpenseSummary } from '../../../hooks/useExpenses';

interface ReportsSectionProps {
  projects?: SavedProject[];
}

// P&L Report Types
interface ProfitLossData {
  period: { start: string; end: string };
  income: {
    installation: number;
    serviceRepair: number;
    maintenance: number;
    holiday: number;
    other: number;
    total: number;
  };
  cogs: {
    fixtures: number;
    electrical: number;
    transformers: number;
    subcontractors: number;
    other: number;
    total: number;
  };
  grossProfit: number;
  grossMargin: number;
  expenses: {
    wages: number;
    vehicle: number;
    tools: number;
    insurance: number;
    marketing: number;
    office: number;
    other: number;
    total: number;
  };
  netProfit: number;
  netMargin: number;
}

// AR Aging Report Types
interface ARAgingData {
  current: { projects: SavedProject[]; total: number };
  days31_60: { projects: SavedProject[]; total: number };
  days61_90: { projects: SavedProject[]; total: number };
  over90: { projects: SavedProject[]; total: number };
  totalOutstanding: number;
}

// Job Costing Types
interface JobCostData {
  project: SavedProject;
  revenue: number;
  costs: {
    materials: number;
    labor: number;
    subcontractors: number;
    other: number;
    total: number;
  };
  profit: number;
  margin: number;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const REPORT_TYPES = [
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    description: 'Income, expenses, and net profit by period',
    icon: TrendingUp,
  },
  {
    id: 'ar-aging',
    title: 'AR Aging',
    description: 'Accounts receivable by days overdue',
    icon: Clock,
  },
  {
    id: 'job-costing',
    title: 'Job Costing',
    description: 'Per-project profitability and margins',
    icon: Briefcase,
  },
  {
    id: 'projected-income',
    title: 'Projected Income',
    description: 'Projected income from invoices awaiting payment',
    icon: DollarSign,
  },
  {
    id: 'transactions',
    title: 'Transaction List',
    description: 'All transactions from invoices, payments & deposits',
    icon: Receipt,
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Invoices report with additional client data',
    icon: FileText,
  },
  {
    id: 'taxation',
    title: 'Taxation',
    description: 'Tax totals, total awaiting collection, and total by tax rate',
    icon: Calculator,
  },
];

export const ReportsSection: React.FC<ReportsSectionProps> = ({ projects = [] }) => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all'>('this_month');

  // Get expenses data
  const { expenses, getSummary } = useExpenses();

  // Helper to calculate tax amount from quote
  const getTaxAmount = (quote: { total?: number; taxRate?: number } | null) => {
    if (!quote || !quote.total || !quote.taxRate) return 0;
    // Tax rate is a percentage, so divide by 100
    return (quote.total * quote.taxRate) / (100 + quote.taxRate);
  };

  // Get date range for filtering
  const getDateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (dateRange) {
      case 'this_month':
        return {
          start: new Date(year, month, 1).toISOString().split('T')[0],
          end: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };
      case 'last_month':
        return {
          start: new Date(year, month - 1, 1).toISOString().split('T')[0],
          end: new Date(year, month, 0).toISOString().split('T')[0]
        };
      case 'this_quarter':
        const quarterStart = Math.floor(month / 3) * 3;
        return {
          start: new Date(year, quarterStart, 1).toISOString().split('T')[0],
          end: new Date(year, quarterStart + 3, 0).toISOString().split('T')[0]
        };
      case 'this_year':
        return {
          start: new Date(year, 0, 1).toISOString().split('T')[0],
          end: new Date(year, 11, 31).toISOString().split('T')[0]
        };
      default:
        return { start: '', end: '' };
    }
  }, [dateRange]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    if (dateRange === 'all') return expenses;
    return expenses.filter(e => {
      const expenseDate = e.date;
      return expenseDate >= getDateRange.start && expenseDate <= getDateRange.end;
    });
  }, [expenses, dateRange, getDateRange]);

  // Filter projects by date range (using invoice paid date or project date)
  const filteredProjects = useMemo(() => {
    if (dateRange === 'all') return projects;
    return projects.filter(p => {
      const projectDate = p.invoicePaidAt || p.date;
      if (!projectDate) return false;
      const date = projectDate.split('T')[0];
      return date >= getDateRange.start && date <= getDateRange.end;
    });
  }, [projects, dateRange, getDateRange]);

  // Calculate P&L Data
  const getProfitLossData = useMemo((): ProfitLossData => {
    // Income from paid invoices
    const paidProjects = filteredProjects.filter(p => p.invoicePaidAt && p.quote?.total);
    const totalIncome = paidProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);

    // Categorize expenses by chart of accounts categories
    const expenseSummary = getSummary(filteredExpenses);

    // Map expense categories to P&L categories
    const cogs = {
      fixtures: filteredExpenses.filter(e => e.category === 'Fixtures & Materials').reduce((s, e) => s + Number(e.amount), 0),
      electrical: filteredExpenses.filter(e => e.category === 'Wire & Electrical').reduce((s, e) => s + Number(e.amount), 0),
      transformers: filteredExpenses.filter(e => e.category === 'Transformers').reduce((s, e) => s + Number(e.amount), 0),
      subcontractors: filteredExpenses.filter(e => e.category === 'Subcontractor Labor').reduce((s, e) => s + Number(e.amount), 0),
      other: 0,
      total: 0
    };
    cogs.total = cogs.fixtures + cogs.electrical + cogs.transformers + cogs.subcontractors;

    const opExpenses = {
      wages: filteredExpenses.filter(e => e.category === 'Technician Wages').reduce((s, e) => s + Number(e.amount), 0),
      vehicle: filteredExpenses.filter(e => e.category === 'Vehicle Expenses').reduce((s, e) => s + Number(e.amount), 0),
      tools: filteredExpenses.filter(e => e.category === 'Tools & Equipment').reduce((s, e) => s + Number(e.amount), 0),
      insurance: filteredExpenses.filter(e => e.category === 'Insurance').reduce((s, e) => s + Number(e.amount), 0),
      marketing: filteredExpenses.filter(e => e.category === 'Marketing').reduce((s, e) => s + Number(e.amount), 0),
      office: filteredExpenses.filter(e => e.category === 'Office & Admin').reduce((s, e) => s + Number(e.amount), 0),
      other: filteredExpenses.filter(e =>
        !['Fixtures & Materials', 'Wire & Electrical', 'Transformers', 'Subcontractor Labor',
         'Technician Wages', 'Vehicle Expenses', 'Tools & Equipment', 'Insurance', 'Marketing', 'Office & Admin'
        ].includes(e.category)
      ).reduce((s, e) => s + Number(e.amount), 0),
      total: 0
    };
    opExpenses.total = opExpenses.wages + opExpenses.vehicle + opExpenses.tools +
                       opExpenses.insurance + opExpenses.marketing + opExpenses.office + opExpenses.other;

    const grossProfit = totalIncome - cogs.total;
    const netProfit = grossProfit - opExpenses.total;

    return {
      period: getDateRange,
      income: {
        installation: totalIncome, // For now, all income is installation
        serviceRepair: 0,
        maintenance: 0,
        holiday: 0,
        other: 0,
        total: totalIncome
      },
      cogs,
      grossProfit,
      grossMargin: totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0,
      expenses: opExpenses,
      netProfit,
      netMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
    };
  }, [filteredProjects, filteredExpenses, getSummary, getDateRange]);

  // Calculate AR Aging Data
  const getARAgingData = useMemo((): ARAgingData => {
    const today = new Date();

    // Get unpaid invoices (sent but not paid)
    const unpaidInvoices = projects.filter(p =>
      p.invoice_sent_at && !p.invoicePaidAt && p.quote?.total
    );

    const getDaysOverdue = (sentDate: string) => {
      const sent = new Date(sentDate);
      // Assume 30-day payment terms
      const dueDate = new Date(sent);
      dueDate.setDate(dueDate.getDate() + 30);
      const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    };

    const current: SavedProject[] = [];
    const days31_60: SavedProject[] = [];
    const days61_90: SavedProject[] = [];
    const over90: SavedProject[] = [];

    unpaidInvoices.forEach(p => {
      const daysOverdue = getDaysOverdue(p.invoice_sent_at!);
      if (daysOverdue <= 0) {
        current.push(p);
      } else if (daysOverdue <= 30) {
        current.push(p); // 0-30 days from due
      } else if (daysOverdue <= 60) {
        days31_60.push(p);
      } else if (daysOverdue <= 90) {
        days61_90.push(p);
      } else {
        over90.push(p);
      }
    });

    const sumTotal = (arr: SavedProject[]) => arr.reduce((s, p) => s + (p.quote?.total || 0), 0);

    return {
      current: { projects: current, total: sumTotal(current) },
      days31_60: { projects: days31_60, total: sumTotal(days31_60) },
      days61_90: { projects: days61_90, total: sumTotal(days61_90) },
      over90: { projects: over90, total: sumTotal(over90) },
      totalOutstanding: sumTotal(unpaidInvoices)
    };
  }, [projects]);

  // Calculate Job Costing Data
  const getJobCostingData = useMemo((): JobCostData[] => {
    // Get completed/paid projects
    const completedProjects = filteredProjects.filter(p =>
      (p.status === 'completed' || p.invoicePaidAt) && p.quote?.total
    );

    return completedProjects.map(project => {
      const revenue = project.quote?.total || 0;

      // Get expenses linked to this project
      const projectExpenses = filteredExpenses.filter(e => e.project_id === project.id);

      const costs = {
        materials: projectExpenses
          .filter(e => ['Fixtures & Materials', 'Wire & Electrical', 'Transformers'].includes(e.category))
          .reduce((s, e) => s + Number(e.amount), 0),
        labor: projectExpenses
          .filter(e => ['Technician Wages'].includes(e.category))
          .reduce((s, e) => s + Number(e.amount), 0),
        subcontractors: projectExpenses
          .filter(e => ['Subcontractor Labor'].includes(e.category))
          .reduce((s, e) => s + Number(e.amount), 0),
        other: projectExpenses
          .filter(e => !['Fixtures & Materials', 'Wire & Electrical', 'Transformers', 'Technician Wages', 'Subcontractor Labor'].includes(e.category))
          .reduce((s, e) => s + Number(e.amount), 0),
        total: 0
      };
      costs.total = costs.materials + costs.labor + costs.subcontractors + costs.other;

      const profit = revenue - costs.total;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return { project, revenue, costs, profit, margin };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
  }, [filteredProjects, filteredExpenses]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate report data
  const getReportData = (reportId: string) => {
    switch (reportId) {
      case 'profit-loss': {
        const pl = getProfitLossData;
        return {
          title: 'Profit & Loss Statement',
          summary: formatCurrency(pl.netProfit),
          subtitle: `Net Margin: ${pl.netMargin.toFixed(1)}%`,
          type: 'profit-loss',
          data: pl
        };
      }
      case 'ar-aging': {
        const ar = getARAgingData;
        return {
          title: 'Accounts Receivable Aging',
          summary: formatCurrency(ar.totalOutstanding),
          subtitle: `${ar.current.projects.length + ar.days31_60.projects.length + ar.days61_90.projects.length + ar.over90.projects.length} unpaid invoices`,
          type: 'ar-aging',
          data: ar
        };
      }
      case 'job-costing': {
        const jobs = getJobCostingData;
        const totalRevenue = jobs.reduce((s, j) => s + j.revenue, 0);
        const totalCost = jobs.reduce((s, j) => s + j.costs.total, 0);
        const totalProfit = totalRevenue - totalCost;
        const avgMargin = jobs.length > 0 ? jobs.reduce((s, j) => s + j.margin, 0) / jobs.length : 0;
        return {
          title: 'Job Costing Report',
          summary: formatCurrency(totalProfit),
          subtitle: `Avg Margin: ${avgMargin.toFixed(1)}% across ${jobs.length} jobs`,
          type: 'job-costing',
          data: jobs
        };
      }
      case 'projected-income': {
        // Invoices that are sent but not paid
        const unpaidInvoices = projects.filter(p =>
          p.invoice_sent_at && !p.invoicePaidAt && p.quote?.total
        );
        const totalProjected = unpaidInvoices.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
        return {
          title: 'Projected Income',
          summary: `$${totalProjected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          subtitle: `${unpaidInvoices.length} invoices awaiting payment`,
          items: unpaidInvoices.map(p => ({
            name: p.name,
            client: p.clientName || p.quote?.clientDetails?.name || 'Unknown',
            amount: p.quote?.total || 0,
            date: p.invoice_sent_at,
          }))
        };
      }
      case 'transactions': {
        // All paid invoices
        const paidInvoices = projects.filter(p => p.invoicePaidAt);
        const totalReceived = paidInvoices.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
        return {
          title: 'Transaction List',
          summary: `$${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          subtitle: `${paidInvoices.length} completed transactions`,
          items: paidInvoices.map(p => ({
            name: p.name,
            client: p.clientName || p.quote?.clientDetails?.name || 'Unknown',
            amount: p.quote?.total || 0,
            date: p.invoicePaidAt,
          }))
        };
      }
      case 'invoices': {
        // All projects with quotes (sent or paid)
        const allInvoices = projects.filter(p => p.quote && (p.invoice_sent_at || p.invoicePaidAt));
        return {
          title: 'Invoices Report',
          summary: `${allInvoices.length} invoices`,
          subtitle: 'All invoices with client data',
          items: allInvoices.map(p => ({
            name: p.name,
            client: p.clientName || p.quote?.clientDetails?.name || 'Unknown',
            email: p.quote?.clientDetails?.email,
            phone: p.quote?.clientDetails?.phone,
            amount: p.quote?.total || 0,
            status: p.invoicePaidAt ? 'Paid' : p.invoice_sent_at ? 'Sent' : 'Draft',
            date: p.date,
          }))
        };
      }
      case 'taxation': {
        // Tax calculations from quotes with tax
        const invoicesWithTax = projects.filter(p => p.quote?.taxRate && p.quote.taxRate > 0);
        const totalTax = invoicesWithTax.reduce((sum, p) => sum + getTaxAmount(p.quote), 0);
        const collectedTax = projects
          .filter(p => p.invoicePaidAt && p.quote?.taxRate && p.quote.taxRate > 0)
          .reduce((sum, p) => sum + getTaxAmount(p.quote), 0);
        const awaitingTax = totalTax - collectedTax;
        return {
          title: 'Taxation Report',
          summary: `$${totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })} total tax`,
          subtitle: `$${collectedTax.toLocaleString('en-US', { minimumFractionDigits: 2 })} collected, $${awaitingTax.toLocaleString('en-US', { minimumFractionDigits: 2 })} awaiting`,
          items: invoicesWithTax.map(p => ({
            name: p.name,
            taxRate: p.quote?.taxRate || 0,
            taxAmount: getTaxAmount(p.quote),
            status: p.invoicePaidAt ? 'Collected' : 'Awaiting',
          }))
        };
      }
      default:
        return null;
    }
  };

  const selectedReportData = selectedReport ? getReportData(selectedReport) : null;

  return (
    <motion.div
      key="reports"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Generate and export business reports.
      </p>

      {!selectedReport ? (
        <div className="space-y-3">
          {REPORT_TYPES.map((report) => (
            <SettingsCard
              key={report.id}
              className="p-4 cursor-pointer hover:border-[#F6B45A]/30 transition-colors"
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#F6B45A]/10 rounded-xl flex items-center justify-center">
                    <report.icon className="w-5 h-5 text-[#F6B45A]" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{report.title}</h3>
                    <p className="text-sm text-gray-500">{report.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            </SettingsCard>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Back button and header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedReport(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Back to Reports
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 text-[#F6B45A] rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Date Range Filter for P&L and Job Costing */}
          {(selectedReport === 'profit-loss' || selectedReport === 'job-costing') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Period:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F6B45A]/50"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          )}

          {/* Report Summary */}
          <SettingsCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-2">{selectedReportData?.title}</h2>
            <p className="text-3xl font-bold text-[#F6B45A]">{selectedReportData?.summary}</p>
            <p className="text-sm text-gray-400 mt-1">{selectedReportData?.subtitle}</p>
          </SettingsCard>

          {/* P&L Report Rendering */}
          {selectedReport === 'profit-loss' && selectedReportData?.type === 'profit-loss' && (
            <div className="space-y-4">
              {/* Income Section */}
              <SettingsCard className="p-0 overflow-hidden">
                <div className="px-4 py-3 bg-green-500/10 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Income</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(selectedReportData.data as ProfitLossData).income.installation > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Installation Income</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).income.installation)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).income.serviceRepair > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Service/Repair Income</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).income.serviceRepair)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).income.maintenance > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Maintenance Contracts</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).income.maintenance)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).income.holiday > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Holiday Lighting</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).income.holiday)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-white/5">
                    <span className="text-white font-semibold">Total Income</span>
                    <span className="text-green-400 font-bold">{formatCurrency((selectedReportData.data as ProfitLossData).income.total)}</span>
                  </div>
                </div>
              </SettingsCard>

              {/* Cost of Goods Sold */}
              <SettingsCard className="p-0 overflow-hidden">
                <div className="px-4 py-3 bg-orange-500/10 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">Cost of Goods Sold</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(selectedReportData.data as ProfitLossData).cogs.fixtures > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Fixtures & Materials</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).cogs.fixtures)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).cogs.electrical > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Wire & Electrical</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).cogs.electrical)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).cogs.transformers > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Transformers</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).cogs.transformers)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).cogs.subcontractors > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Subcontractor Labor</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).cogs.subcontractors)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-white/5">
                    <span className="text-white font-semibold">Total COGS</span>
                    <span className="text-orange-400 font-bold">{formatCurrency((selectedReportData.data as ProfitLossData).cogs.total)}</span>
                  </div>
                </div>
              </SettingsCard>

              {/* Gross Profit */}
              <SettingsCard className="p-4 bg-blue-500/5 border-blue-500/20">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-blue-400 font-semibold text-lg">Gross Profit</span>
                    <p className="text-xs text-gray-500">Income - Cost of Goods Sold</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{formatCurrency((selectedReportData.data as ProfitLossData).grossProfit)}</span>
                    <p className="text-sm text-blue-400">{(selectedReportData.data as ProfitLossData).grossMargin.toFixed(1)}% margin</p>
                  </div>
                </div>
              </SettingsCard>

              {/* Operating Expenses */}
              <SettingsCard className="p-0 overflow-hidden">
                <div className="px-4 py-3 bg-red-500/10 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Operating Expenses</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(selectedReportData.data as ProfitLossData).expenses.wages > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Technician Wages</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.wages)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).expenses.vehicle > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Vehicle Expenses</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.vehicle)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).expenses.tools > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Tools & Equipment</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.tools)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).expenses.insurance > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Insurance</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.insurance)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).expenses.marketing > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Marketing</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.marketing)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).expenses.office > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Office & Admin</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.office)}</span>
                    </div>
                  )}
                  {(selectedReportData.data as ProfitLossData).expenses.other > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-gray-300">Other Expenses</span>
                      <span className="text-white font-medium">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.other)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-white/5">
                    <span className="text-white font-semibold">Total Expenses</span>
                    <span className="text-red-400 font-bold">{formatCurrency((selectedReportData.data as ProfitLossData).expenses.total)}</span>
                  </div>
                </div>
              </SettingsCard>

              {/* Net Profit */}
              <SettingsCard className={`p-4 ${(selectedReportData.data as ProfitLossData).netProfit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`font-semibold text-lg ${(selectedReportData.data as ProfitLossData).netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>Net Profit</span>
                    <p className="text-xs text-gray-500">Gross Profit - Operating Expenses</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-bold ${(selectedReportData.data as ProfitLossData).netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency((selectedReportData.data as ProfitLossData).netProfit)}
                    </span>
                    <p className={`text-sm ${(selectedReportData.data as ProfitLossData).netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(selectedReportData.data as ProfitLossData).netMargin.toFixed(1)}% net margin
                    </p>
                  </div>
                </div>
              </SettingsCard>
            </div>
          )}

          {/* AR Aging Report Rendering */}
          {selectedReport === 'ar-aging' && selectedReportData?.type === 'ar-aging' && (
            <div className="space-y-4">
              {/* Aging Summary Buckets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Current (0-30)</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency((selectedReportData.data as ARAgingData).current.total)}</p>
                  <p className="text-xs text-gray-500">{(selectedReportData.data as ARAgingData).current.projects.length} invoices</p>
                </SettingsCard>
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">31-60 Days</p>
                  <p className="text-xl font-bold text-yellow-400">{formatCurrency((selectedReportData.data as ARAgingData).days31_60.total)}</p>
                  <p className="text-xs text-gray-500">{(selectedReportData.data as ARAgingData).days31_60.projects.length} invoices</p>
                </SettingsCard>
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">61-90 Days</p>
                  <p className="text-xl font-bold text-orange-400">{formatCurrency((selectedReportData.data as ARAgingData).days61_90.total)}</p>
                  <p className="text-xs text-gray-500">{(selectedReportData.data as ARAgingData).days61_90.projects.length} invoices</p>
                </SettingsCard>
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Over 90 Days</p>
                  <p className="text-xl font-bold text-red-400">{formatCurrency((selectedReportData.data as ARAgingData).over90.total)}</p>
                  <p className="text-xs text-gray-500">{(selectedReportData.data as ARAgingData).over90.projects.length} invoices</p>
                </SettingsCard>
              </div>

              {/* Current (0-30 days) */}
              {(selectedReportData.data as ARAgingData).current.projects.length > 0 && (
                <SettingsCard className="p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-green-500/10 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-green-400">Current (0-30 Days)</h3>
                    <span className="text-green-400 font-bold">{formatCurrency((selectedReportData.data as ARAgingData).current.total)}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {(selectedReportData.data as ARAgingData).current.projects.map((p) => (
                      <div key={p.id} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{p.name || p.clientName}</p>
                          <p className="text-xs text-gray-500">Sent: {p.invoice_sent_at ? new Date(p.invoice_sent_at).toLocaleDateString() : '-'}</p>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(p.quote?.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              )}

              {/* 31-60 Days */}
              {(selectedReportData.data as ARAgingData).days31_60.projects.length > 0 && (
                <SettingsCard className="p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-yellow-500/10 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-yellow-400">31-60 Days Overdue</h3>
                    <span className="text-yellow-400 font-bold">{formatCurrency((selectedReportData.data as ARAgingData).days31_60.total)}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {(selectedReportData.data as ARAgingData).days31_60.projects.map((p) => (
                      <div key={p.id} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{p.name || p.clientName}</p>
                          <p className="text-xs text-gray-500">Sent: {p.invoice_sent_at ? new Date(p.invoice_sent_at).toLocaleDateString() : '-'}</p>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(p.quote?.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              )}

              {/* 61-90 Days */}
              {(selectedReportData.data as ARAgingData).days61_90.projects.length > 0 && (
                <SettingsCard className="p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-orange-500/10 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-orange-400">61-90 Days Overdue</h3>
                    <span className="text-orange-400 font-bold">{formatCurrency((selectedReportData.data as ARAgingData).days61_90.total)}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {(selectedReportData.data as ARAgingData).days61_90.projects.map((p) => (
                      <div key={p.id} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{p.name || p.clientName}</p>
                          <p className="text-xs text-gray-500">Sent: {p.invoice_sent_at ? new Date(p.invoice_sent_at).toLocaleDateString() : '-'}</p>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(p.quote?.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              )}

              {/* Over 90 Days */}
              {(selectedReportData.data as ARAgingData).over90.projects.length > 0 && (
                <SettingsCard className="p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-red-500/10 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-400">Over 90 Days Overdue</h3>
                    <span className="text-red-400 font-bold">{formatCurrency((selectedReportData.data as ARAgingData).over90.total)}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {(selectedReportData.data as ARAgingData).over90.projects.map((p) => (
                      <div key={p.id} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{p.name || p.clientName}</p>
                          <p className="text-xs text-gray-500">Sent: {p.invoice_sent_at ? new Date(p.invoice_sent_at).toLocaleDateString() : '-'}</p>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(p.quote?.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              )}

              {/* No Outstanding */}
              {(selectedReportData.data as ARAgingData).totalOutstanding === 0 && (
                <SettingsCard className="p-8 text-center">
                  <p className="text-green-400 font-medium">All invoices are paid! No outstanding receivables.</p>
                </SettingsCard>
              )}
            </div>
          )}

          {/* Job Costing Report Rendering */}
          {selectedReport === 'job-costing' && selectedReportData?.type === 'job-costing' && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency((selectedReportData.data as JobCostData[]).reduce((s, j) => s + j.revenue, 0))}
                  </p>
                </SettingsCard>
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Costs</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatCurrency((selectedReportData.data as JobCostData[]).reduce((s, j) => s + j.costs.total, 0))}
                  </p>
                </SettingsCard>
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Gross Profit</p>
                  <p className="text-xl font-bold text-[#F6B45A]">
                    {formatCurrency((selectedReportData.data as JobCostData[]).reduce((s, j) => s + j.profit, 0))}
                  </p>
                </SettingsCard>
                <SettingsCard className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Avg Margin</p>
                  <p className="text-xl font-bold text-blue-400">
                    {(selectedReportData.data as JobCostData[]).length > 0
                      ? ((selectedReportData.data as JobCostData[]).reduce((s, j) => s + j.margin, 0) / (selectedReportData.data as JobCostData[]).length).toFixed(1)
                      : '0'}%
                  </p>
                </SettingsCard>
              </div>

              {/* Job List Table */}
              {(selectedReportData.data as JobCostData[]).length > 0 ? (
                <SettingsCard className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Project</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Revenue</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Materials</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Labor</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Total Cost</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Profit</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedReportData.data as JobCostData[]).map((job) => (
                          <tr key={job.project.id} className="border-b border-white/5 last:border-0">
                            <td className="p-4">
                              <p className="text-white text-sm font-medium">{job.project.name || job.project.clientName}</p>
                              <p className="text-xs text-gray-500">{job.project.clientName}</p>
                            </td>
                            <td className="p-4 text-green-400 text-sm text-right font-medium">{formatCurrency(job.revenue)}</td>
                            <td className="p-4 text-gray-300 text-sm text-right">{formatCurrency(job.costs.materials)}</td>
                            <td className="p-4 text-gray-300 text-sm text-right">{formatCurrency(job.costs.labor + job.costs.subcontractors)}</td>
                            <td className="p-4 text-red-400 text-sm text-right">{formatCurrency(job.costs.total)}</td>
                            <td className={`p-4 text-sm text-right font-medium ${job.profit >= 0 ? 'text-[#F6B45A]' : 'text-red-400'}`}>
                              {formatCurrency(job.profit)}
                            </td>
                            <td className="p-4 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                job.margin >= 50 ? 'bg-green-500/20 text-green-400' :
                                job.margin >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                                job.margin >= 0 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {job.margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SettingsCard>
              ) : (
                <SettingsCard className="p-8 text-center">
                  <p className="text-gray-500">No completed jobs in this period. Complete some projects to see job costing data.</p>
                </SettingsCard>
              )}
            </div>
          )}

          {/* Legacy Report Items (for projected-income, transactions, invoices, taxation) */}
          {selectedReportData?.items && selectedReportData.items.length > 0 && !selectedReportData.type && (
            <SettingsCard className="p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Project</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Client</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Amount</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReportData.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-white text-sm">{item.name}</td>
                      <td className="p-4 text-gray-400 text-sm">{item.client}</td>
                      <td className="p-4 text-white text-sm text-right">
                        ${(item.amount || item.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Paid' || item.status === 'Collected'
                            ? 'bg-green-500/20 text-green-400'
                            : item.status === 'Sent' || item.status === 'Awaiting'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {item.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SettingsCard>
          )}

          {/* No data fallback */}
          {!selectedReportData?.items && !selectedReportData?.type && (
            <SettingsCard className="p-8 text-center">
              <p className="text-gray-500">No data available for this report.</p>
            </SettingsCard>
          )}
        </div>
      )}
    </motion.div>
  );
};
