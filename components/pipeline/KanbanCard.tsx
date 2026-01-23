import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Wand2 } from 'lucide-react';
import { SavedProject, ProjectStatus } from '../../types';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface KanbanCardProps {
  project: SavedProject;
  statusConfig: Record<ProjectStatus, StatusConfig>;
  onProjectClick: (project: SavedProject) => void;
  isDragging?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  project,
  statusConfig,
  onProjectClick,
  isDragging = false,
}) => {
  const config = statusConfig[project.status];
  const clientName = project.quote?.clientDetails?.name || project.clientName;
  const quoteValue = project.quote?.total;

  // Calculate days since project was created/last updated
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(project.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', project.id);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.cursor = 'grabbing';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    target.style.cursor = 'grab';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.8 : 1,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(246, 180, 90, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={handleDragStart as any}
      onDragEnd={handleDragEnd as any}
      onClick={() => onProjectClick(project)}
      className={`
        group relative bg-[#1a1a1a] border border-white/10 rounded-xl p-3 cursor-grab
        hover:border-[#F6B45A]/40 hover:bg-[#1f1f1f] transition-all duration-200
        ${isDragging ? 'border-[#F6B45A]/60 z-50' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-gray-600" />
      </div>

      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black">
          {project.image ? (
            <img
              src={project.image}
              className="w-full h-full object-cover"
              alt={project.name}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
              <Wand2 className="w-4 h-4 text-gray-600" />
            </div>
          )}
          {/* Status dot */}
          <div
            className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-black ${config.bgColor.replace('/10', '')}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate pr-4">
            {project.name}
          </h4>

          {clientName && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {clientName}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            {quoteValue !== undefined && quoteValue > 0 && (
              <span className="text-xs font-bold text-[#F6B45A]">
                ${quoteValue.toLocaleString()}
              </span>
            )}

            {daysSinceCreated > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                daysSinceCreated > 30
                  ? 'bg-red-500/20 text-red-400'
                  : daysSinceCreated > 14
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-white/5 text-gray-500'
              }`}>
                {daysSinceCreated}d
              </span>
            )}

            {project.invoicePaidAt && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                PAID
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
