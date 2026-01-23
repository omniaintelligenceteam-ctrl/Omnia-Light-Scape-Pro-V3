import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedProject, ProjectStatus } from '../../types';
import { KanbanCard } from './KanbanCard';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface KanbanColumnProps {
  status: ProjectStatus;
  projects: SavedProject[];
  statusConfig: Record<ProjectStatus, StatusConfig>;
  onProjectClick: (project: SavedProject) => void;
  onEditProject?: (project: SavedProject) => void;
  onDropProject: (projectId: string, newStatus: ProjectStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  projects,
  statusConfig,
  onProjectClick,
  onEditProject,
  onDropProject,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = statusConfig[status];

  // Calculate total value of projects in this column
  const totalValue = projects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the column itself, not child elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const projectId = e.dataTransfer.getData('text/plain');
    if (projectId) {
      onDropProject(projectId, status);
    }
  };

  return (
    <div
      className={`
        flex flex-col min-w-[280px] max-w-[320px] h-full
        bg-[#0f0f0f] rounded-2xl border transition-all duration-200
        ${isDragOver
          ? `border-[#F6B45A]/50 bg-[#F6B45A]/5 shadow-[0_0_20px_rgba(246,180,90,0.15)]`
          : 'border-white/5'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${config.bgColor.replace('/10', '')}`} />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${config.color}`}>
              {config.label}
            </h3>
          </div>
          <span className={`
            text-xs font-bold px-2 py-0.5 rounded-full
            ${config.bgColor} ${config.color}
          `}>
            {projects.length}
          </span>
        </div>

        {totalValue > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            ${totalValue.toLocaleString()} total
          </p>
        )}
      </div>

      {/* Cards Container - Scrollable */}
      <div className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <KanbanCard
                key={project.id}
                project={project}
                statusConfig={statusConfig}
                onProjectClick={onProjectClick}
                onEditProject={onEditProject}
              />
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {projects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                flex flex-col items-center justify-center py-8 px-4
                border-2 border-dashed rounded-xl transition-colors
                ${isDragOver ? 'border-[#F6B45A]/40 bg-[#F6B45A]/5' : 'border-white/10'}
              `}
            >
              <p className="text-xs text-gray-600 text-center">
                {isDragOver ? 'Drop here' : 'No projects'}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Drop indicator at bottom when dragging */}
      {isDragOver && projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 4 }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-3 mb-3 bg-[#F6B45A]/40 rounded-full"
        />
      )}
    </div>
  );
};
