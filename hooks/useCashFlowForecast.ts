import { useMemo } from 'react';
import { SavedProject, CashFlowForecast, CashFlowProjection, DSOMetrics, PaymentPatternAnalysis } from '../types';

interface UseCashFlowForecastProps {
  projects: SavedProject[];
}

export function useCashFlowForecast({ projects }: UseCashFlowForecastProps): CashFlowForecast {
  return useMemo(() => {
    const now = new Date();

    // ============================================
    // 1. PAYMENT PATTERN ANALYSIS
    // ============================================

    // Get all projects with both invoice sent and paid dates
    const paidProjects = projects.filter(p => p.invoice_sent_at && p.invoicePaidAt);

    const paymentDelays = paidProjects.map(p => {
      const sentDate = new Date(p.invoice_sent_at!);
      const paidDate = new Date(p.invoicePaidAt!);
      return Math.floor((paidDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    let averagePaymentDelay = 30; // Default if no data
    let medianPaymentDelay = 30;

    if (paymentDelays.length > 0) {
      averagePaymentDelay = paymentDelays.reduce((sum, d) => sum + d, 0) / paymentDelays.length;

      const sorted = [...paymentDelays].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianPaymentDelay = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    // Calculate payment buckets
    const percentPaidOnTime = paymentDelays.length > 0
      ? (paymentDelays.filter(d => d <= 30).length / paymentDelays.length) * 100
      : 0;
    const percentPaid30Days = paymentDelays.length > 0
      ? (paymentDelays.filter(d => d > 30 && d <= 60).length / paymentDelays.length) * 100
      : 0;
    const percentPaid60Days = paymentDelays.length > 0
      ? (paymentDelays.filter(d => d > 60 && d <= 90).length / paymentDelays.length) * 100
      : 0;
    const percentPaid90Plus = paymentDelays.length > 0
      ? (paymentDelays.filter(d => d > 90).length / paymentDelays.length) * 100
      : 0;

    const paymentPatterns: PaymentPatternAnalysis = {
      averagePaymentDelay,
      medianPaymentDelay,
      percentPaidOnTime,
      percentPaid30Days,
      percentPaid60Days,
      percentPaid90Plus
    };

    // ============================================
    // 2. DSO (DAYS SALES OUTSTANDING) CALCULATION
    // ============================================

    // Get outstanding invoices (sent but not paid)
    const outstandingInvoices = projects.filter(p => p.invoice_sent_at && !p.invoicePaidAt);

    const currentDSODelays = outstandingInvoices.map(p => {
      const sentDate = new Date(p.invoice_sent_at!);
      return Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    const currentDSO = currentDSODelays.length > 0
      ? currentDSODelays.reduce((sum, d) => sum + d, 0) / currentDSODelays.length
      : 0;

    const averageDSO = averagePaymentDelay; // Use payment delay as average DSO

    // Calculate DSO by month (last 6 months)
    const dsoByMonth: { month: string; dso: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthPaidProjects = paidProjects.filter(p => {
        const paidDate = new Date(p.invoicePaidAt!);
        return paidDate >= monthStart && paidDate <= monthEnd;
      });

      const monthDelays = monthPaidProjects.map(p => {
        const sentDate = new Date(p.invoice_sent_at!);
        const paidDate = new Date(p.invoicePaidAt!);
        return Math.floor((paidDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
      });

      const monthDSO = monthDelays.length > 0
        ? monthDelays.reduce((sum, d) => sum + d, 0) / monthDelays.length
        : averageDSO;

      dsoByMonth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        dso: Math.round(monthDSO)
      });
    }

    // Determine trend (compare last 2 months)
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (dsoByMonth.length >= 2) {
      const lastMonth = dsoByMonth[dsoByMonth.length - 1].dso;
      const prevMonth = dsoByMonth[dsoByMonth.length - 2].dso;
      const change = lastMonth - prevMonth;

      if (change < -2) trend = 'improving'; // DSO decreasing = improving
      else if (change > 2) trend = 'worsening'; // DSO increasing = worsening
    }

    const dsoMetrics: DSOMetrics = {
      currentDSO: Math.round(currentDSO),
      averageDSO: Math.round(averageDSO),
      trend,
      dsoByMonth
    };

    // ============================================
    // 3. OUTSTANDING AR CALCULATION
    // ============================================

    const totalOutstandingAR = outstandingInvoices.reduce((sum, p) => sum + (p.quote?.total || 0), 0);

    // ============================================
    // 4. CASH FLOW PROJECTIONS
    // ============================================

    // Helper to get start of week
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day; // Adjust to Sunday
      return new Date(d.setDate(diff));
    };

    // Generate weekly buckets for projections
    const generateProjections = (daysAhead: number): CashFlowProjection[] => {
      const projections: CashFlowProjection[] = [];
      const startDate = getWeekStart(now);
      const weeksAhead = Math.ceil(daysAhead / 7);

      let cumulativeCashFlow = 0;

      for (let week = 0; week < weeksAhead; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (week * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        let expectedInflow = 0;
        const expectedOutflow = 0; // Not tracking expenses yet

        // Project payments from outstanding invoices
        outstandingInvoices.forEach(p => {
          const sentDate = new Date(p.invoice_sent_at!);
          const projectedPaymentDate = new Date(sentDate);
          projectedPaymentDate.setDate(sentDate.getDate() + averagePaymentDelay);

          if (projectedPaymentDate >= weekStart && projectedPaymentDate <= weekEnd) {
            expectedInflow += p.quote?.total || 0;
          }
        });

        // Project revenue from scheduled projects
        const scheduledProjects = projects.filter(p =>
          p.status === 'scheduled' &&
          p.schedule?.scheduledDate &&
          !p.invoice_sent_at
        );

        scheduledProjects.forEach(p => {
          const scheduledDate = new Date(p.schedule!.scheduledDate);

          // Project completion on scheduled date
          if (scheduledDate >= weekStart && scheduledDate <= weekEnd) {
            // Assume invoice sent same day as completion
            const projectedInvoiceDate = scheduledDate;
            const projectedPaymentDate = new Date(projectedInvoiceDate);
            projectedPaymentDate.setDate(projectedInvoiceDate.getDate() + averagePaymentDelay);

            // If payment falls within this forecast period, add revenue
            if (projectedPaymentDate <= new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)) {
              // Find the week this payment falls in
              for (let futureWeek = week; futureWeek < weeksAhead; futureWeek++) {
                const futureWeekStart = new Date(startDate);
                futureWeekStart.setDate(startDate.getDate() + (futureWeek * 7));

                const futureWeekEnd = new Date(futureWeekStart);
                futureWeekEnd.setDate(futureWeekStart.getDate() + 6);

                if (projectedPaymentDate >= futureWeekStart && projectedPaymentDate <= futureWeekEnd) {
                  // Add to future week (will be added in that iteration)
                  break;
                }
              }
            }
          }
        });

        const netCashFlow = expectedInflow - expectedOutflow;
        cumulativeCashFlow += netCashFlow;

        // Determine confidence level based on time horizon
        const daysFromNow = week * 7;
        let confidence: 'high' | 'medium' | 'low';
        if (daysFromNow <= 30) confidence = 'high';
        else if (daysFromNow <= 60) confidence = 'medium';
        else confidence = 'low';

        projections.push({
          period: weekStart.toISOString().split('T')[0],
          expectedInflow,
          expectedOutflow,
          netCashFlow,
          cumulativeCashFlow,
          confidence
        });
      }

      return projections;
    };

    const projections30Day = generateProjections(30);
    const projections60Day = generateProjections(60);
    const projections90Day = generateProjections(90);

    // Calculate projected collections
    const projectedCollections30Day = projections30Day.reduce((sum, p) => sum + p.expectedInflow, 0);
    const projectedCollections60Day = projections60Day.reduce((sum, p) => sum + p.expectedInflow, 0);
    const projectedCollections90Day = projections90Day.reduce((sum, p) => sum + p.expectedInflow, 0);

    return {
      projections30Day,
      projections60Day,
      projections90Day,
      dsoMetrics,
      paymentPatterns,
      totalOutstandingAR,
      projectedCollections30Day,
      projectedCollections60Day,
      projectedCollections90Day
    };
  }, [projects]);
}
