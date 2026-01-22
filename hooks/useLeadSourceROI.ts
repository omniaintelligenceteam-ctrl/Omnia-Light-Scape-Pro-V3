import { useMemo } from 'react';
import { Client, SavedProject, LeadSource, LeadSourceROI, LeadSourceMetrics } from '../types';

interface UseLeadSourceROIProps {
  clients: Client[];
  projects: SavedProject[];
}

export function useLeadSourceROI({ clients, projects }: UseLeadSourceROIProps): LeadSourceMetrics {
  return useMemo(() => {
    const sources: LeadSource[] = ['google', 'referral', 'angi', 'thumbtack', 'website', 'social', 'yard_sign', 'other'];

    const bySource: LeadSourceROI[] = sources.map(source => {
      // Get all clients from this source
      const sourceClients = clients.filter(c => c.leadSource === source);
      const totalLeads = sourceClients.length;

      if (totalLeads === 0) {
        return null; // Skip sources with no data
      }

      // Calculate revenue from these clients
      // Match clients to projects by email or phone
      const clientEmails = new Set(sourceClients.map(c => c.email).filter(Boolean));
      const clientPhones = new Set(sourceClients.map(c => c.phone).filter(Boolean));

      const clientProjects = projects.filter(p => {
        if (!p.quote?.clientDetails) return false;
        const email = p.quote.clientDetails.email;
        const phone = p.quote.clientDetails.phone;
        return (email && clientEmails.has(email)) || (phone && clientPhones.has(phone));
      });

      // Only count paid projects for revenue
      const paidProjects = clientProjects.filter(p => p.invoicePaidAt);
      const totalRevenue = paidProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);

      // Count converted leads (clients with at least 1 paid project)
      const convertedClientEmails = new Set(
        paidProjects
          .map(p => p.quote?.clientDetails.email)
          .filter(Boolean)
      );
      const convertedClientPhones = new Set(
        paidProjects
          .map(p => p.quote?.clientDetails.phone)
          .filter(Boolean)
      );
      const convertedLeads = sourceClients.filter(c =>
        (c.email && convertedClientEmails.has(c.email)) ||
        (c.phone && convertedClientPhones.has(c.phone))
      ).length;

      // Sum marketing costs
      const totalMarketingCost = sourceClients.reduce((sum, c) => sum + (c.marketingCost || 0), 0);

      // Calculate metrics
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      const roi = totalMarketingCost > 0
        ? ((totalRevenue - totalMarketingCost) / totalMarketingCost) * 100
        : totalRevenue > 0 ? Infinity : 0;
      const averageProjectValue = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;
      const costPerLead = totalLeads > 0 ? totalMarketingCost / totalLeads : 0;
      const costPerAcquisition = convertedLeads > 0 ? totalMarketingCost / convertedLeads : 0;

      return {
        source,
        totalLeads,
        convertedLeads,
        conversionRate,
        totalRevenue,
        totalMarketingCost,
        roi,
        averageProjectValue,
        costPerLead,
        costPerAcquisition
      };
    }).filter((s): s is LeadSourceROI => s !== null); // Remove null entries

    // Calculate overall metrics
    const totalMarketingSpend = bySource.reduce((sum, s) => sum + s.totalMarketingCost, 0);
    const totalRevenueFromTracked = bySource.reduce((sum, s) => sum + s.totalRevenue, 0);
    const overallROI = totalMarketingSpend > 0
      ? ((totalRevenueFromTracked - totalMarketingSpend) / totalMarketingSpend) * 100
      : 0;

    // Find best performers
    const topPerformingSource = bySource.reduce((best, current) => {
      if (!best) return current;
      // Handle Infinity ROI (revenue with no cost)
      const bestROI = best.roi === Infinity ? Number.MAX_VALUE : best.roi;
      const currentROI = current.roi === Infinity ? Number.MAX_VALUE : current.roi;
      return currentROI > bestROI ? current : best;
    }, bySource[0] as LeadSourceROI | undefined)?.source || 'referral';

    const lowestCostPerAcquisition = bySource
      .filter(s => s.costPerAcquisition > 0) // Only consider sources with a CPA
      .reduce((best, current) => {
        if (!best) return current;
        return current.costPerAcquisition < best.costPerAcquisition ? current : best;
      }, undefined as LeadSourceROI | undefined)?.source || 'referral';

    return {
      bySource,
      topPerformingSource,
      lowestCostPerAcquisition,
      totalMarketingSpend,
      totalRevenueFromTracked,
      overallROI
    };
  }, [clients, projects]);
}
