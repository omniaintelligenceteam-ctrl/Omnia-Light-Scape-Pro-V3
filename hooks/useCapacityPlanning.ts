import { useMemo } from 'react';
import { SavedProject, Technician } from '../types';

export interface DayCapacity {
  date: string;
  dayName: string;
  isToday: boolean;
  scheduledJobs: number;
  scheduledHours: number;
  availableHours: number;
  utilizationPercent: number;
  jobs: {
    id: string;
    name: string;
    clientName: string;
    hours: number;
    timeSlot: string;
  }[];
}

export interface TechnicianCapacity {
  id: string;
  name: string;
  weeklyCapacity: DayCapacity[];
  totalScheduledHours: number;
  totalAvailableHours: number;
  weeklyUtilization: number;
  isOverbooked: boolean;
  alerts: string[];
}

export interface LoadBalancingAlert {
  type: 'overbooked' | 'underutilized' | 'gap' | 'suggestion';
  technicianId?: string;
  technicianName?: string;
  date?: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CapacityPlanningResult {
  technicians: TechnicianCapacity[];
  teamCapacity: {
    totalScheduledHours: number;
    totalAvailableHours: number;
    teamUtilization: number;
    jobsThisWeek: number;
    remainingCapacity: number;
  };
  alerts: LoadBalancingAlert[];
  canTakeMoreJobs: boolean;
  suggestedCapacity: number; // How many more jobs can be taken
}

interface UseCapacityPlanningProps {
  projects: SavedProject[];
  technicians: Technician[];
  hoursPerDay?: number;
  workDays?: number; // 5 for Mon-Fri, 6 for Mon-Sat
  estimatedHoursPerJob?: number;
}

// Helper to format date
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get day name
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Helper to get time slot label
function getTimeSlotLabel(timeSlot: string, customTime?: string): string {
  if (timeSlot === 'custom' && customTime) return customTime;
  const labels: Record<string, string> = {
    morning: '8am-12pm',
    afternoon: '12pm-5pm',
    evening: '5pm-8pm'
  };
  return labels[timeSlot] || timeSlot;
}

export function useCapacityPlanning({
  projects,
  technicians,
  hoursPerDay = 8,
  workDays = 5,
  estimatedHoursPerJob = 4
}: UseCapacityPlanningProps): CapacityPlanningResult {

  return useMemo(() => {
    const now = new Date();
    const today = formatDate(now);

    // Generate next 7 days
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      weekDates.push(date);
    }

    // Get scheduled projects
    const scheduledProjects = projects.filter(p =>
      p.status === 'scheduled' && p.schedule?.scheduledDate
    );

    // If no technicians, create a synthetic "Unassigned" category
    const techList = technicians.length > 0
      ? technicians.filter(t => t.isActive)
      : [{ id: 'unassigned', name: 'Unassigned', isActive: true } as Technician];

    // Calculate capacity for each technician
    const technicianCapacities: TechnicianCapacity[] = techList.map(tech => {
      const weeklyCapacity: DayCapacity[] = weekDates.map(date => {
        const dateStr = formatDate(date);
        const isToday = dateStr === today;
        const dayOfWeek = date.getDay();
        const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= workDays; // Mon=1 to workDays

        // Get jobs for this tech on this day
        const dayJobs = scheduledProjects.filter(p => {
          const matchesTech = p.assignedTechnicianId === tech.id ||
            (tech.id === 'unassigned' && !p.assignedTechnicianId);
          return matchesTech && p.schedule?.scheduledDate === dateStr;
        });

        const scheduledHours = dayJobs.reduce((sum, p) =>
          sum + (p.schedule?.estimatedDuration || estimatedHoursPerJob), 0
        );

        const availableHours = isWorkDay ? hoursPerDay : 0;
        const utilizationPercent = availableHours > 0
          ? Math.round((scheduledHours / availableHours) * 100)
          : 0;

        return {
          date: dateStr,
          dayName: getDayName(date),
          isToday,
          scheduledJobs: dayJobs.length,
          scheduledHours,
          availableHours,
          utilizationPercent,
          jobs: dayJobs.map(p => ({
            id: p.id,
            name: p.name,
            clientName: p.quote?.clientDetails?.name || p.clientName || 'Unknown',
            hours: p.schedule?.estimatedDuration || estimatedHoursPerJob,
            timeSlot: getTimeSlotLabel(p.schedule?.timeSlot || 'morning', p.schedule?.customTime)
          }))
        };
      });

      const totalScheduledHours = weeklyCapacity.reduce((sum, d) => sum + d.scheduledHours, 0);
      const totalAvailableHours = weeklyCapacity.reduce((sum, d) => sum + d.availableHours, 0);
      const weeklyUtilization = totalAvailableHours > 0
        ? Math.round((totalScheduledHours / totalAvailableHours) * 100)
        : 0;

      // Check for overbooking
      const overbookedDays = weeklyCapacity.filter(d => d.utilizationPercent > 100);
      const isOverbooked = overbookedDays.length > 0;

      // Generate alerts for this tech
      const alerts: string[] = [];
      overbookedDays.forEach(d => {
        alerts.push(`Overbooked on ${d.dayName} (${d.utilizationPercent}%)`);
      });

      const underutilizedDays = weeklyCapacity.filter(d =>
        d.availableHours > 0 && d.utilizationPercent < 50
      );
      if (underutilizedDays.length >= 3) {
        alerts.push(`${underutilizedDays.length} days with low utilization`);
      }

      return {
        id: tech.id,
        name: tech.name,
        weeklyCapacity,
        totalScheduledHours,
        totalAvailableHours,
        weeklyUtilization,
        isOverbooked,
        alerts
      };
    });

    // Team totals
    const teamTotalScheduled = technicianCapacities.reduce((sum, t) => sum + t.totalScheduledHours, 0);
    const teamTotalAvailable = technicianCapacities.reduce((sum, t) => sum + t.totalAvailableHours, 0);
    const teamUtilization = teamTotalAvailable > 0
      ? Math.round((teamTotalScheduled / teamTotalAvailable) * 100)
      : 0;

    const jobsThisWeek = scheduledProjects.filter(p => {
      const schedDate = p.schedule?.scheduledDate;
      if (!schedDate) return false;
      return weekDates.some(d => formatDate(d) === schedDate);
    }).length;

    const remainingCapacity = Math.max(0, teamTotalAvailable - teamTotalScheduled);
    const suggestedCapacity = Math.floor(remainingCapacity / estimatedHoursPerJob);

    // Generate load balancing alerts
    const alerts: LoadBalancingAlert[] = [];

    // Overbooking alerts
    technicianCapacities.forEach(tech => {
      if (tech.isOverbooked) {
        const overbookedDays = tech.weeklyCapacity.filter(d => d.utilizationPercent > 100);
        overbookedDays.forEach(day => {
          alerts.push({
            type: 'overbooked',
            technicianId: tech.id,
            technicianName: tech.name,
            date: day.date,
            message: `${tech.name} is at ${day.utilizationPercent}% capacity on ${day.dayName}`,
            severity: day.utilizationPercent > 150 ? 'high' : 'medium'
          });
        });
      }
    });

    // Underutilization alerts
    technicianCapacities.forEach(tech => {
      if (tech.weeklyUtilization < 50 && tech.totalAvailableHours > 0) {
        alerts.push({
          type: 'underutilized',
          technicianId: tech.id,
          technicianName: tech.name,
          message: `${tech.name} has ${Math.round(tech.totalAvailableHours - tech.totalScheduledHours)} hours available this week`,
          severity: 'low'
        });
      }
    });

    // Load balancing suggestions
    const overbookedTechs = technicianCapacities.filter(t => t.isOverbooked);
    const underutilizedTechs = technicianCapacities.filter(t => t.weeklyUtilization < 60);

    if (overbookedTechs.length > 0 && underutilizedTechs.length > 0) {
      alerts.push({
        type: 'suggestion',
        message: `Consider moving jobs from ${overbookedTechs[0].name} to ${underutilizedTechs[0].name} to balance workload`,
        severity: 'medium'
      });
    }

    // Sort alerts by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      technicians: technicianCapacities,
      teamCapacity: {
        totalScheduledHours: teamTotalScheduled,
        totalAvailableHours: teamTotalAvailable,
        teamUtilization,
        jobsThisWeek,
        remainingCapacity
      },
      alerts,
      canTakeMoreJobs: teamUtilization < 85,
      suggestedCapacity
    };
  }, [projects, technicians, hoursPerDay, workDays, estimatedHoursPerJob]);
}
