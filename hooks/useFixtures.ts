/**
 * useFixtures Hook
 * 
 * React hook for managing fixture state and operations.
 * Provides a clean API for fixture placement workflows.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  LightFixture,
  FixtureCategory,
  FixtureLayout,
  createFixture,
  generateFixtureId,
  getFixturePreset
} from '../types/fixtures';
import { CompositeService, CompositeResult, CompositeConfig } from '../services/compositeService';

interface UseFixturesOptions {
  initialFixtures?: LightFixture[];
  autoSave?: boolean;
  storageKey?: string;
  maxFixtures?: number;
}

interface UseFixturesReturn {
  // State
  fixtures: LightFixture[];
  selectedId: string | null;
  selectedFixture: LightFixture | undefined;
  activeType: FixtureCategory;
  isProcessing: boolean;
  lastComposite: CompositeResult | null;

  // Actions
  addFixture: (x: number, y: number, type?: FixtureCategory) => LightFixture;
  removeFixture: (id: string) => void;
  updateFixture: (id: string, updates: Partial<LightFixture>) => void;
  selectFixture: (id: string | null) => void;
  setActiveType: (type: FixtureCategory) => void;
  duplicateFixture: (id: string) => LightFixture | null;
  clearAll: () => void;

  // Batch operations
  moveFixture: (id: string, x: number, y: number) => void;
  setFixtureIntensity: (id: string, intensity: number) => void;
  setFixtureColorTemp: (id: string, colorTemp: number) => void;
  lockFixture: (id: string, locked: boolean) => void;

  // Import/Export
  exportLayout: () => FixtureLayout;
  importLayout: (layout: FixtureLayout) => void;
  exportToJson: () => string;
  importFromJson: (json: string) => boolean;

  // Compositing
  generatePreview: (imageUrl: string) => Promise<string>;
  generateFinal: (imageUrl: string, config?: Partial<CompositeConfig>) => Promise<CompositeResult>;
  
  // Utilities
  getFixturesByType: (type: FixtureCategory) => LightFixture[];
  getFixtureCount: () => number;
  hasUnsavedChanges: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 50;

export function useFixtures(options: UseFixturesOptions = {}): UseFixturesReturn {
  const {
    initialFixtures = [],
    autoSave = false,
    storageKey = 'omnia_fixture_layout',
    maxFixtures = 100
  } = options;

  // Core state
  const [fixtures, setFixtures] = useState<LightFixture[]>(() => {
    if (autoSave && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore invalid JSON
        }
      }
    }
    return initialFixtures;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<FixtureCategory>('uplight');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastComposite, setLastComposite] = useState<CompositeResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<LightFixture[][]>([initialFixtures]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Computed values
  const selectedFixture = useMemo(
    () => fixtures.find(f => f.id === selectedId),
    [fixtures, selectedId]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Auto-save effect
  useEffect(() => {
    if (autoSave && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(fixtures));
    }
  }, [fixtures, autoSave, storageKey]);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [fixtures]);

  // Add to history
  const addToHistory = useCallback((newFixtures: LightFixture[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newFixtures);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // ===== Actions =====

  const addFixture = useCallback((
    x: number,
    y: number,
    type: FixtureCategory = activeType
  ): LightFixture => {
    if (fixtures.length >= maxFixtures) {
      throw new Error(`Maximum fixtures (${maxFixtures}) reached`);
    }

    const newFixture = createFixture(x, y, type);
    const newFixtures = [...fixtures, newFixture];
    setFixtures(newFixtures);
    addToHistory(newFixtures);
    setSelectedId(newFixture.id);
    return newFixture;
  }, [fixtures, activeType, maxFixtures, addToHistory]);

  const removeFixture = useCallback((id: string) => {
    const newFixtures = fixtures.filter(f => f.id !== id);
    setFixtures(newFixtures);
    addToHistory(newFixtures);
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [fixtures, selectedId, addToHistory]);

  const updateFixture = useCallback((id: string, updates: Partial<LightFixture>) => {
    const newFixtures = fixtures.map(f =>
      f.id === id ? { ...f, ...updates } : f
    );
    setFixtures(newFixtures);
    addToHistory(newFixtures);
  }, [fixtures, addToHistory]);

  const selectFixture = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const duplicateFixture = useCallback((id: string): LightFixture | null => {
    const fixture = fixtures.find(f => f.id === id);
    if (!fixture || fixtures.length >= maxFixtures) return null;

    const newFixture: LightFixture = {
      ...fixture,
      id: generateFixtureId(),
      x: Math.min(100, fixture.x + 5),
      y: Math.min(100, fixture.y + 5),
      locked: false,
      label: fixture.label ? `${fixture.label} (copy)` : undefined
    };

    const newFixtures = [...fixtures, newFixture];
    setFixtures(newFixtures);
    addToHistory(newFixtures);
    setSelectedId(newFixture.id);
    return newFixture;
  }, [fixtures, maxFixtures, addToHistory]);

  const clearAll = useCallback(() => {
    setFixtures([]);
    addToHistory([]);
    setSelectedId(null);
  }, [addToHistory]);

  // ===== Batch Operations =====

  const moveFixture = useCallback((id: string, x: number, y: number) => {
    updateFixture(id, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [updateFixture]);

  const setFixtureIntensity = useCallback((id: string, intensity: number) => {
    updateFixture(id, { intensity: Math.max(0, Math.min(1, intensity)) });
  }, [updateFixture]);

  const setFixtureColorTemp = useCallback((id: string, colorTemp: number) => {
    updateFixture(id, { colorTemp: Math.max(2700, Math.min(5000, colorTemp)) });
  }, [updateFixture]);

  const lockFixture = useCallback((id: string, locked: boolean) => {
    updateFixture(id, { locked });
  }, [updateFixture]);

  // ===== Import/Export =====

  const exportLayout = useCallback((): FixtureLayout => {
    return {
      id: generateFixtureId(),
      imageId: '',
      fixtures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [fixtures]);

  const importLayout = useCallback((layout: FixtureLayout) => {
    setFixtures(layout.fixtures);
    addToHistory(layout.fixtures);
    setSelectedId(null);
    setHasUnsavedChanges(false);
  }, [addToHistory]);

  const exportToJson = useCallback((): string => {
    return JSON.stringify(exportLayout(), null, 2);
  }, [exportLayout]);

  const importFromJson = useCallback((json: string): boolean => {
    try {
      const layout = JSON.parse(json) as FixtureLayout;
      if (layout.fixtures && Array.isArray(layout.fixtures)) {
        importLayout(layout);
        return true;
      }
    } catch {
      // Invalid JSON
    }
    return false;
  }, [importLayout]);

  // ===== Compositing =====

  const generatePreview = useCallback(async (imageUrl: string): Promise<string> => {
    return CompositeService.generateFixturePreview(imageUrl, fixtures);
  }, [fixtures]);

  const generateFinal = useCallback(async (
    imageUrl: string,
    config?: Partial<CompositeConfig>
  ): Promise<CompositeResult> => {
    setIsProcessing(true);
    try {
      const result = await CompositeService.compositeFixtures(imageUrl, fixtures, config);
      setLastComposite(result);
      setHasUnsavedChanges(false);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [fixtures]);

  // ===== Utilities =====

  const getFixturesByType = useCallback((type: FixtureCategory): LightFixture[] => {
    return fixtures.filter(f => f.type === type);
  }, [fixtures]);

  const getFixtureCount = useCallback((): number => {
    return fixtures.length;
  }, [fixtures]);

  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
      setFixtures(history[historyIndex - 1]);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
      setFixtures(history[historyIndex + 1]);
    }
  }, [canRedo, history, historyIndex]);

  return {
    // State
    fixtures,
    selectedId,
    selectedFixture,
    activeType,
    isProcessing,
    lastComposite,

    // Actions
    addFixture,
    removeFixture,
    updateFixture,
    selectFixture,
    setActiveType,
    duplicateFixture,
    clearAll,

    // Batch operations
    moveFixture,
    setFixtureIntensity,
    setFixtureColorTemp,
    lockFixture,

    // Import/Export
    exportLayout,
    importLayout,
    exportToJson,
    importFromJson,

    // Compositing
    generatePreview,
    generateFinal,

    // Utilities
    getFixturesByType,
    getFixtureCount,
    hasUnsavedChanges,
    undo,
    redo,
    canUndo,
    canRedo
  };
}

export default useFixtures;
