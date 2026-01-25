import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Receipt, Calculator, ChevronRight, Download, X } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { SavedProject } from '../../../types';

interface ReportsSectionProps {
  projects?: SavedProject[];
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const REPORT_TYPES = [
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

  // Helper to calculate tax amount from quote
  const getTaxAmount = (quote: { total?: number; taxRate?: number } | null) => {
    if (!quote || !quote.total || !quote.taxRate) return 0;
    // Tax rate is a percentage, so divide by 100
    return (quote.total * quote.taxRate) / (100 + quote.taxRate);
  };

  // Calculate report data
  const getReportData = (reportId: string) => {
    switch (reportId) {
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

          {/* Report Summary */}
          <SettingsCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-2">{selectedReportData?.title}</h2>
            <p className="text-3xl font-bold text-[#F6B45A]">{selectedReportData?.summary}</p>
            <p className="text-sm text-gray-400 mt-1">{selectedReportData?.subtitle}</p>
          </SettingsCard>

          {/* Report Items */}
          {selectedReportData?.items && selectedReportData.items.length > 0 ? (
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
          ) : (
            <SettingsCard className="p-8 text-center">
              <p className="text-gray-500">No data available for this report.</p>
            </SettingsCard>
          )}
        </div>
      )}
    </motion.div>
  );
};
