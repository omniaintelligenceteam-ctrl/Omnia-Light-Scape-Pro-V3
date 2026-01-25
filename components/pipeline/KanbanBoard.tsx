import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  CheckSquare,
  Square,
  ChevronDown,
  Send,
  FileText,
  CalendarPlus,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { SavedProject, ProjectStatus } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { useToast } from '../Toast';

// Filter options
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'older';
type ValueFilter = 'all' | 'high' | 'medium' | 'low';

interface Filters {
  search: string;
  dateRange: DateFilter;
  valueRange: ValueFilter;
  showStale: boolean; // Projects older than 30 days
}

// Type for optimistic updates
interface OptimisticUpdate {
  projectId: string;
  originalStatus: ProjectStatus;
  newStatus: ProjectStatus;
}

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
  onEditProject?: (project: SavedProject) => void;
  onSendQuote?: (project: SavedProject) => void;
  onGenerateQuote?: (project: SavedProject) => void;
  onScheduleProject?: (project: SavedProject) => void;
  onCompleteProject?: (project: SavedProject) => void;
  onGenerateInvoice?: (project: SavedProject) => void;
  onBatchStatusChange?: (projectIds: string[], newStatus: ProjectStatus) => Promise<boolean>;
  onBatchSendQuotes?: (projects: SavedProject[]) => Promise<void>;
  onBatchGenerateQuotes?: (projects: SavedProject[]) => Promise<void>;
  onBatchSchedule?: (projects: SavedProject[]) => Promise<void>;
  onBatchDelete?: (projectIds: string[]) => Promise<void>;
}

