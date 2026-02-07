import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { GripVertical, Wand2, Send, FileText, Calendar, CheckCircle2, Receipt, MoreHorizontal, Eye, Trash2, Copy, ChevronLeft, ChevronRight, Check, Square } from 'lucide-react';
import { SavedProject, ProjectStatus } from '../../types';

// Status progression order for swipe navigation
const STATUS_ORDER: ProjectStatus[] = ['draft', 'quoted', 'approved', 'scheduled', 'completed'];

const getNextStatus = (current: ProjectStatus): ProjectStatus | null => {
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex < STATUS_ORDER.length - 1) {
    return STATUS_ORDER[currentIndex + 1];
  }
  return null;
};

const getPrevStatus = (current: ProjectStatus): ProjectStatus | null => {
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex > 0) {
    return STATUS_ORDER[currentIndex - 1];
  }
  return null;
};

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
  onDeleteProject?: (project: SavedProject) => void;
  onDuplicateProject?: (project: SavedProject) => void;
  onStatusChange?: (project: SavedProject, newStatus: ProjectStatus) => void;
  isDragging?: boolean;
  // Batch selection props
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (projectId: string) => void;
}

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 80;
// Long press duration in milliseconds
const LONG_PRESS_DURATION = 500;

// Quick action definitions for each status
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  handler: () => void;
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
  onDeleteProject,
  onDuplicateProject,
  onStatusChange,
  isDragging = false,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Motion values for swipe gesture
  const x = useMotionValue(0);
  const leftIndicatorOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 20, SWIPE_THRESHOLD], [0, 0.5, 1]);

  const config = statusConfig[project.status];
  const clientName = project.quote?.clientDetails?.name || project.clientName;
  const quoteValue = project.quote?.total;

  // Get next/prev status for swipe hints
  const nextStatus = getNextStatus(project.status);
  const prevStatus = getPrevStatus(project.status);

  // Check if device supports touch
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 25, heavy: 50 };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Handle swipe end
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Calculate if swipe was significant enough
    const swipeThresholdMet = Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500;

    if (swipeThresholdMet && onStatusChange) {
      if (offset > 0 && nextStatus) {
        // Swipe right - move to next status
        triggerHaptic('medium');
        onStatusChange(project, nextStatus);
      } else if (offset < 0 && prevStatus) {
        // Swipe left - move to previous status
        triggerHaptic('medium');
        onStatusChange(project, prevStatus);
      }
    }

    setSwipeDirection(null);
  }, [project, nextStatus, prevStatus, onStatusChange, triggerHaptic]);

  // Handle drag movement for visual feedback
  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 20) {
      setSwipeDirection('right');
    } else if (info.offset.x < -20) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  }, []);

  // Long press handlers
  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      triggerHaptic('heavy');
      setShowQuickMenu(true);
    }, LONG_PRESS_DURATION);
  }, [triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Calculate days since project was created/last updated
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(project.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build list of available quick actions based on project status
  const quickActions: QuickAction[] = [];

  // View/Edit is always available
  if (onEditProject) {
    quickActions.push({
      id: 'view',
      label: 'View Details',
      icon: Eye,
      color: 'text-white',
      bgColor: 'bg-white/10 hover:bg-white/20',
      handler: () => onEditProject(project),
    });
  }

  // Status-specific primary action
  if (project.status === 'draft' && onGenerateQuote) {
    quickActions.push({
      id: 'quote',
      label: 'Generate Quote',
      icon: FileText,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20 hover:bg-purple-500/30',
      handler: () => onGenerateQuote(project),
    });
  }

  if (project.status === 'quoted' && onSendQuote && project.quote) {
    quickActions.push({
      id: 'send',
      label: 'Send Quote',
      icon: Send,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20 hover:bg-purple-500/30',
      handler: () => onSendQuote(project),
    });
  }

  if (project.status === 'approved' && onScheduleProject) {
    quickActions.push({
      id: 'schedule',
      label: 'Schedule Install',
      icon: Calendar,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20 hover:bg-emerald-500/30',
      handler: () => onScheduleProject(project),
    });
  }

  if (project.status === 'scheduled' && onCompleteProject) {
    quickActions.push({
      id: 'complete',
      label: 'Mark Complete',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20 hover:bg-emerald-500/30',
      handler: () => onCompleteProject(project),
    });
  }

  if (project.status === 'completed' && onGenerateInvoice) {
    quickActions.push({
      id: 'invoice',
      label: 'Generate Invoice',
      icon: Receipt,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20 hover:bg-blue-500/30',
      handler: () => onGenerateInvoice(project),
    });
  }

  // Secondary actions always available
  if (onDuplicateProject) {
    quickActions.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      color: 'text-gray-400',
      bgColor: 'bg-white/5 hover:bg-white/10',
      handler: () => onDuplicateProject(project),
    });
  }

  if (onDeleteProject) {
    quickActions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 hover:bg-red-500/20',
      handler: () => onDeleteProject(project),
    });
  }

  // Native HTML drag handlers for desktop Kanban column drops
  const handleNativeDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', project.id);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.cursor = 'grabbing';
    setShowQuickMenu(false);
  };

  const handleNativeDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    target.style.cursor = 'grab';
  };

  // Handle card click (prevent if it was a long press)
  const handleCardClick = useCallback(() => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    // In selection mode, toggle selection instead of opening project
    if (selectionMode && onToggleSelection) {
      onToggleSelection(project.id);
      return;
    }
    onProjectClick(project);
  }, [onProjectClick, project, selectionMode, onToggleSelection]);

  // Handle checkbox click
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(project.id);
    }
  }, [project.id, onToggleSelection]);

  return (
    <div className="relative">
      {/* Swipe Indicator - Left (Previous Status) */}
      {isTouchDevice && prevStatus && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center rounded-l-xl bg-gradient-to-r from-amber-500/30 to-transparent pointer-events-none z-10"
          style={{ opacity: leftIndicatorOpacity }}
        >
          <div className="flex flex-col items-center">
            <ChevronLeft className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] text-amber-400 font-medium mt-0.5">
              {statusConfig[prevStatus]?.label.split(' ')[0]}
            </span>
          </div>
        </motion.div>
      )}

      {/* Swipe Indicator - Right (Next Status) */}
      {isTouchDevice && nextStatus && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center rounded-r-xl bg-gradient-to-l from-emerald-500/30 to-transparent pointer-events-none z-10"
          style={{ opacity: rightIndicatorOpacity }}
        >
          <div className="flex flex-col items-center">
            <ChevronRight className="w-5 h-5 text-emerald-400" />
            <span className="text-[9px] text-emerald-400 font-medium mt-0.5">
              {statusConfig[nextStatus]?.label.split(' ')[0]}
            </span>
          </div>
        </motion.div>
      )}

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: isDragging ? 0.8 : 1,
          scale: isDragging ? 1.02 : 1,
          boxShadow: isDragging
            ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(246, 180, 90, 0.2)'
            : swipeDirection
              ? '0 4px 16px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        // Swipe gesture for mobile (uses framer-motion drag)
        drag={isTouchDevice && onStatusChange ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDrag={isTouchDevice ? handleDrag : undefined}
        onDragEnd={isTouchDevice ? handleDragEnd : undefined}
        style={isTouchDevice ? { x } : undefined}
        // Native drag for desktop (uses HTML5 drag and drop for Kanban columns)
        draggable={!isTouchDevice}
        onDragStart={!isTouchDevice ? handleNativeDragStart as any : undefined}
        onDragEndCapture={!isTouchDevice ? handleNativeDragEnd as any : undefined}
        // Touch events for long press
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleCardClick}
        role="article"
        aria-label={`Project: ${clientName || 'Unnamed'}, Status: ${config.label}${quoteValue ? `, Value: $${quoteValue.toLocaleString()}` : ''}`}
        className={`
          group relative bg-[#1a1a1a] border rounded-xl overflow-hidden
          ${isTouchDevice ? 'touch-manipulation' : selectionMode ? 'cursor-pointer' : 'cursor-grab'}
          hover:border-[#F6B45A]/40 hover:bg-[#1f1f1f] transition-all duration-200
          ${isDragging ? 'border-[#F6B45A]/60 z-50' : ''}
          ${swipeDirection === 'right' ? 'border-emerald-500/40' : ''}
          ${swipeDirection === 'left' ? 'border-amber-500/40' : ''}
          ${isSelected ? 'border-[#F6B45A] bg-[#F6B45A]/5 ring-1 ring-[#F6B45A]/30' : 'border-white/10'}
          ${selectionMode ? '' : ''}
        `}
      >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div
          className="absolute left-2 top-2 z-10"
          onClick={handleCheckboxClick}
        >
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[#F6B45A] text-black'
                : 'bg-white/10 border border-white/20 text-transparent hover:border-[#F6B45A]/50'
            }`}
            aria-label={isSelected ? 'Deselect project' : 'Select project'}
          >
            {isSelected ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3 h-3 opacity-0" />
            )}
          </motion.button>
        </div>
      )}

      {/* Quick Actions - Primary action always visible, more on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Primary Action Button */}
        {quickActions.length > 0 && quickActions[0].id !== 'view' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              quickActions.find(a => a.id !== 'view' && a.id !== 'duplicate' && a.id !== 'delete')?.handler();
            }}
            className={`px-2 py-1 rounded-md ${
              quickActions.find(a => a.id !== 'view' && a.id !== 'duplicate' && a.id !== 'delete')?.bgColor || 'bg-white/10'
            } ${
              quickActions.find(a => a.id !== 'view' && a.id !== 'duplicate' && a.id !== 'delete')?.color || 'text-white'
            } transition-colors text-[10px] font-medium flex items-center gap-1`}
            title={quickActions.find(a => a.id !== 'view' && a.id !== 'duplicate' && a.id !== 'delete')?.label}
          >
            {(() => {
              const action = quickActions.find(a => a.id !== 'view' && a.id !== 'duplicate' && a.id !== 'delete');
              if (!action) return null;
              const Icon = action.icon;
              return (
                <>
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  <span className="hidden sm:inline">{action.label.split(' ')[0]}</span>
                </>
              );
            })()}
          </button>
        )}

        {/* More Actions Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowQuickMenu(!showQuickMenu);
            }}
            className={`p-1.5 rounded-md transition-all ${
              showQuickMenu
                ? 'bg-[#F6B45A]/20 text-[#F6B45A]'
                : 'bg-white/5 text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white'
            }`}
            title="More actions"
            aria-expanded={showQuickMenu}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Quick Actions Menu Dropdown */}
          <AnimatePresence>
            {showQuickMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  const isDestructive = action.id === 'delete';
                  return (
                    <button
                      key={action.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.handler();
                        setShowQuickMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                        isDestructive
                          ? 'text-red-400 hover:bg-red-500/10'
                          : `${action.color} hover:bg-white/5`
                      } ${index === 0 ? '' : 'border-t border-white/5'}`}
                      role="menuitem"
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      {action.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drag Handle */}
        <GripVertical
          className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
          aria-hidden="true"
        />
      </div>

      {/* Click outside to close menu */}
      {showQuickMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickMenu(false);
          }}
        />
      )}

      {/* Large Photo */}
      <div className="relative w-full aspect-[4/3] bg-black">
        {project.image ? (
          <img
            src={project.image}
            className="w-full h-full object-cover"
            alt={project.name}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
            <Wand2 className="w-8 h-8 text-gray-600" />
          </div>
        )}
        {/* Status dot */}
        <div
          className={`absolute bottom-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-black ${config.bgColor.replace('/10', '')}`}
        />
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-white truncate">
          {clientName || project.name}
        </h4>

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            {/* Only show price when quote exists with value > 0 */}
            {quoteValue && quoteValue > 0 ? (
              <span className="text-xs font-bold text-[#F6B45A]">
                ${quoteValue.toLocaleString()}
              </span>
            ) : project.status === 'draft' ? null : (
              /* Show dash for non-draft projects without a quote value */
              project.quote && (
                <span className="text-xs text-gray-500">—</span>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5">
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

    {/* Mobile swipe hint - shown only on first interaction */}
    {isTouchDevice && (nextStatus || prevStatus) && (
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[8px] text-gray-600 whitespace-nowrap">
          Swipe to change status
        </span>
      </div>
    )}
    </div>
  );
};
