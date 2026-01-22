import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SavedProject, CompanyProfile } from '../../types';

export interface ReportData {
  companyProfile?: CompanyProfile;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalRevenue: number;
    totalProjects: number;
    completedProjects: number;
    averageTicket: number;
    conversionRate: number;
  };
  projects: SavedProject[];
  projectsByStatus: {
    draft: number;
    quoted: number;
    approved: number;
    scheduled: number;
    completed: number;
  };
  goals?: {
    revenueGoal?: number;
    revenueProgress?: number;
    projectsGoal?: number;
    projectsProgress?: number;
  };
}

export function generatePDFReport(data: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // ============================================
  // HEADER
  // ============================================
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const companyName = data.companyProfile?.name || 'Business Report';
  doc.text(companyName, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(59, 130, 246); // Blue color
  const dateRangeText = `${data.dateRange.startDate.toLocaleDateString()} - ${data.dateRange.endDate.toLocaleDateString()}`;
  doc.text(dateRangeText, pageWidth / 2, 28, { align: 'center' });

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  const timestamp = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  doc.text(timestamp, pageWidth / 2, 35, { align: 'center' });

  yPosition = 50;

  // ============================================
  // EXECUTIVE SUMMARY
  // ============================================
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPosition);
  yPosition += 8;

  // Summary KPIs in a grid
  const kpiData = [
    ['Total Revenue', `$${formatNumber(data.summary.totalRevenue)}`],
    ['Total Projects', data.summary.totalProjects.toString()],
    ['Completed Projects', data.summary.completedProjects.toString()],
    ['Average Ticket', `$${formatNumber(data.summary.averageTicket)}`],
    ['Conversion Rate', `${data.summary.conversionRate.toFixed(1)}%`]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: kpiData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ============================================
  // PROJECT STATUS BREAKDOWN
  // ============================================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Status Breakdown', 14, yPosition);
  yPosition += 8;

  const statusData = [
    ['Draft', data.projectsByStatus.draft.toString()],
    ['Quoted', data.projectsByStatus.quoted.toString()],
    ['Approved', data.projectsByStatus.approved.toString()],
    ['Scheduled', data.projectsByStatus.scheduled.toString()],
    ['Completed', data.projectsByStatus.completed.toString()]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Status', 'Count']],
    body: statusData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ============================================
  // GOALS PROGRESS (if available)
  // ============================================
  if (data.goals && (data.goals.revenueGoal || data.goals.projectsGoal)) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Goals Progress', 14, yPosition);
    yPosition += 8;

    const goalsData = [];
    if (data.goals.revenueGoal) {
      const revenueProgress = ((data.goals.revenueProgress || 0) / data.goals.revenueGoal) * 100;
      goalsData.push([
        'Revenue Goal',
        `$${formatNumber(data.goals.revenueGoal)}`,
        `$${formatNumber(data.goals.revenueProgress || 0)}`,
        `${revenueProgress.toFixed(1)}%`
      ]);
    }
    if (data.goals.projectsGoal) {
      const projectsProgress = ((data.goals.projectsProgress || 0) / data.goals.projectsGoal) * 100;
      goalsData.push([
        'Projects Goal',
        data.goals.projectsGoal.toString(),
        (data.goals.projectsProgress || 0).toString(),
        `${projectsProgress.toFixed(1)}%`
      ]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Goal Type', 'Target', 'Current', 'Progress']],
      body: goalsData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ============================================
  // REVENUE BREAKDOWN TABLE
  // ============================================
  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Breakdown', 14, yPosition);
  yPosition += 8;

  const paidProjects = data.projects.filter(p => p.invoicePaidAt);

  if (paidProjects.length > 0) {
    const revenueTableData = paidProjects.map(p => [
      p.name.substring(0, 30) + (p.name.length > 30 ? '...' : ''),
      p.quote?.clientDetails?.name?.substring(0, 25) || 'N/A',
      p.invoicePaidAt ? new Date(p.invoicePaidAt).toLocaleDateString() : 'N/A',
      `$${formatNumber(p.quote?.total || 0)}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Project', 'Client', 'Paid Date', 'Revenue']],
      body: revenueTableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35, halign: 'right' }
      }
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('No paid projects in this period', 14, yPosition);
  }

  // ============================================
  // FOOTER
  // ============================================
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated with Omnia LightScape Pro',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  };

  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // ============================================
  // SAVE PDF
  // ============================================
  const filename = `business-report-${data.dateRange.startDate.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
