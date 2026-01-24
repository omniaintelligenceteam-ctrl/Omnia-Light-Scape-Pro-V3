import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Wand2, Edit3, Send, FileText, Calendar, CheckCircle2, Receipt } from 'lucide-react';
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
  onEditProject?: (project: SavedProject) => void;
  onSendQuote?: (project: SavedProject) => void;
  onGenerateQuote?: (project: SavedProject) => void;
  onScheduleProject?: (project: SavedProject) => void;
  onCompleteProject?: (project: SavedProject) => void;
  onGenerateInvoice?: (project: SavedProject) => void;
  isDragging?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  project,
  statusConfig,
  onProjectClick,
  onEditProject,
  onSendQuote,
  onGenerateQuote,
  onScheduleProject,
  onCompleteProject,
  onGenerateInvoice,
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
      role="article"
      aria-label={`Project: ${clientName || 'Unnamed'}, Status: ${config.label}${quoteValue ? `, Value: $${quoteValue.toLocaleString()}` : ''}`}
      className={`
        group relative bg-[#1a1a1a] border border-white/10 rounded-xl p-3 cursor-grab
        hover:border-[#F6B45A]/40 hover:bg-[#1f1f1f] transition-all duration-200
        ${isDragging ? 'border-[#F6B45A]/60 z-50' : ''}
      `}
    >
      {/* Primary Action Button - Always visible based on status */}
      {(() => {
        // Determine the primary action based on project status
        let primaryAction = null;

        if (project.status === 'draft' && onGenerateQuote) {
          primaryAction = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateQuote(project);
              }}
              className="px-2 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-colors text-[10px] font-medium flex items-center gap-1"
              title="Generate quote"
              aria-label="Generate quote for this project"
            >
              <FileText className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Quote</span>
            </button>
          );
        } else if (project.status === 'quoted' && onSendQuote && project.quote) {
          primaryAction = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSendQuote(project);
              }}
              className="px-2 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-colors text-[10px] font-medium flex items-center gap-1"
              title="Send quote to client"
              aria-label="Send quote to client"
            >
              <Send className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Send</span>
            </button>
          );
        } else if (project.status === 'approved' && onScheduleProject) {
          primaryAction = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onScheduleProject(project);
              }}
              className="px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-medium flex items-center gap-1"
              title="Schedule installation"
              aria-label="Schedule installation for this project"
            >
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Schedule</span>
            </button>
          );
        } else if (project.status === 'scheduled' && onCompleteProject) {
          primaryAction = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompleteProject(project);
              }}
              className="px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-medium flex items-center gap-1"
              title="Mark as complete"
              aria-label="Mark this project as complete"
            >
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Complete</span>
            </button>
          );
        } else if (project.status === 'completed' && onGenerateInvoice) {
          primaryAction = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateInvoice(project);
              }}
              className="px-2 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors text-[10px] font-medium flex items-center gap-1"
              title="Generate invoice"
              aria-label="Generate invoice for this project"
            >
              <Receipt className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Invoice</span>
            </button>
          );
        }

        return primaryAction ? (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {primaryAction}
            <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </div>
        ) : (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEditProject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProject(project);
                }}
                className="p-1 rounded-md bg-white/10 hover:bg-[#F6B45A]/20 text-gray-400 hover:text-[#F6B45A] transition-colors"
                title="Edit project"
                aria-label="Edit this project"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            <GripVertical className="w-4 h-4 text-gray-600" aria-hidden="true" />
          </div>
        );
      })()}

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
