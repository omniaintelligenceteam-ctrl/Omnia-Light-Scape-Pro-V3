import React from 'react';
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

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  if (isIOSDevice()) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function waitForCaptureAssets(element: HTMLElement, timeoutMs = 5000): Promise<void> {
  // Wait for web fonts to settle so text layout is stable.
  try {
    if ('fonts' in document) {
      await Promise.race([
        (document as Document & { fonts: FontFaceSet }).fonts.ready,
        new Promise(resolve => setTimeout(resolve, timeoutMs))
      ]);
    }
  } catch {
    // Continue even if fonts API is not available.
  }

  const images = Array.from(element.querySelectorAll('img'));
  if (!images.length) return;

  await Promise.all(images.map(img => {
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      const cleanup = () => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
      };
      const onDone = () => {
        cleanup();
        resolve();
      };
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
      setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);
    });
  }));
}

export async function generateInvoicePDF(
  layoutRef: React.RefObject<HTMLDivElement>,
  invoiceNumber: string
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;

  const element = layoutRef.current;
  if (!element) return;

  await waitForCaptureAssets(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#111827',
    width: 816,
    height: 1056,
    imageTimeout: 8000,
    onclone: clonedDocument => {
      // Remove zero-sized media in the cloned tree to avoid createPattern crashes.
      clonedDocument.querySelectorAll('canvas').forEach(node => {
        const canvasElement = node as HTMLCanvasElement;
        if (canvasElement.width <= 0 || canvasElement.height <= 0) {
          node.remove();
        }
      });

      clonedDocument.querySelectorAll('img').forEach(node => {
        const image = node as HTMLImageElement;
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!image.src || width <= 0 || height <= 0) {
          image.style.display = 'none';
        }
      });
    }
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [816, 1056],
  });

  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 0, 0, 816, 1056);

  const blob = doc.output('blob');
  downloadBlob(blob, `invoice-${invoiceNumber}.pdf`);
}

export async function generateQuotePDF(
  layoutRef: React.RefObject<HTMLDivElement>,
  projectName: string,
  imageUrl: string,
  thumbRef: React.RefObject<HTMLImageElement>
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;

  const element = layoutRef.current;
  if (!element) return;

  // Capture thumbnail rect BEFORE canvas render (position relative to layout container)
  let thumbX = 0, thumbY = 0, thumbW = 120, thumbH = 88;
  if (thumbRef.current && element) {
    const containerRect = element.getBoundingClientRect();
    const thumbRect = thumbRef.current.getBoundingClientRect();
    thumbX = thumbRect.left - containerRect.left;
    thumbY = thumbRect.top - containerRect.top;
    thumbW = thumbRect.width;
    thumbH = thumbRect.height;
  }

  await waitForCaptureAssets(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#111827',
    width: 816,
    height: 1056,
    imageTimeout: 8000,
    onclone: clonedDocument => {
      clonedDocument.querySelectorAll('canvas').forEach(node => {
        const canvasElement = node as HTMLCanvasElement;
        if (canvasElement.width <= 0 || canvasElement.height <= 0) {
          node.remove();
        }
      });

      clonedDocument.querySelectorAll('img').forEach(node => {
        const image = node as HTMLImageElement;
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!image.src || width <= 0 || height <= 0) {
          image.style.display = 'none';
        }
      });
    }
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [816, 1056],
  });

  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 0, 0, 816, 1056);

  // Overlay a hyperlink annotation over the thumbnail so it's clickable in the PDF
  if (imageUrl && thumbW > 0) {
    doc.link(thumbX, thumbY, thumbW, thumbH, { url: imageUrl });
  }

  const safeName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  const blob = doc.output('blob');
  downloadBlob(blob, `quote-${safeName}.pdf`);

  // Download full-size design image as a separate file
  if (imageUrl) {
    try {
      const imgResponse = await fetch(imageUrl);
      const imgBlob = await imgResponse.blob();
      const ext = imgBlob.type.includes('png') ? 'png' : 'jpg';
      const imgUrl = URL.createObjectURL(imgBlob);
      const imgA = document.createElement('a');
      imgA.href = imgUrl;
      imgA.download = `quote-${safeName}-design.${ext}`;
      document.body.appendChild(imgA);
      imgA.click();
      document.body.removeChild(imgA);
      URL.revokeObjectURL(imgUrl);
    } catch {
      // If fetch fails (e.g. CORS), open the image in a new tab as fallback
      window.open(imageUrl, '_blank');
    }
  }
}
