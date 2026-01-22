import React, { useState } from 'react';
import { Download, FileText, Table, Users, Target, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedProject, Client, BusinessGoal, CompanyProfile } from '../../types';
import { exportRevenueReportCSV, exportProjectsCSV, exportClientsCSV, exportGoalsCSV, DateRange } from '../../services/export/csvExportService';
import { generatePDFReport, ReportData } from '../../services/export/pdfExportService';

interface ExportMenuProps {
  projects: SavedProject[];
  clients: Client[];
  goals: BusinessGoal[];
  companyProfile?: CompanyProfile;
  dateRange?: DateRange;
  summary?: {
    totalRevenue: number;
    totalProjects: number;
    completedProjects: number;
    averageTicket: number;
    conversionRate: number;
  };
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  projects,
  clients,
  goals,
  companyProfile,
  dateRange,
  summary
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportPDF = () => {
    const now = new Date();
    const defaultDateRange = dateRange || {
      startDate: new Date(now.getFullYear(), 0, 1), // Start of year
      endDate: now
    };

    // Calculate default summary if not provided
    const paidProjects = projects.filter(p => p.invoicePaidAt);
    const defaultSummary = summary || {
      totalRevenue: paidProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0),
      totalProjects: projects.length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      averageTicket: paidProjects.length > 0
        ? paidProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0) / paidProjects.length
        : 0,
      conversionRate: projects.length > 0
        ? (paidProjects.length / projects.length) * 100
        : 0
    };

    // Calculate projects by status
    const projectsByStatus = {
      draft: projects.filter(p => p.status === 'draft').length,
      quoted: projects.filter(p => p.status === 'quoted').length,
      approved: projects.filter(p => p.status === 'approved').length,
      scheduled: projects.filter(p => p.status === 'scheduled').length,
      completed: projects.filter(p => p.status === 'completed').length
    };

    // Calculate goals progress
    const revenueGoal = goals.find(g => g.type === 'revenue' && g.period === 'yearly');
    const projectsGoal = goals.find(g => g.type === 'projects' && g.period === 'yearly');

    const reportData: ReportData = {
      companyProfile,
      dateRange: defaultDateRange,
      summary: defaultSummary,
      projects: paidProjects,
      projectsByStatus,
      goals: {
        revenueGoal: revenueGoal?.target,
        revenueProgress: revenueGoal?.current,
        projectsGoal: projectsGoal?.target,
        projectsProgress: projectsGoal?.current
      }
    };

    generatePDFReport(reportData);
    setIsOpen(false);
  };

  const handleExportRevenueCSV = () => {
    exportRevenueReportCSV(projects, dateRange);
    setIsOpen(false);
  };

  const handleExportProjectsCSV = () => {
    exportProjectsCSV(projects);
    setIsOpen(false);
  };

  const handleExportClientsCSV = () => {
    exportClientsCSV(clients);
    setIsOpen(false);
  };

  const handleExportGoalsCSV = () => {
    exportGoalsCSV(goals);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">Export</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Export Format
                </div>

                {/* PDF Export */}
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                    <FileText className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">Export as PDF</div>
                    <div className="text-xs text-gray-400">Full business report</div>
                  </div>
                </button>

                <div className="my-2 border-t border-white/10" />

                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  CSV Exports
                </div>

                {/* Revenue CSV */}
                <button
                  onClick={handleExportRevenueCSV}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <Table className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">Revenue Report</div>
                    <div className="text-xs text-gray-400">Paid projects with details</div>
                  </div>
                </button>

                {/* Projects CSV */}
                <button
                  onClick={handleExportProjectsCSV}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">All Projects</div>
                    <div className="text-xs text-gray-400">Complete project list</div>
                  </div>
                </button>

                {/* Clients CSV */}
                <button
                  onClick={handleExportClientsCSV}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">Clients</div>
                    <div className="text-xs text-gray-400">Client database</div>
                  </div>
                </button>

                {/* Goals CSV */}
                <button
                  onClick={handleExportGoalsCSV}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                    <Target className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">Goals</div>
                    <div className="text-xs text-gray-400">Goals & progress</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
