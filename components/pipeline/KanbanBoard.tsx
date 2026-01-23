import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SavedProject, ProjectStatus } from '../../types';
import { KanbanColumn } from './KanbanColumn';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface KanbanBoardProps {
  projects: SavedProject[];
  statusConfig: Record<ProjectStatus, StatusConfig>;
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => Promise<boolean>;
  onProjectClick: (project: SavedProject) => void;
}

// Define the order of columns
const COLUMN_ORDER: ProjectStatus[] = ['draft', 'quoted', 'approved', 'scheduled', 'completed'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  statusConfig,
  onStatusChange,
  onProjectClick,
}) => {
  const [pendingMove, setPendingMove] = useState<string | null>(null);

  // Group projects by status
  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatus, SavedProject[]> = {
      draft: [],
      quoted: [],
      approved: [],
      scheduled: [],
      completed: [],
    };

    projects.forEach((project) => {
      if (grouped[project.status]) {
        grouped[project.status].push(project);
      }
    });

    // Sort projects within each column by date (newest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as ProjectStatus].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    return grouped;
  }, [projects]);

  const handleDropProject = async (projectId: string, newStatus: ProjectStatus) => {
    // Find the project
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    // Optimistic update handled by parent - just call the handler
    setPendingMove(projectId);

    try {
      await onStatusChange(projectId, newStatus);
    } catch (error) {
      console.error('Failed to update project status:', error);
    } finally {
      setPendingMove(null);
    }
  };

  // Calculate pipeline totals
  const pipelineTotals = useMemo(() => {
    const total = projects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
    const completed = projectsByStatus.completed.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
    const pending = total - completed;
    return { total, completed, pending };
  }, [projects, projectsByStatus.completed]);

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 mb-4 bg-[#0f0f0f] rounded-xl border border-white/5"
      >
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Pipeline</p>
            <p className="text-lg font-bold text-white">${pipelineTotals.total.toLocaleString()}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Active</p>
            <p className="text-lg font-bold text-blue-400">${pipelineTotals.pending.toLocaleString()}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Completed</p>
            <p className="text-lg font-bold text-emerald-400">${pipelineTotals.completed.toLocaleString()}</p>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
      </motion.div>

      {/* Kanban Columns Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMN_ORDER.map((status, index) => (
            <motion.div
              key={status}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <KanbanColumn
                status={status}
                projects={projectsByStatus[status]}
                statusConfig={statusConfig}
                onProjectClick={onProjectClick}
                onDropProject={handleDropProject}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Loading overlay when moving */}
      {pendingMove && (
        <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />
      )}
    </div>
  );
};
