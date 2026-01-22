import Papa from 'papaparse';
import { SavedProject, Client, BusinessGoal } from '../../types';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Export revenue report with project details
export function exportRevenueReportCSV(projects: SavedProject[], dateRange?: DateRange): void {
  let filteredProjects = projects;

  // Filter by date range if provided
  if (dateRange) {
    filteredProjects = projects.filter(p => {
      if (!p.invoicePaidAt) return false;
      const paidDate = new Date(p.invoicePaidAt);
      return paidDate >= dateRange.startDate && paidDate <= dateRange.endDate;
    });
  }

  const data = filteredProjects
    .filter(p => p.invoicePaidAt) // Only paid projects
    .map(p => ({
      'Project Name': p.name,
      'Client Name': p.quote?.clientDetails?.name || 'N/A',
      'Client Email': p.quote?.clientDetails?.email || 'N/A',
      'Client Phone': p.quote?.clientDetails?.phone || 'N/A',
      'Status': p.status,
      'Quote Date': p.date ? new Date(p.date).toLocaleDateString() : 'N/A',
      'Scheduled Date': p.schedule?.scheduledDate ? new Date(p.schedule.scheduledDate).toLocaleDateString() : 'N/A',
      'Invoice Sent': p.invoice_sent_at ? new Date(p.invoice_sent_at).toLocaleDateString() : 'N/A',
      'Invoice Paid': p.invoicePaidAt ? new Date(p.invoicePaidAt).toLocaleDateString() : 'N/A',
      'Discount': p.quote?.discount || 0,
      'Total Revenue': p.quote?.total || 0,
      'Location': p.quote?.clientDetails?.address || 'N/A'
    }));

  const csv = Papa.unparse(data);
  downloadCSV(csv, `revenue-report-${new Date().toISOString().split('T')[0]}.csv`);
}

// Export all projects
export function exportProjectsCSV(projects: SavedProject[]): void {
  const data = projects.map(p => ({
    'Project ID': p.id,
    'Project Name': p.name,
    'Client Name': p.quote?.clientDetails?.name || 'N/A',
    'Client Email': p.quote?.clientDetails?.email || 'N/A',
    'Client Phone': p.quote?.clientDetails?.phone || 'N/A',
    'Status': p.status,
    'Created': p.date ? new Date(p.date).toLocaleDateString() : 'N/A',
    'Scheduled': p.schedule?.scheduledDate ? new Date(p.schedule.scheduledDate).toLocaleDateString() : 'N/A',
    'Invoice Sent': p.invoice_sent_at ? new Date(p.invoice_sent_at).toLocaleDateString() : 'N/A',
    'Invoice Paid': p.invoicePaidAt ? new Date(p.invoicePaidAt).toLocaleDateString() : 'N/A',
    'Total': p.quote?.total || 0,
    'Address': p.quote?.clientDetails?.address || 'N/A'
  }));

  const csv = Papa.unparse(data);
  downloadCSV(csv, `projects-export-${new Date().toISOString().split('T')[0]}.csv`);
}

// Export clients
export function exportClientsCSV(clients: Client[]): void {
  const data = clients.map(c => ({
    'Client ID': c.id,
    'Name': c.name,
    'Email': c.email || 'N/A',
    'Phone': c.phone || 'N/A',
    'Address': c.address || 'N/A',
    'Lead Source': c.leadSource || 'N/A',
    'Marketing Cost': c.marketingCost || 0,
    'Project Count': c.projectCount || 0,
    'Total Revenue': c.totalRevenue || 0,
    'Created': new Date(c.createdAt).toLocaleDateString(),
    'Notes': c.notes || ''
  }));

  const csv = Papa.unparse(data);
  downloadCSV(csv, `clients-export-${new Date().toISOString().split('T')[0]}.csv`);
}

// Export goals
export function exportGoalsCSV(goals: BusinessGoal[]): void {
  const data = goals.map(g => ({
    'Goal ID': g.id,
    'Type': g.goalType,
    'Period': g.periodType,
    'Target': g.targetValue,
    'Year': g.year,
    'Month': g.month || 'N/A',
    'Quarter': g.quarter || 'N/A',
    'Created': new Date(g.createdAt).toLocaleDateString()
  }));

  const csv = Papa.unparse(data);
  downloadCSV(csv, `goals-export-${new Date().toISOString().split('T')[0]}.csv`);
}

// Helper function to trigger CSV download
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
