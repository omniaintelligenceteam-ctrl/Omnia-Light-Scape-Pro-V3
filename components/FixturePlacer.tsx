import React, { useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  Trash2, Lock, Unlock,
  Grid, RotateCcw, Download, Crosshair, Layers, Copy, Clipboard, Undo2, Redo2, Eye, EyeOff,
  Minus,
} from 'lucide-react';
import {
  LightFixture,
  GutterLine,
  FixtureCategory,
  getFixturePreset,
  createFixture,
} from '../types/fixtures';
import { GradientPreview } from './GradientPreview';

// ── Gutter Line Constants ──
const GUTTER_SNAP_TYPES = new Set<FixtureCategory>(['uplight', 'spot', 'wall_wash', 'gutter_uplight']);
const GUTTER_SNAP_THRESHOLD = 15; // % distance
const MIN_LINE_LENGTH = 5;        // % minimum to save
const MAX_GUTTER_LINES = 10;      // maximum gutter lines allowed
const FIRST_STORY_Y_THRESHOLD = 45; // % from top — above this, fixtures MUST be on a gutter line

// ── Beam Cone Defaults Per Fixture Type ──
const UI_BEAM_DEFAULTS: Record<FixtureCategory, { height: number; width: number; defaultRotation: number }> = {
  uplight:        { height: 50, width: 30, defaultRotation: 0 },
  gutter_uplight: { height: 60, width: 40, defaultRotation: 0 },
  downlight:      { height: 50, width: 40, defaultRotation: 180 },
  path_light:     { height: 25, width: 35, defaultRotation: 0 },
  coredrill:      { height: 55, width: 25, defaultRotation: 0 },
  spot:           { height: 45, width: 20, defaultRotation: 0 },
  wall_wash:      { height: 45, width: 50, defaultRotation: 0 },
  well_light:     { height: 50, width: 28, defaultRotation: 0 },
  bollard:        { height: 25, width: 35, defaultRotation: 0 },
  step_light:     { height: 20, width: 35, defaultRotation: 180 },
};

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
  gutterLines?: GutterLine[];
  onGutterLinesChange?: (lines: GutterLine[]) => void;
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
  gutterLines: gutterLinesProp,
  onGutterLinesChange,
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
  const [isDraggingBeam, setIsDraggingBeam] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize] = useState(5);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showGradientPreview, setShowGradientPreview] = useState(false);

  // ── Gutter Line State (prop-driven or internal) ──
  const [gutterLinesInternal, setGutterLinesInternal] = useState<GutterLine[]>([]);
  const gutterLines = gutterLinesProp ?? gutterLinesInternal;
  const gutterLinesRef = useRef(gutterLines);
  gutterLinesRef.current = gutterLines;
  const onGutterLinesChangeRef = useRef(onGutterLinesChange);
  onGutterLinesChangeRef.current = onGutterLinesChange;
  const setGutterLines = useCallback((updater: GutterLine[] | ((prev: GutterLine[]) => GutterLine[])) => {
    const newLines = typeof updater === 'function' ? updater(gutterLinesRef.current) : updater;
    if (onGutterLinesChangeRef.current) {
      onGutterLinesChangeRef.current(newLines);
    } else {
      setGutterLinesInternal(newLines);
    }
  }, []);
  const [isDrawingGutter, setIsDrawingGutter] = useState(false);
  const [gutterDrawStart, setGutterDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [gutterDrawEnd, setGutterDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [snapToGutter, setSnapToGutter] = useState(true);

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

  // ── Gutter Snap Utility ──
  const findNearestGutterSnap = useCallback((px: number, py: number): { snappedX: number; snappedY: number; distance: number } | null => {
    if (gutterLines.length === 0) return null;
    let bestDist = Infinity;
    let bestX = px;
    let bestY = py;
    for (const line of gutterLines) {
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((px - line.startX) * dx + (py - line.startY) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const closestX = line.startX + t * dx;
      const closestY = line.startY + t * dy;
      const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestX = closestX;
        bestY = closestY;
      }
    }
    return bestDist <= GUTTER_SNAP_THRESHOLD ? { snappedX: bestX, snappedY: bestY, distance: bestDist } : null;
  }, [gutterLines]);

  // ── Gutter Line CRUD ──
  const addGutterLine = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (gutterLines.length >= MAX_GUTTER_LINES) {
      triggerHaptic('heavy');
      return;
    }
    const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    if (length < MIN_LINE_LENGTH) return;
    const newLine: GutterLine = {
      id: `gutter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startX, startY, endX, endY,
    };
    setGutterLines(prev => [...prev, newLine]);
    triggerHaptic('medium');
  }, [gutterLines.length]);

  const deleteGutterLine = useCallback((id: string) => {
    setGutterLines(prev => prev.filter(l => l.id !== id));
    triggerHaptic('light');
  }, []);

  const clearAllGutterLines = useCallback(() => {
    if (gutterLines.length === 0) return;
    setGutterLines([]);
    triggerHaptic('medium');
  }, [gutterLines]);

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

    // Gutter drawing mode: start line
    if (isDrawingGutter) {
      const coords = toImageCoords(e.clientX, e.clientY);
      if (coords) { setGutterDrawStart(coords); setGutterDrawEnd(coords); }
      return;
    }

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
  }, [readOnly, findFixtureAtScreen, imageBounds, isDrawingGutter, toImageCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Beam drag: update rotation + length
    if (isDraggingBeam && selectedId) {
      const fixture = fixtures.find(f => f.id === selectedId);
      if (!fixture) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fx = rect.left + imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
      const fy = rect.top + imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
      const dx = e.clientX - fx;
      const dy = e.clientY - fy;
      const angle = ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const defaults = UI_BEAM_DEFAULTS[fixture.type];
      const beamLength = Math.max(0.3, Math.min(2.5, dist / defaults.height));
      const updated = fixtures.map(f =>
        f.id === selectedId ? { ...f, rotation: Math.round(angle), beamLength: Math.round(beamLength * 100) / 100 } : f
      );
      prevFixturesRef.current = updated;
      onFixturesChange(updated);
      return;
    }
    // Gutter drawing mode: update preview
    if (isDrawingGutter && gutterDrawStart) {
      const coords = toImageCoords(e.clientX, e.clientY);
      if (coords) setGutterDrawEnd(coords);
      return;
    }
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
    // Snap to gutter line if eligible
    if (snapToGutter && gutterLines.length > 0) {
      const draggedFixture = fixtures.find(f => f.id === selectedId);
      if (draggedFixture && GUTTER_SNAP_TYPES.has(draggedFixture.type)) {
        const snap = findNearestGutterSnap(x, y);
        if (snap) { x = snap.snappedX; y = snap.snappedY; }
      }
    }
    // HARD RULE: Above first story, must be on a gutter line or clamp to threshold
    if (y < FIRST_STORY_Y_THRESHOLD) {
      const snap = findNearestGutterSnap(x, y);
      if (snap) { x = snap.snappedX; y = snap.snappedY; }
      else { y = FIRST_STORY_Y_THRESHOLD; }
    }
    // Update position live (no history push during drag)
    const updated = fixtures.map(f => f.id === selectedId ? { ...f, x, y } : f);
    prevFixturesRef.current = updated;
    onFixturesChange(updated);
  }, [isDragging, isDraggingBeam, selectedId, readOnly, snapToGrid, gridSize, imageBounds, fixtures, onFixturesChange, isDrawingGutter, gutterDrawStart, toImageCoords, snapToGutter, gutterLines, findNearestGutterSnap]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Beam drag end
    if (isDraggingBeam) {
      pushToHistory(fixtures);
      setIsDraggingBeam(false);
      triggerHaptic('light');
      return;
    }
    if (isDragging) {
      pushToHistory(fixtures);
      setIsDragging(false);
      triggerHaptic('light');
      return;
    }

    // Gutter drawing mode: finalize line (stay in drawing mode for multiple lines)
    if (isDrawingGutter && gutterDrawStart && gutterDrawEnd) {
      addGutterLine(gutterDrawStart.x, gutterDrawStart.y, gutterDrawEnd.x, gutterDrawEnd.y);
      setGutterDrawStart(null);
      setGutterDrawEnd(null);
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

    // Apply gutter snap for eligible fixture types
    let finalX = coords.x;
    let finalY = coords.y;
    if (snapToGutter && GUTTER_SNAP_TYPES.has(activeFixtureType)) {
      const snap = findNearestGutterSnap(coords.x, coords.y);
      if (snap) { finalX = snap.snappedX; finalY = snap.snappedY; }
    }

    // HARD RULE: Above first story, fixtures MUST be on a gutter line
    if (finalY < FIRST_STORY_Y_THRESHOLD) {
      const snap = findNearestGutterSnap(finalX, finalY);
      if (snap) {
        finalX = snap.snappedX;
        finalY = snap.snappedY;
      } else {
        // No gutter line nearby — reject placement
        triggerHaptic('heavy');
        return;
      }
    }

    const newFixture = createFixture(finalX, finalY, activeFixtureType);
    pushToHistory([...fixtures, newFixture]);
    setSelectedId(newFixture.id);
    triggerHaptic('medium');
  }, [isDragging, isDraggingBeam, activeFixtureType, readOnly, fixtures, findFixtureAtScreen, toImageCoords, pushToHistory, isDrawingGutter, gutterDrawStart, gutterDrawEnd, addGutterLine, snapToGutter, findNearestGutterSnap]);

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

    // Gutter drawing mode: start line
    if (isDrawingGutter) {
      const coords = toImageCoords(touch.clientX, touch.clientY);
      if (coords) { setGutterDrawStart(coords); setGutterDrawEnd(coords); }
      return;
    }

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
  }, [readOnly, findFixtureAtScreen, imageBounds, fixtures, pushToHistory, isDrawingGutter, toImageCoords]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Cancel long-press on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Beam drag: update rotation + length (touch)
    if (isDraggingBeam && selectedId) {
      const touch = e.touches[0];
      const fixture = fixtures.find(f => f.id === selectedId);
      if (!fixture || !touch) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fx = rect.left + imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
      const fy = rect.top + imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
      const dx = touch.clientX - fx;
      const dy = touch.clientY - fy;
      const angle = ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const defaults = UI_BEAM_DEFAULTS[fixture.type];
      const beamLength = Math.max(0.3, Math.min(2.5, dist / defaults.height));
      const updated = fixtures.map(f =>
        f.id === selectedId ? { ...f, rotation: Math.round(angle), beamLength: Math.round(beamLength * 100) / 100 } : f
      );
      prevFixturesRef.current = updated;
      onFixturesChange(updated);
      return;
    }
    // Gutter drawing mode: update preview
    if (isDrawingGutter && gutterDrawStart) {
      const touch = e.touches[0];
      const coords = toImageCoords(touch.clientX, touch.clientY);
      if (coords) setGutterDrawEnd(coords);
      return;
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
    // Snap to gutter line if eligible
    if (snapToGutter && gutterLines.length > 0) {
      const draggedFixture = fixtures.find(f => f.id === selectedId);
      if (draggedFixture && GUTTER_SNAP_TYPES.has(draggedFixture.type)) {
        const snap = findNearestGutterSnap(x, y);
        if (snap) { x = snap.snappedX; y = snap.snappedY; }
      }
    }
    // HARD RULE: Above first story, must be on a gutter line or clamp to threshold
    if (y < FIRST_STORY_Y_THRESHOLD) {
      const snap = findNearestGutterSnap(x, y);
      if (snap) { x = snap.snappedX; y = snap.snappedY; }
      else { y = FIRST_STORY_Y_THRESHOLD; }
    }
    const updated = fixtures.map(f => f.id === selectedId ? { ...f, x, y } : f);
    prevFixturesRef.current = updated;
    onFixturesChange(updated);
  }, [isDragging, isDraggingBeam, selectedId, readOnly, snapToGrid, gridSize, imageBounds, fixtures, onFixturesChange, isDrawingGutter, gutterDrawStart, toImageCoords, snapToGutter, gutterLines, findNearestGutterSnap]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Beam drag end (touch)
    if (isDraggingBeam) {
      pushToHistory(fixtures);
      setIsDraggingBeam(false);
      triggerHaptic('light');
      touchStartRef.current = null;
      return;
    }

    if (isDragging) {
      pushToHistory(fixtures);
      setIsDragging(false);
      triggerHaptic('light');
      touchStartRef.current = null;
      return;
    }

    // Gutter drawing mode: finalize line
    if (isDrawingGutter && gutterDrawStart) {
      const changedTouch = e.changedTouches[0];
      if (changedTouch) {
        const coords = toImageCoords(changedTouch.clientX, changedTouch.clientY);
        if (coords) addGutterLine(gutterDrawStart.x, gutterDrawStart.y, coords.x, coords.y);
      }
      setGutterDrawStart(null);
      setGutterDrawEnd(null);
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
        // Apply gutter snap for eligible fixture types
        let finalX = coords.x;
        let finalY = coords.y;
        if (snapToGutter && GUTTER_SNAP_TYPES.has(activeFixtureType)) {
          const snap = findNearestGutterSnap(coords.x, coords.y);
          if (snap) { finalX = snap.snappedX; finalY = snap.snappedY; }
        }

        // HARD RULE: Above first story, fixtures MUST be on a gutter line
        if (finalY < FIRST_STORY_Y_THRESHOLD) {
          const snap = findNearestGutterSnap(finalX, finalY);
          if (snap) {
            finalX = snap.snappedX;
            finalY = snap.snappedY;
          } else {
            triggerHaptic('heavy');
            touchStartRef.current = null;
            return;
          }
        }

        const newFixture = createFixture(finalX, finalY, activeFixtureType);
        pushToHistory([...fixtures, newFixture]);
        setSelectedId(newFixture.id);
        triggerHaptic('medium');
      }
    }
    touchStartRef.current = null;
  }, [isDragging, isDraggingBeam, activeFixtureType, readOnly, fixtures, toImageCoords, pushToHistory, isDrawingGutter, gutterDrawStart, addGutterLine, snapToGutter, findNearestGutterSnap]);

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
          if (isDrawingGutter) {
            setIsDrawingGutter(false);
            setGutterDrawStart(null);
            setGutterDrawEnd(null);
          } else {
            setSelectedId(null);
          }
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
  }, [deleteSelected, duplicateSelected, toggleLock, undo, redo, isDrawingGutter]);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    get canUndo() { return historyIndex > 0; },
    get canRedo() { return historyIndex < history.length - 1; },
    clearAll,
  }), [undo, redo, historyIndex, history.length, clearAll]);

  const cursorStyle = isDrawingGutter
    ? 'crosshair'
    : isDragging
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

          {/* Gradient preview toggle */}
          <button
            onClick={() => setShowGradientPreview(prev => !prev)}
            className={`p-1.5 rounded-lg transition-all ${showGradientPreview ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Preview Light Gradients"
          >
            {showGradientPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <div className="w-px h-5 bg-white/10 flex-shrink-0" />

          {/* Mark Gutter Line */}
          <button
            onClick={() => {
              if (gutterLines.length >= MAX_GUTTER_LINES && !isDrawingGutter) { triggerHaptic('heavy'); return; }
              setIsDrawingGutter(prev => !prev);
              if (!isDrawingGutter) { setSelectedId(null); setGutterDrawStart(null); setGutterDrawEnd(null); }
            }}
            className={`p-1.5 rounded-lg transition-all relative ${
              gutterLines.length >= MAX_GUTTER_LINES && !isDrawingGutter
                ? 'text-gray-600 cursor-not-allowed opacity-50'
                : isDrawingGutter
                  ? 'bg-amber-500 text-black ring-2 ring-amber-300'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title={gutterLines.length >= MAX_GUTTER_LINES ? `Max ${MAX_GUTTER_LINES} gutter lines reached` : `Mark Gutter Line (${gutterLines.length}/${MAX_GUTTER_LINES})`}
          >
            <Minus size={16} />
            {gutterLines.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {gutterLines.length}
              </span>
            )}
          </button>

          {/* Snap to Gutter toggle */}
          {gutterLines.length > 0 && (
            <button
              onClick={() => setSnapToGutter(prev => !prev)}
              className={`p-1.5 rounded-lg transition-all ${
                snapToGutter ? 'bg-amber-500/80 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Snap to Gutter (${gutterLines.length} line${gutterLines.length > 1 ? 's' : ''})`}
            >
              <Crosshair size={16} />
            </button>
          )}

          {/* Clear Gutter Lines */}
          {gutterLines.length > 0 && (
            <button
              onClick={clearAllGutterLines}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all"
              title={`Clear ${gutterLines.length} gutter line${gutterLines.length > 1 ? 's' : ''}`}
            >
              <Trash2 size={12} />
            </button>
          )}

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
        onMouseLeave={() => {
          if (isDragging) { pushToHistory(fixtures); setIsDragging(false); }
          if (isDrawingGutter && gutterDrawStart) { setGutterDrawStart(null); setGutterDrawEnd(null); }
        }}
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

        {/* Gutter Lines SVG Overlay */}
        {(gutterLines.length > 0 || (isDrawingGutter && gutterDrawStart && gutterDrawEnd)) && (
          <svg
            className="absolute pointer-events-none"
            style={{
              left: imageBounds.offsetX,
              top: imageBounds.offsetY,
              width: imageBounds.width,
              height: imageBounds.height,
              zIndex: 5,
            }}
            viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
          >
            {/* Saved gutter lines */}
            {gutterLines.map((line, idx) => {
              const x1 = (line.startX / 100) * imageBounds.width;
              const y1 = (line.startY / 100) * imageBounds.height;
              const x2 = (line.endX / 100) * imageBounds.width;
              const y2 = (line.endY / 100) * imageBounds.height;
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={line.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth={3} strokeDasharray="8 4" opacity={0.8} />
                  <circle cx={x1} cy={y1} r={5} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
                  <circle cx={x2} cy={y2} r={5} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
                  {/* Line number label */}
                  <g>
                    <circle cx={x1 + 12} cy={y1 - 12} r={9} fill="#F59E0B" stroke="white" strokeWidth={1} />
                    <text x={x1 + 12} y={y1 - 8} textAnchor="middle" fontSize={11} fontWeight="bold" fill="black">{idx + 1}</text>
                  </g>
                  {/* Delete button at midpoint */}
                  <g
                    className="pointer-events-auto cursor-pointer"
                    onMouseDown={(evt) => { evt.stopPropagation(); evt.preventDefault(); }}
                    onMouseUp={(evt) => { evt.stopPropagation(); evt.preventDefault(); }}
                    onTouchStart={(evt) => { evt.stopPropagation(); evt.preventDefault(); }}
                    onTouchMove={(evt) => { evt.stopPropagation(); }}
                    onClick={(evt) => { evt.stopPropagation(); evt.preventDefault(); deleteGutterLine(line.id); }}
                    onTouchEnd={(evt) => { evt.stopPropagation(); evt.preventDefault(); deleteGutterLine(line.id); }}
                  >
                    <circle cx={mx} cy={my} r={14} fill="#1f1f1f" stroke="#EF4444" strokeWidth={2} opacity={0.95} />
                    <line x1={mx - 5} y1={my - 5} x2={mx + 5} y2={my + 5} stroke="#EF4444" strokeWidth={2.5} />
                    <line x1={mx + 5} y1={my - 5} x2={mx - 5} y2={my + 5} stroke="#EF4444" strokeWidth={2.5} />
                  </g>
                </g>
              );
            })}
            {/* Live preview line during drawing */}
            {isDrawingGutter && gutterDrawStart && gutterDrawEnd && (
              <line
                x1={(gutterDrawStart.x / 100) * imageBounds.width}
                y1={(gutterDrawStart.y / 100) * imageBounds.height}
                x2={(gutterDrawEnd.x / 100) * imageBounds.width}
                y2={(gutterDrawEnd.y / 100) * imageBounds.height}
                stroke="#F59E0B" strokeWidth={3} strokeDasharray="4 4" opacity={0.5}
              />
            )}
          </svg>
        )}

        {/* Gradient Preview Overlay */}
        <GradientPreview
          fixtures={fixtures}
          containerWidth={imageBounds.width}
          containerHeight={imageBounds.height}
          visible={showGradientPreview}
        />

        {/* Fixture Markers */}
        {fixtures.map(fixture => {
          const isSelected = fixture.id === selectedId;
          const preset = getFixturePreset(fixture.type);
          const hexColor = markerColors[fixture.type] || '#FF0000';
          const defaults = UI_BEAM_DEFAULTS[fixture.type];
          const rotation = fixture.rotation ?? defaults.defaultRotation;
          const beamLen = fixture.beamLength ?? 1.0;
          const beamH = defaults.height * beamLen;
          const beamW = defaults.width * beamLen;
          const rotRad = (rotation * Math.PI) / 180;

          return (
            <div
              key={fixture.id}
              className="absolute pointer-events-none"
              style={{
                left: imageBounds.offsetX + (fixture.x / 100) * imageBounds.width,
                top: imageBounds.offsetY + (fixture.y / 100) * imageBounds.height,
                zIndex: isSelected ? 100 : 10,
              }}
            >
              {/* Beam cone (all fixture types) */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: beamW,
                  height: beamH,
                  left: -beamW / 2,
                  top: -beamH,
                  transformOrigin: 'center bottom',
                  transform: `rotate(${rotation}deg)`,
                  background: `linear-gradient(to top, ${hexColor}90 0%, ${hexColor}40 40%, transparent 100%)`,
                  clipPath: 'polygon(30% 100%, 0% 0%, 100% 0%, 70% 100%)',
                  filter: 'blur(3px)',
                }}
              />

              {/* Fixture marker */}
              {fixture.type === 'gutter_uplight' ? (
                <>
                  {/* Gutter icon: upward arrow + horizontal bar */}
                  <div className="absolute flex flex-col items-center" style={{ left: -16, top: -23 }}>
                    <div style={{
                      width: 0, height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: `8px solid ${hexColor}`,
                    }} />
                    <div style={{ width: 2, height: 10, backgroundColor: 'white' }} />
                    <div
                      className={`flex items-center justify-center rounded-sm border-2 transition-transform ${
                        isSelected ? 'ring-2 ring-[#F6B45A] ring-offset-1 ring-offset-transparent scale-125' : ''
                      } ${fixture.locked ? 'opacity-60' : ''}`}
                      style={{
                        width: 32, height: 10,
                        backgroundColor: hexColor,
                        borderColor: 'white',
                        boxShadow: `0 0 12px ${hexColor}B3`,
                      }}
                    />
                  </div>
                  {fixture.locked && (
                    <Lock size={7} className="absolute -top-1.5 -right-1.5 text-[#F6B45A] bg-black/60 rounded-full p-0.5" />
                  )}
                </>
              ) : (
                <>
                  {/* Core dot */}
                  <div
                    className={`absolute flex items-center justify-center w-5 h-5 rounded-full border-2 transition-transform ${
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
                </>
              )}

              {/* Beam drag handle (only when selected) */}
              {isSelected && !fixture.locked && !readOnly && (
                <div
                  className="absolute rounded-full cursor-grab active:cursor-grabbing"
                  style={{
                    width: 14,
                    height: 14,
                    left: Math.sin(rotRad) * beamH - 7,
                    top: -Math.cos(rotRad) * beamH - 7,
                    backgroundColor: 'white',
                    border: '2px solid #F6B45A',
                    boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                    pointerEvents: 'auto',
                    zIndex: 200,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsDraggingBeam(true);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDraggingBeam(true);
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Active tool indicator */}
        {isDrawingGutter && !readOnly && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur px-3 py-1 rounded-full text-[10px] text-black font-medium flex items-center gap-1.5 pointer-events-none z-30">
            <Minus className="w-3 h-3" />
            Draw gutter line (click &amp; drag)
          </div>
        )}
        {activeFixtureType && !readOnly && !isDrawingGutter && (
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