// Define the order of columns
// Completed projects are managed separately (not shown in Kanban workflow view)
const COLUMN_ORDER: ProjectStatus[] = ['draft', 'quoted', 'approved', 'scheduled'];

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 10) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  statusConfig,
  onStatusChange,
  onProjectClick,
  onEditProject,
  onSendQuote,
  onGenerateQuote,
  onScheduleProject,
  onCompleteProject,
  onGenerateInvoice,
  onBatchStatusChange,
  onBatchSendQuotes,
  onBatchGenerateQuotes,
  onBatchSchedule,
  onBatchDelete,
}) => {
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    dateRange: 'all',
    valueRange: 'all',
    showStale: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Batch selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchStatusMenu, setShowBatchStatusMenu] = useState(false);
  const [batchActionPending, setBatchActionPending] = useState(false);

  // Handle keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter projects based on current filters
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const clientName = (project.quote?.clientDetails?.name || project.clientName || '').toLowerCase();
        const projectName = (project.name || '').toLowerCase();
        const address = (project.quote?.clientDetails?.address || '').toLowerCase();

        if (!clientName.includes(searchLower) &&
            !projectName.includes(searchLower) &&
            !address.includes(searchLower)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const projectDate = new Date(project.date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (filters.dateRange) {
          case 'today':
            if (daysDiff > 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
          case 'older':
            if (daysDiff <= 30) return false;
            break;
        }
      }

      // Value range filter
      if (filters.valueRange !== 'all') {
        const value = project.quote?.total || 0;
        switch (filters.valueRange) {
          case 'high':
            if (value < 5000) return false;
            break;
          case 'medium':
            if (value < 1000 || value >= 5000) return false;
            break;
          case 'low':
            if (value >= 1000) return false;
            break;
        }
      }

      // Stale projects filter (show only projects older than 30 days)
      if (filters.showStale) {
        const projectDate = new Date(project.date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) return false;
      }

      return true;
    });
  }, [projects, filters]);

  // Count of active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.valueRange !== 'all') count++;
    if (filters.showStale) count++;
    return count;
  }, [filters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      dateRange: 'all',
      valueRange: 'all',
      showStale: false,
    });
  }, []);

  // Apply optimistic updates to filtered projects for display
  const projectsWithOptimisticUpdates = useMemo(() => {
    if (optimisticUpdates.length === 0) return filteredProjects;

    return filteredProjects.map(project => {
      const update = optimisticUpdates.find(u => u.projectId === project.id);
      if (update) {
        return { ...project, status: update.newStatus };
      }
      return project;
    });
  }, [filteredProjects, optimisticUpdates]);

  // Group projects by status (using optimistically updated projects)
  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatus, SavedProject[]> = {
      draft: [],
      quoted: [],
      approved: [],
      scheduled: [],
      completed: [],
    };

    projectsWithOptimisticUpdates.forEach((project) => {
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
  }, [projectsWithOptimisticUpdates]);

  // Rollback an optimistic update
  const rollbackUpdate = useCallback((projectId: string) => {
    setOptimisticUpdates(prev => prev.filter(u => u.projectId !== projectId));
  }, []);

  // Clear a successful update from optimistic state
  const clearOptimisticUpdate = useCallback((projectId: string) => {
    setOptimisticUpdates(prev => prev.filter(u => u.projectId !== projectId));
  }, []);

  const handleDropProject = async (projectId: string, newStatus: ProjectStatus) => {
    // Find the project
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    const originalStatus = project.status;
    const statusLabel = statusConfig[newStatus]?.label || newStatus;

    // Optimistically update the UI immediately
    setOptimisticUpdates(prev => [
      ...prev.filter(u => u.projectId !== projectId), // Remove any existing update for this project
      { projectId, originalStatus, newStatus }
    ]);
    setPendingMove(projectId);

    try {
      const success = await onStatusChange(projectId, newStatus);

      if (!success) {
        // API returned false, rollback
        rollbackUpdate(projectId);
        showToast('error', `Couldn't move project to ${statusLabel}. Please try again.`);
      } else {
        // Success - clear the optimistic update (real data should be coming from parent)
        clearOptimisticUpdate(projectId);
      }
    } catch (error) {
      // API error, rollback with toast notification
      console.error('Failed to update project status:', error);
      rollbackUpdate(projectId);
      showToast('error', `Failed to move project. Reverted to ${statusConfig[originalStatus]?.label || originalStatus}.`);
    } finally {
      setPendingMove(null);
    }
  };

  // Calculate pipeline totals (using optimistically updated grouping)
  const pipelineTotals = useMemo(() => {
    const total = projectsWithOptimisticUpdates.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
    const completed = projectsByStatus.completed.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
    const pending = total - completed;
    return { total, completed, pending };
  }, [projectsWithOptimisticUpdates, projectsByStatus.completed]);

  // Get selected projects
  const selectedProjects = useMemo(() => {
    return filteredProjects.filter(p => selectedIds.has(p.id));
  }, [filteredProjects, selectedIds]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    triggerHaptic(15);
    setSelectionMode(prev => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Toggle project selection
  const toggleProjectSelection = useCallback((projectId: string) => {
    triggerHaptic(5);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Select all visible projects
  const selectAll = useCallback(() => {
    triggerHaptic(10);
    setSelectedIds(new Set(filteredProjects.map(p => p.id)));
  }, [filteredProjects]);

  // Clear selection
  const clearSelection = useCallback(() => {
    triggerHaptic(5);
    setSelectedIds(new Set());
  }, []);

  // Exit selection mode on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectionMode]);

  // Batch status change handler
  const handleBatchStatusChange = useCallback(async (newStatus: ProjectStatus) => {
    if (selectedIds.size === 0) return;

    setShowBatchStatusMenu(false);
    setBatchActionPending(true);
    triggerHaptic([10, 50, 10]);

    try {
      if (onBatchStatusChange) {
        const success = await onBatchStatusChange(Array.from(selectedIds), newStatus);
        if (success) {
          showToast('success', `Moved ${selectedIds.size} projects to ${statusConfig[newStatus]?.label}`);
          setSelectedIds(new Set());
          setSelectionMode(false);
        } else {
          showToast('error', 'Failed to move some projects');
        }
      } else {
        // Fallback: update one by one
        let successCount = 0;
        for (const id of selectedIds) {
          const success = await onStatusChange(id, newStatus);
          if (success) successCount++;
        }
        if (successCount > 0) {
          showToast('success', `Moved ${successCount} projects to ${statusConfig[newStatus]?.label}`);
          setSelectedIds(new Set());
          setSelectionMode(false);
        }
      }
    } catch (error) {
      console.error('Batch status change failed:', error);
      showToast('error', 'Failed to update projects');
    } finally {
      setBatchActionPending(false);
    }
  }, [selectedIds, onBatchStatusChange, onStatusChange, statusConfig, showToast]);

  // Batch send quotes handler
  const handleBatchSendQuotes = useCallback(async () => {
    if (selectedProjects.length === 0) return;

    setBatchActionPending(true);
    triggerHaptic([10, 50, 10]);

    try {
      if (onBatchSendQuotes) {
        await onBatchSendQuotes(selectedProjects);
        showToast('success', `Sending ${selectedProjects.length} quotes`);
        setSelectedIds(new Set());
        setSelectionMode(false);
      } else if (onSendQuote) {
        for (const project of selectedProjects) {
          onSendQuote(project);
        }
      }
    } catch (error) {
      console.error('Batch send quotes failed:', error);
      showToast('error', 'Failed to send quotes');
    } finally {
      setBatchActionPending(false);
    }
  }, [selectedProjects, onBatchSendQuotes, onSendQuote, showToast]);

  // Batch generate quotes handler
  const handleBatchGenerateQuotes = useCallback(async () => {
    if (selectedProjects.length === 0) return;

    setBatchActionPending(true);
    triggerHaptic([10, 50, 10]);

    try {
      if (onBatchGenerateQuotes) {
        await onBatchGenerateQuotes(selectedProjects);
        showToast('success', `Generating ${selectedProjects.length} quotes`);
        setSelectedIds(new Set());
        setSelectionMode(false);
      } else if (onGenerateQuote) {
        for (const project of selectedProjects) {
          onGenerateQuote(project);
        }
      }
    } catch (error) {
      console.error('Batch generate quotes failed:', error);
      showToast('error', 'Failed to generate quotes');
    } finally {
      setBatchActionPending(false);
    }
  }, [selectedProjects, onBatchGenerateQuotes, onGenerateQuote, showToast]);

  // Batch schedule handler
  const handleBatchSchedule = useCallback(async () => {
    if (selectedProjects.length === 0) return;

    setBatchActionPending(true);
    triggerHaptic([10, 50, 10]);

    try {
      if (onBatchSchedule) {
        await onBatchSchedule(selectedProjects);
        showToast('success', `Scheduling ${selectedProjects.length} projects`);
        setSelectedIds(new Set());
        setSelectionMode(false);
      } else if (onScheduleProject) {
        for (const project of selectedProjects) {
          onScheduleProject(project);
        }
      }
    } catch (error) {
      console.error('Batch schedule failed:', error);
      showToast('error', 'Failed to schedule projects');
    } finally {
      setBatchActionPending(false);
    }
  }, [selectedProjects, onBatchSchedule, onScheduleProject, showToast]);

  // Batch delete handler
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.size} projects?`);
    if (!confirmed) return;

    setBatchActionPending(true);
    triggerHaptic([50, 100, 50]);

    try {
      if (onBatchDelete) {
        await onBatchDelete(Array.from(selectedIds));
        showToast('success', `Deleted ${selectedIds.size} projects`);
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      showToast('error', 'Failed to delete projects');
    } finally {
      setBatchActionPending(false);
    }
  }, [selectedIds, onBatchDelete, showToast]);

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 mb-4"
      >
        {/* Search and Quick Stats Row */}
        <div className="flex items-center gap-3">
          {/* Batch Selection Toggle */}
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
              selectionMode
                ? 'bg-[#F6B45A]/10 border-[#F6B45A]/30 text-[#F6B45A]'
                : 'bg-[#0f0f0f] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
            title="Toggle batch selection"
          >
            {selectionMode ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span className="text-sm hidden sm:inline">Select</span>
          </button>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search projects... (press /)"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-10 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#F6B45A]/10 border-[#F6B45A]/30 text-[#F6B45A]'
                : 'bg-[#0f0f0f] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#F6B45A] text-[#050505] text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Pipeline Stats */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-[#0f0f0f] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-white">${pipelineTotals.total.toLocaleString()}</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Active:</span>
              <span className="text-sm font-bold text-blue-400">${pipelineTotals.pending.toLocaleString()}</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs text-gray-500">
              {filteredProjects.length === projects.length
                ? `${projects.length} projects`
                : `${filteredProjects.length} of ${projects.length}`}
            </span>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 p-3 bg-[#0f0f0f] border border-white/10 rounded-xl">
                {/* Date Range Filter */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as DateFilter }))}
                    className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#F6B45A]/50 focus:outline-none"
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="older">Older than 30 days</option>
                  </select>
                </div>

                {/* Value Range Filter */}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <select
                    value={filters.valueRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, valueRange: e.target.value as ValueFilter }))}
                    className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#F6B45A]/50 focus:outline-none"
                  >
                    <option value="all">All values</option>
                    <option value="high">$5,000+</option>
                    <option value="medium">$1,000 - $5,000</option>
                    <option value="low">Under $1,000</option>
                  </select>
                </div>

                {/* Stale Projects Toggle */}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, showStale: !prev.showStale }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                    filters.showStale
                      ? 'bg-red-500/20 border-red-500/30 text-red-400'
                      : 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Stale only</span>
                </button>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Batch Actions Toolbar */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 p-3 bg-[#F6B45A]/5 border border-[#F6B45A]/20 rounded-xl">
                {/* Selection info */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-medium">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={selectAll}
                      className="px-2 py-1 text-xs text-[#F6B45A] hover:bg-[#F6B45A]/10 rounded transition-colors"
                    >
                      Select all
                    </button>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-white/10" />

                {/* Batch Actions */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Move to status dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowBatchStatusMenu(!showBatchStatusMenu)}
                        disabled={batchActionPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors disabled:opacity-50"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Move to
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {/* Status dropdown */}
                      <AnimatePresence>
                        {showBatchStatusMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[140px]"
                          >
                            {COLUMN_ORDER.map((status) => (
                              <button
                                key={status}
                                onClick={() => handleBatchStatusChange(status)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors"
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: statusConfig[status]?.color?.replace('text-', '') || '#666' }}
                                />
                                <span className={statusConfig[status]?.color || 'text-gray-400'}>
                                  {statusConfig[status]?.label || status}
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Generate quotes */}
                    {(onBatchGenerateQuotes || onGenerateQuote) && (
                      <button
                        onClick={handleBatchGenerateQuotes}
                        disabled={batchActionPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate Quotes</span>
                      </button>
                    )}

                    {/* Send quotes */}
                    {(onBatchSendQuotes || onSendQuote) && (
                      <button
                        onClick={handleBatchSendQuotes}
                        disabled={batchActionPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send Quotes</span>
                      </button>
                    )}

                    {/* Schedule */}
                    {(onBatchSchedule || onScheduleProject) && (
                      <button
                        onClick={handleBatchSchedule}
                        disabled={batchActionPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors disabled:opacity-50"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Schedule</span>
                      </button>
                    )}

                    {/* Delete */}
                    {onBatchDelete && (
                      <button
                        onClick={handleBatchDelete}
                        disabled={batchActionPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Close selection mode */}
                <div className="ml-auto">
                  <button
                    onClick={toggleSelectionMode}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Kanban Columns Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {filteredProjects.length === 0 && activeFilterCount > 0 ? (
          /* Empty State when filters return no results */
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No projects found</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {filters.search
                ? `No projects match "${filters.search}"`
                : 'No projects match the current filters'}
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-[#F6B45A]/20 hover:bg-[#F6B45A]/30 text-[#F6B45A] rounded-lg text-sm font-medium transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
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
                  onEditProject={onEditProject}
                  onSendQuote={onSendQuote}
                  onGenerateQuote={onGenerateQuote}
                  onScheduleProject={onScheduleProject}
                  onCompleteProject={onCompleteProject}
                  onGenerateInvoice={onGenerateInvoice}
                  onDropProject={handleDropProject}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleProjectSelection}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Subtle saving indicator - optimistic updates make the UI feel instant */}
      {pendingMove && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-full shadow-lg flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-[#F6B45A] animate-pulse" />
          <span className="text-xs text-gray-400">Saving...</span>
        </motion.div>
      )}
    </div>
  );
};
