import React, { useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  Trash2, Lock, Unlock,
  Grid, RotateCcw, Download, Crosshair, Layers, Copy, Clipboard, Undo2, Redo2
} from 'lucide-react';
import {
  LightFixture,
  FixtureCategory,
  getFixturePreset,
  createFixture,
} from '../types/fixtures';

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

// Custom cursor: arrow pointer + colored dot
function getPlacementCursor(hexColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="8" cy="8" r="7" fill="${hexColor}" stroke="white" stroke-width="1.5" opacity="0.9"/><path d="M8 8 L8 26 L13 21 L18 30 L21 28 L16 20 L23 20 Z" fill="white" stroke="black" stroke-width="1.2"/></svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}') 8 8, auto`;
}

export interface FixturePlacerProps {
  imageUrl: string;
  fixtures: LightFixture[];
  onFixturesChange: (fixtures: LightFixture[]) => void;
  activeFixtureType: FixtureCategory | null;
  markerColors: Record<string, string>;
  cursorColor?: string;
  imageNaturalAspect?: number;
  containerClassName?: string;
  readOnly?: boolean;
}

export interface FixturePlacerHandle {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearAll: () => void;
}

const MAX_HISTORY = 50;

export const FixturePlacer = forwardRef<FixturePlacerHandle, FixturePlacerProps>(({
  fixtures,
  onFixturesChange,
  activeFixtureType,
  markerColors,
  cursorColor,
  imageNaturalAspect = 16 / 10,
  containerClassName,
  readOnly = false,
}, ref) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; fixtureId: string | null; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize] = useState(5);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Undo/Redo history
  const [history, setHistory] = useState<LightFixture[][]>([fixtures]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Sync external fixture changes into history (e.g., external clear)
  const prevFixturesRef = useRef(fixtures);
  useEffect(() => {
    if (prevFixturesRef.current !== fixtures) {
      // External change detected — only reset history if it's a fundamentally different set
      // (e.g., clear all from parent). Skip if it's our own change propagating back.
      const prevLen = prevFixturesRef.current.length;
      const newLen = fixtures.length;
      if (newLen === 0 && prevLen > 0) {
        // External clear
        setHistory([[]]);
        setHistoryIndex(0);
      }
      prevFixturesRef.current = fixtures;
    }
  }, [fixtures]);

  const pushToHistory = useCallback((newFixtures: LightFixture[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, newFixtures].slice(-MAX_HISTORY);
      return updated;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    prevFixturesRef.current = newFixtures;
    onFixturesChange(newFixtures);
  }, [historyIndex, onFixturesChange]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex(i => i - 1);
    prevFixturesRef.current = prev;
    onFixturesChange(prev);
  }, [canUndo, history, historyIndex, onFixturesChange]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(i => i + 1);
    prevFixturesRef.current = next;
    onFixturesChange(next);
  }, [canRedo, history, historyIndex, onFixturesChange]);

  // Selected fixture helper
  const selectedFixture = useMemo(() =>
    fixtures.find(f => f.id === selectedId),
    [fixtures, selectedId]
  );

  // Compute image bounds accounting for letterboxing
  const imageBounds = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return { offsetX: 0, offsetY: 0, width: containerSize.width || 1, height: containerSize.height || 1 };
    }
    const containerAspect = containerSize.width / containerSize.height;
    if (containerAspect > imageNaturalAspect) {
      const renderedHeight = containerSize.height;
      const renderedWidth = containerSize.height * imageNaturalAspect;
      return { offsetX: (containerSize.width - renderedWidth) / 2, offsetY: 0, width: renderedWidth, height: renderedHeight };
    } else {
      const renderedWidth = containerSize.width;
      const renderedHeight = containerSize.width / imageNaturalAspect;
      return { offsetX: 0, offsetY: (containerSize.height - renderedHeight) / 2, width: renderedWidth, height: renderedHeight };
    }
  }, [containerSize, imageNaturalAspect]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Convert screen coords to image-relative percentage
  const toImageCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    let x = ((clientX - rect.left - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((clientY - rect.top - imageBounds.offsetY) / imageBounds.height) * 100;
    if (x < -2 || x > 102 || y < -2 || y > 102) return null;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    return { x, y };
  }, [imageBounds, snapToGrid, gridSize]);

  // Find fixture near a screen position
  const findFixtureAtScreen = useCallback((clientX: number, clientY: number, radius = 20): LightFixture | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    let nearest: { fixture: LightFixture; dist: number } | null = null;
    for (const f of fixtures) {
      const fx = imageBounds.offsetX + (f.x / 100) * imageBounds.width;
      const fy = imageBounds.offsetY + (f.y / 100) * imageBounds.height;
      const dist = Math.sqrt(Math.pow(sx - fx, 2) + Math.pow(sy - fy, 2));
      if (dist < radius && (!nearest || dist < nearest.dist)) {
        nearest = { fixture: f, dist };
      }
    }
    return nearest?.fixture ?? null;
  }, [fixtures, imageBounds]);

  // ── Mouse Handlers ──

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || e.button !== 0) return;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

    const fixture = findFixtureAtScreen(e.clientX, e.clientY);
    if (fixture) {
      if (fixture.locked) {
        setSelectedId(fixture.id);
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      setSelectedId(fixture.id);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const fx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
        const fy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
        dragOffsetRef.current = { x: e.clientX - rect.left - fx, y: e.clientY - rect.top - fy };
      }
      triggerHaptic('light');
    }
  }, [readOnly, findFixtureAtScreen, imageBounds]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectedId || readOnly) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = ((e.clientX - rect.left - dragOffsetRef.current.x - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((e.clientY - rect.top - dragOffsetRef.current.y - imageBounds.offsetY) / imageBounds.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    // Update position live (no history push during drag)
    const updated = fixtures.map(f => f.id === selectedId ? { ...f, x, y } : f);
    prevFixturesRef.current = updated;
    onFixturesChange(updated);
  }, [isDragging, selectedId, readOnly, snapToGrid, gridSize, imageBounds, fixtures, onFixturesChange]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      // Push final drag position to history
      pushToHistory(fixtures);
      setIsDragging(false);
      triggerHaptic('light');
      return;
    }

    // Quick click → place new fixture
    if (!activeFixtureType || readOnly) return;
    if (mouseDownPosRef.current) {
      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      if (dx > 3 || dy > 3) return;
    }

    // Don't place if clicking on existing fixture
    const existing = findFixtureAtScreen(e.clientX, e.clientY);
    if (existing) {
      setSelectedId(existing.id);
      return;
    }

    const coords = toImageCoords(e.clientX, e.clientY);
    if (!coords) return;

    const newFixture = createFixture(coords.x, coords.y, activeFixtureType);
    pushToHistory([...fixtures, newFixture]);
    setSelectedId(newFixture.id);
    triggerHaptic('medium');
  }, [isDragging, activeFixtureType, readOnly, fixtures, findFixtureAtScreen, toImageCoords, pushToHistory]);

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (readOnly) return;
    const fixture = findFixtureAtScreen(e.clientX, e.clientY, 30);
    if (fixture) {
      const updated = fixtures.filter(f => f.id !== fixture.id);
      pushToHistory(updated);
      if (selectedId === fixture.id) setSelectedId(null);
      triggerHaptic('medium');
    }
  }, [readOnly, fixtures, findFixtureAtScreen, selectedId, pushToHistory]);

  // ── Touch Handlers ──

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (readOnly || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const fixture = findFixtureAtScreen(touch.clientX, touch.clientY);

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      fixtureId: fixture?.id ?? null,
      time: Date.now(),
    };

    if (fixture) {
      setSelectedId(fixture.id);
      if (!fixture.locked) {
        // Start drag
        setIsDragging(true);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const fx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
          const fy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
          dragOffsetRef.current = { x: touch.clientX - rect.left - fx, y: touch.clientY - rect.top - fy };
        }
        // Long-press to delete (500ms)
        longPressTimerRef.current = setTimeout(() => {
          const updated = fixtures.filter(f => f.id !== fixture.id);
          pushToHistory(updated);
          setSelectedId(null);
          setIsDragging(false);
          triggerHaptic('heavy');
        }, 500);
      }
      triggerHaptic('light');
    }
  }, [readOnly, findFixtureAtScreen, imageBounds, fixtures, pushToHistory]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Cancel long-press on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isDragging || !selectedId || readOnly) return;
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = ((touch.clientX - rect.left - dragOffsetRef.current.x - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((touch.clientY - rect.top - dragOffsetRef.current.y - imageBounds.offsetY) / imageBounds.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    const updated = fixtures.map(f => f.id === selectedId ? { ...f, x, y } : f);
    prevFixturesRef.current = updated;
    onFixturesChange(updated);
  }, [isDragging, selectedId, readOnly, snapToGrid, gridSize, imageBounds, fixtures, onFixturesChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDragging) {
      pushToHistory(fixtures);
      setIsDragging(false);
      triggerHaptic('light');
      touchStartRef.current = null;
      return;
    }

    // Quick tap → place new fixture
    if (!touchStartRef.current || touchStartRef.current.fixtureId) {
      touchStartRef.current = null;
      return;
    }
    if (!activeFixtureType || readOnly) {
      touchStartRef.current = null;
      return;
    }

    const changedTouch = e.changedTouches[0];
    if (changedTouch) {
      const dx = Math.abs(changedTouch.clientX - touchStartRef.current.x);
      const dy = Math.abs(changedTouch.clientY - touchStartRef.current.y);
      if (dx > 10 || dy > 10) {
        touchStartRef.current = null;
        return;
      }
      const coords = toImageCoords(touchStartRef.current.x, touchStartRef.current.y);
      if (coords) {
        const newFixture = createFixture(coords.x, coords.y, activeFixtureType);
        pushToHistory([...fixtures, newFixture]);
        setSelectedId(newFixture.id);
        triggerHaptic('medium');
      }
    }
    touchStartRef.current = null;
  }, [isDragging, activeFixtureType, readOnly, fixtures, toImageCoords, pushToHistory]);

  // ── Toolbar Actions ──

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const updated = fixtures.filter(f => f.id !== selectedId);
    pushToHistory(updated);
    setSelectedId(null);
    triggerHaptic('medium');
  }, [selectedId, fixtures, pushToHistory]);

  const toggleLock = useCallback(() => {
    if (!selectedId) return;
    const updated = fixtures.map(f =>
      f.id === selectedId ? { ...f, locked: !f.locked } : f
    );
    pushToHistory(updated);
    triggerHaptic('light');
  }, [selectedId, fixtures, pushToHistory]);

  const duplicateSelected = useCallback(() => {
    if (!selectedFixture) return;
    const newFixture: LightFixture = {
      ...selectedFixture,
      id: `fixture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(100, selectedFixture.x + 5),
      y: Math.min(100, selectedFixture.y + 5),
      locked: false,
    };
    pushToHistory([...fixtures, newFixture]);
    setSelectedId(newFixture.id);
    triggerHaptic('medium');
  }, [selectedFixture, fixtures, pushToHistory]);

  const clearAll = useCallback(() => {
    if (fixtures.length === 0) return;
    if (window.confirm('Remove all fixtures?')) {
      pushToHistory([]);
      setSelectedId(null);
      triggerHaptic('heavy');
    }
  }, [fixtures, pushToHistory]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(fixtures, null, 2);
    navigator.clipboard.writeText(data);
    triggerHaptic('medium');
  }, [fixtures]);

  const handleImport = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        pushToHistory(imported);
        triggerHaptic('medium');
      }
    } catch {
      console.error('Failed to import fixtures');
    }
  }, [pushToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          deleteSelected();
          break;
        case 'Escape':
          setSelectedId(null);
          break;
        case 'd':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); duplicateSelected(); }
          break;
        case 'l':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); toggleLock(); }
          break;
        case 'g':
          if (!e.metaKey && !e.ctrlKey) setShowGrid(prev => !prev);
          break;
        case 'z':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) { redo(); } else { undo(); }
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, duplicateSelected, toggleLock, undo, redo]);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    get canUndo() { return historyIndex > 0; },
    get canRedo() { return historyIndex < history.length - 1; },
    clearAll,
  }), [undo, redo, historyIndex, history.length, clearAll]);

  const cursorStyle = isDragging
    ? 'grabbing'
    : (activeFixtureType && cursorColor)
      ? getPlacementCursor(cursorColor)
      : 'default';

  return (
    <div className={containerClassName || 'relative w-full h-full'}>
      {/* Floating Toolbar */}
      {!readOnly && (
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center gap-1.5 p-1.5 bg-[#0d0d0d]/90 backdrop-blur border border-white/10 rounded-xl overflow-x-auto">
          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`p-1.5 rounded-lg transition-all ${showGrid ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Toggle Grid (G)"
          >
            <Grid size={16} />
          </button>

          {/* Snap to grid */}
          <button
            onClick={() => setSnapToGrid(prev => !prev)}
            className={`p-1.5 rounded-lg transition-all ${snapToGrid ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Snap to Grid"
          >
            <Crosshair size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 flex-shrink-0" />

          {/* Selected fixture actions (contextual) */}
          {selectedFixture && (
            <>
              <button
                onClick={duplicateSelected}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                title="Duplicate (Ctrl+D)"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={toggleLock}
                className={`p-1.5 rounded-lg transition-all ${selectedFixture.locked ? 'text-[#F6B45A]' : 'text-gray-400 hover:text-[#F6B45A] hover:bg-white/5'}`}
                title="Lock/Unlock (Ctrl+L)"
              >
                {selectedFixture.locked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
              <button
                onClick={deleteSelected}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all"
                title="Delete (Del)"
              >
                <Trash2 size={16} />
              </button>
              <div className="w-px h-5 bg-white/10 flex-shrink-0" />
            </>
          )}

          {/* Import/Export */}
          <button
            onClick={handleImport}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Import from Clipboard"
          >
            <Clipboard size={16} />
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Export to Clipboard"
          >
            <Download size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 flex-shrink-0" />

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>

          {/* Clear All */}
          <button
            onClick={clearAll}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all"
            title="Clear All"
          >
            <RotateCcw size={16} />
          </button>

          {/* Fixture count (right-aligned) */}
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-500 flex-shrink-0">
            <Layers size={12} />
            <span>{fixtures.length}</span>
          </div>
        </div>
      )}

      {/* Interactive Surface */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ cursor: cursorStyle, touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (isDragging) { pushToHistory(fixtures); setIsDragging(false); } }}
        onContextMenu={handleRightClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid Overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${gridSize}% ${gridSize}%`,
            }}
          />
        )}

        {/* Fixture Markers */}
        {fixtures.map(fixture => {
          const isSelected = fixture.id === selectedId;
          const preset = getFixturePreset(fixture.type);
          const hexColor = markerColors[fixture.type] || '#FF0000';

          return (
            <div
              key={fixture.id}
              className="absolute pointer-events-none"
              style={{
                left: imageBounds.offsetX + (fixture.x / 100) * imageBounds.width,
                top: imageBounds.offsetY + (fixture.y / 100) * imageBounds.height,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 100 : 10,
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  left: -32,
                  top: -32,
                  background: `radial-gradient(circle, ${hexColor}80 0%, ${hexColor}26 50%, transparent 70%)`,
                  filter: 'blur(4px)',
                }}
              />
              {/* Core dot */}
              <div
                className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-transform ${
                  isSelected ? 'ring-2 ring-[#F6B45A] ring-offset-1 ring-offset-transparent scale-125' : ''
                } ${fixture.locked ? 'opacity-60' : ''}`}
                style={{
                  left: -10,
                  top: -10,
                  backgroundColor: hexColor,
                  borderColor: 'white',
                  boxShadow: `0 0 12px ${hexColor}B3`,
                }}
              >
                <span className="text-[9px] text-white font-bold leading-none">{preset.icon}</span>
                {fixture.locked && (
                  <Lock size={7} className="absolute -top-1.5 -right-1.5 text-[#F6B45A] bg-black/60 rounded-full p-0.5" />
                )}
              </div>
            </div>
          );
        })}

        {/* Active tool indicator */}
        {activeFixtureType && !readOnly && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-[10px] text-[#F6B45A] font-medium flex items-center gap-1.5 pointer-events-none">
            <Crosshair className="w-3 h-3" />
            Tap to place {getFixturePreset(activeFixtureType).name}
          </div>
        )}
      </div>
    </div>
  );
});

FixturePlacer.displayName = 'FixturePlacer';

export default FixturePlacer;
