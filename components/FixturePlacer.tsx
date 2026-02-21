import React, { useRef, useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  Trash2, Lock, Unlock,
  Grid, RotateCcw, Download, Crosshair, Layers, Copy, Clipboard, Undo2, Redo2, Eye, EyeOff, Wand2,
  Minus, Plus, ZoomIn, SlidersHorizontal, ChevronDown, ChevronUp, Move, Info, X,
} from 'lucide-react';
import {
  LightFixture,
  GutterLine,
  FixtureCategory,
  getFixturePreset,
  createFixture,
} from '../types/fixtures';
import { GradientPreview } from './GradientPreview';
import { suggestGutterLines } from '../services/gutterDetectionService';

type GutterSnapResult = {
  snappedX: number;
  snappedY: number;
  distance: number;
  line: GutterLine;
  lineX: number;
  lineY: number;
  mountX: number;
  mountY: number;
  mountDepthPercent: number;
};

type GutterLensState = {
  visible: boolean;
  screenX: number;
  screenY: number;
  imageX: number;
  imageY: number;
};

// -- Gutter Line Constants --
const GUTTER_SNAP_TYPES = new Set<FixtureCategory>(['uplight', 'spot', 'wall_wash', 'gutter_uplight']);
const GUTTER_SNAP_THRESHOLD = 15; // % distance
const MIN_LINE_LENGTH = 5;        // % minimum to save
const MAX_GUTTER_LINES = 10;      // maximum gutter lines allowed
const FIRST_STORY_Y_THRESHOLD = 45; // % from top - above this, fixtures MUST be on a gutter line
const DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT = 0.6; // shift gutter fixtures into trough below roof edge
const MIN_GUTTER_MOUNT_DEPTH_PERCENT = 0.2;
const MAX_GUTTER_MOUNT_DEPTH_PERCENT = 2.0;
const GUTTER_DEPTH_NUDGE_STEP_PERCENT = 0.15;
const GUTTER_LINE_ASSIGNMENT_TOLERANCE_PERCENT = 2.5;
const GUTTER_LENS_SIZE_PX = 180;
const GUTTER_LENS_OFFSET_PX = 20;

// -- Beam Cone Defaults Per Fixture Type --
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
  containerStyle?: React.CSSProperties;
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
const TIPS_STORAGE_KEY = 'omnia_fixture_placer_tips_dismissed';
const MIN_VIEWPORT_ZOOM = 1;
const MAX_VIEWPORT_ZOOM = 3;

export const FixturePlacer = forwardRef<FixturePlacerHandle, FixturePlacerProps>(({
  imageUrl,
  fixtures,
  onFixturesChange,
  gutterLines: gutterLinesProp,
  onGutterLinesChange,
  activeFixtureType,
  markerColors,
  cursorColor,
  imageNaturalAspect = 16 / 10,
  containerClassName,
  containerStyle,
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
  const [isAutoDetectingGutter, setIsAutoDetectingGutter] = useState(false);
  const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTips, setShowTips] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(TIPS_STORAGE_KEY) !== '1';
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isTouchPanning, setIsTouchPanning] = useState(false);
  const prevActiveFixtureTypeRef = useRef<FixtureCategory | null>(activeFixtureType);
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    centerX: number;
    centerY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const touchPanRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  // -- Gutter Line State (prop-driven or internal) --
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
  const [selectedGutterLineId, setSelectedGutterLineId] = useState<string | null>(null);
  const [gutterZoomEnabled, setGutterZoomEnabled] = useState(true);
  const [gutterZoomFactor, setGutterZoomFactor] = useState<2 | 3 | 4>(3);
  const [gutterLensState, setGutterLensState] = useState<GutterLensState>({
    visible: false,
    screenX: 50,
    screenY: 50,
    imageX: 50,
    imageY: 50,
  });

  // Undo/Redo history
  const [history, setHistory] = useState<LightFixture[][]>([fixtures]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Sync external fixture changes into history (e.g., external clear)
  const prevFixturesRef = useRef(fixtures);
  useEffect(() => {
    if (prevFixturesRef.current !== fixtures) {
      // External change detected - only reset history if it's a fundamentally different set
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
  const selectedGutterLine = useMemo(
    () => gutterLines.find(line => line.id === selectedGutterLineId) ?? null,
    [gutterLines, selectedGutterLineId]
  );
  const selectedGutterLineIndex = useMemo(
    () => selectedGutterLine ? gutterLines.findIndex(line => line.id === selectedGutterLine.id) : -1,
    [gutterLines, selectedGutterLine]
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

  const clampPan = useCallback((x: number, y: number, zoom = zoomLevel) => {
    if (zoom <= 1 || containerSize.width === 0 || containerSize.height === 0) {
      return { x: 0, y: 0 };
    }
    const maxX = (containerSize.width * (zoom - 1)) / 2;
    const maxY = (containerSize.height * (zoom - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [containerSize.width, containerSize.height, zoomLevel]);

  const dismissTips = useCallback(() => {
    setShowTips(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TIPS_STORAGE_KEY, '1');
    }
  }, []);

  const resetViewport = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsTouchPanning(false);
    pinchRef.current = null;
    touchPanRef.current = null;
  }, []);

  const stepZoom = useCallback((direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const delta = direction === 'in' ? 0.25 : -0.25;
      const next = Math.max(MIN_VIEWPORT_ZOOM, Math.min(MAX_VIEWPORT_ZOOM, Number((prev + delta).toFixed(2))));
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      } else {
        setPanOffset(current => clampPan(current.x, current.y, next));
      }
      return next;
    });
  }, [clampPan]);

  useEffect(() => {
    setGhostPosition(null);
    resetViewport();
  }, [imageUrl, resetViewport]);

  useEffect(() => {
    if (!activeFixtureType || readOnly || isDrawingGutter) {
      setGhostPosition(null);
    }
  }, [activeFixtureType, readOnly, isDrawingGutter]);

  useEffect(() => {
    const previousType = prevActiveFixtureTypeRef.current;
    const nextType = activeFixtureType;

    if (nextType === 'gutter_uplight') {
      setShowAdvancedToolbar(true);
    } else if (previousType === 'gutter_uplight' && !!nextType && nextType !== 'gutter_uplight') {
      setShowAdvancedToolbar(false);
    }

    prevActiveFixtureTypeRef.current = nextType;
  }, [activeFixtureType]);

  // Convert screen coords to image-relative percentage
  const toImageCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const baseX = ((screenX - panOffset.x - centerX) / zoomLevel) + centerX;
    const baseY = ((screenY - panOffset.y - centerY) / zoomLevel) + centerY;

    let x = ((baseX - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((baseY - imageBounds.offsetY) / imageBounds.height) * 100;
    if (x < -2 || x > 102 || y < -2 || y > 102) return null;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    return { x, y };
  }, [imageBounds, snapToGrid, gridSize, panOffset.x, panOffset.y, zoomLevel, containerSize.width, containerSize.height]);

  const toImageCoordsRaw = useCallback((clientX: number, clientY: number): { x: number; y: number; screenX: number; screenY: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const baseX = ((screenX - panOffset.x - centerX) / zoomLevel) + centerX;
    const baseY = ((screenY - panOffset.y - centerY) / zoomLevel) + centerY;

    let x = ((baseX - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((baseY - imageBounds.offsetY) / imageBounds.height) * 100;
    if (x < -2 || x > 102 || y < -2 || y > 102) return null;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    return { x, y, screenX, screenY };
  }, [imageBounds, panOffset.x, panOffset.y, zoomLevel, containerSize.width, containerSize.height]);

  const getLineDepthPercent = useCallback((line: GutterLine): number => {
    const rawDepth = line.mountDepthPercent ?? DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT;
    return Math.max(MIN_GUTTER_MOUNT_DEPTH_PERCENT, Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, rawDepth));
  }, []);

  useEffect(() => {
    if (gutterLines.length === 0) {
      setSelectedGutterLineId(null);
      return;
    }
    if (!selectedGutterLineId || !gutterLines.some(line => line.id === selectedGutterLineId)) {
      setSelectedGutterLineId(gutterLines[0].id);
    }
  }, [gutterLines, selectedGutterLineId]);

  const isPrecisionGutterMode = isDrawingGutter || activeFixtureType === 'gutter_uplight' || selectedFixture?.type === 'gutter_uplight';
  const showGutterLens = gutterZoomEnabled && isPrecisionGutterMode && gutterLensState.visible;

  useEffect(() => {
    if (gutterZoomEnabled && isPrecisionGutterMode) return;
    setGutterLensState(prev => prev.visible ? { ...prev, visible: false } : prev);
  }, [gutterZoomEnabled, isPrecisionGutterMode]);

  const updateGutterLensFromClient = useCallback((clientX: number, clientY: number) => {
    if (!gutterZoomEnabled || !isPrecisionGutterMode) return;
    const coords = toImageCoordsRaw(clientX, clientY);
    if (!coords) {
      setGutterLensState(prev => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }
    setGutterLensState({
      visible: true,
      screenX: coords.screenX,
      screenY: coords.screenY,
      imageX: coords.x,
      imageY: coords.y,
    });
  }, [gutterZoomEnabled, isPrecisionGutterMode, toImageCoordsRaw]);

  // -- Gutter Snap Utility --
  const getDownwardNormal = useCallback((line: GutterLine): { nx: number; ny: number } | null => {
    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;

    const n1 = { nx: -dy / len, ny: dx / len };
    const n2 = { nx: dy / len, ny: -dx / len };
    return n1.ny >= n2.ny ? n1 : n2;
  }, []);

  const projectToGutterMount = useCallback((
    lineX: number,
    lineY: number,
    line: GutterLine,
    depthPercent = DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT
  ): { mountX: number; mountY: number; depthPercent: number } => {
    const normal = getDownwardNormal(line);
    if (!normal) {
      return { mountX: lineX, mountY: lineY, depthPercent: 0 };
    }

    const clampedDepth = Math.max(MIN_GUTTER_MOUNT_DEPTH_PERCENT, Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, depthPercent));
    const mountX = Math.max(0, Math.min(100, lineX + normal.nx * clampedDepth));
    const mountY = Math.max(0, Math.min(100, lineY + normal.ny * clampedDepth));
    return { mountX, mountY, depthPercent: clampedDepth };
  }, [getDownwardNormal]);

  const findNearestGutterSnap = useCallback((
    px: number,
    py: number,
    options?: { force?: boolean; maxDistance?: number; mountDepthPercent?: number }
  ): GutterSnapResult | null => {
    if (gutterLines.length === 0) return null;
    let bestDist = Infinity;
    let bestX = px;
    let bestY = py;
    let bestLine: GutterLine | null = null;
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
        bestLine = line;
      }
    }
    const maxDistance = options?.force
      ? Infinity
      : (options?.maxDistance ?? GUTTER_SNAP_THRESHOLD);
    if (!bestLine || bestDist > maxDistance) return null;

    const mounted = projectToGutterMount(
      bestX,
      bestY,
      bestLine,
      options?.mountDepthPercent ?? getLineDepthPercent(bestLine)
    );
    return {
      snappedX: bestX,
      snappedY: bestY,
      distance: bestDist,
      line: bestLine,
      lineX: bestX,
      lineY: bestY,
      mountX: mounted.mountX,
      mountY: mounted.mountY,
      mountDepthPercent: mounted.depthPercent,
    };
  }, [gutterLines, projectToGutterMount, getLineDepthPercent]);

  const applyGutterSnapToFixture = useCallback((fixture: LightFixture, snap: GutterSnapResult): LightFixture => ({
    ...fixture,
    x: Number(snap.mountX.toFixed(3)),
    y: Number(snap.mountY.toFixed(3)),
    gutterLineId: snap.line.id,
    gutterLineX: Number(snap.lineX.toFixed(3)),
    gutterLineY: Number(snap.lineY.toFixed(3)),
    gutterMountDepthPercent: Number(snap.mountDepthPercent.toFixed(3)),
  }), []);

  const projectPointToLineSegment = useCallback((
    line: GutterLine,
    px: number,
    py: number
  ): { x: number; y: number; distance: number } => {
    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      return {
        x: line.startX,
        y: line.startY,
        distance: Math.sqrt((px - line.startX) ** 2 + (py - line.startY) ** 2),
      };
    }
    let t = ((px - line.startX) * dx + (py - line.startY) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const x = line.startX + t * dx;
    const y = line.startY + t * dy;
    return { x, y, distance: Math.sqrt((px - x) ** 2 + (py - y) ** 2) };
  }, []);

  const reprojectFixturesForLineDepth = useCallback((
    targetLine: GutterLine,
    sourceFixtures: LightFixture[],
    depthPercent: number
  ): { updated: LightFixture[]; changed: boolean } => {
    let changed = false;
    const nextFixtures = sourceFixtures.map(fixture => {
      if (fixture.type !== 'gutter_uplight') return fixture;

      const projected = projectPointToLineSegment(targetLine, fixture.x, fixture.y);
      const belongsToLine = fixture.gutterLineId === targetLine.id ||
        projected.distance <= GUTTER_LINE_ASSIGNMENT_TOLERANCE_PERCENT;
      if (!belongsToLine) return fixture;

      const linePointX = typeof fixture.gutterLineX === 'number' ? fixture.gutterLineX : projected.x;
      const linePointY = typeof fixture.gutterLineY === 'number' ? fixture.gutterLineY : projected.y;
      const lineProjection = projectPointToLineSegment(targetLine, linePointX, linePointY);
      const mounted = projectToGutterMount(lineProjection.x, lineProjection.y, targetLine, depthPercent);

      const nextFixture: LightFixture = {
        ...fixture,
        x: Number(mounted.mountX.toFixed(3)),
        y: Number(mounted.mountY.toFixed(3)),
        gutterLineId: targetLine.id,
        gutterLineX: Number(lineProjection.x.toFixed(3)),
        gutterLineY: Number(lineProjection.y.toFixed(3)),
        gutterMountDepthPercent: Number(mounted.depthPercent.toFixed(3)),
      };

      if (
        Math.abs(nextFixture.x - fixture.x) > 0.0001 ||
        Math.abs(nextFixture.y - fixture.y) > 0.0001 ||
        nextFixture.gutterLineId !== fixture.gutterLineId ||
        Math.abs((nextFixture.gutterMountDepthPercent ?? 0) - (fixture.gutterMountDepthPercent ?? 0)) > 0.0001
      ) {
        changed = true;
      }
      return nextFixture;
    });

    return { updated: nextFixtures, changed };
  }, [projectPointToLineSegment, projectToGutterMount]);

  const nudgeSelectedGutterLineDepth = useCallback((delta: number) => {
    if (!selectedGutterLineId || gutterLines.length === 0) return;

    const lineIndex = gutterLines.findIndex(line => line.id === selectedGutterLineId);
    if (lineIndex < 0) return;

    const currentLine = gutterLines[lineIndex];
    const currentDepth = getLineDepthPercent(currentLine);
    const nextDepth = Math.max(
      MIN_GUTTER_MOUNT_DEPTH_PERCENT,
      Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, currentDepth + delta)
    );
    const targetLine: GutterLine = {
      ...currentLine,
      mountDepthPercent: Number(nextDepth.toFixed(3)),
    };
    const updatedLines = gutterLines.map(line => line.id === targetLine.id ? targetLine : line);
    setGutterLines(updatedLines);

    const reprojection = reprojectFixturesForLineDepth(
      targetLine,
      fixtures,
      targetLine.mountDepthPercent ?? DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT
    );
    if (reprojection.changed) {
      pushToHistory(reprojection.updated);
    } else {
      prevFixturesRef.current = reprojection.updated;
      onFixturesChange(reprojection.updated);
    }
    triggerHaptic('light');
  }, [
    selectedGutterLineId,
    gutterLines,
    setGutterLines,
    getLineDepthPercent,
    reprojectFixturesForLineDepth,
    fixtures,
    pushToHistory,
    onFixturesChange,
  ]);

  const cycleSelectedGutterLine = useCallback(() => {
    if (gutterLines.length === 0) return;
    const currentIndex = gutterLines.findIndex(line => line.id === selectedGutterLineId);
    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % gutterLines.length
      : 0;
    setSelectedGutterLineId(gutterLines[nextIndex].id);
    triggerHaptic('light');
  }, [gutterLines, selectedGutterLineId]);

  const cycleGutterZoomFactor = useCallback(() => {
    setGutterZoomFactor(prev => (prev === 2 ? 3 : prev === 3 ? 4 : 2));
    triggerHaptic('light');
  }, []);

  // -- Gutter Line CRUD --
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
      mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
    };
    setGutterLines(prev => [...prev, newLine]);
    setSelectedGutterLineId(newLine.id);
    triggerHaptic('medium');
  }, [gutterLines.length]);

  const deleteGutterLine = useCallback((id: string) => {
    setGutterLines(prev => prev.filter(l => l.id !== id));
    if (selectedGutterLineId === id) {
      setSelectedGutterLineId(null);
    }
    triggerHaptic('light');
  }, [selectedGutterLineId]);

  const clearAllGutterLines = useCallback(() => {
    if (gutterLines.length === 0) return;
    setGutterLines([]);
    setSelectedGutterLineId(null);
    triggerHaptic('medium');
  }, [gutterLines]);

  const autoDetectGutterLines = useCallback(async () => {
    if (isAutoDetectingGutter || !imageUrl) return;
    setIsAutoDetectingGutter(true);
    try {
      const { lines, source } = await suggestGutterLines(imageUrl, Math.min(3, MAX_GUTTER_LINES));
      if (lines.length === 0) {
        triggerHaptic('heavy');
        return;
      }
      const normalizedLines = lines.map(line => ({
        ...line,
        mountDepthPercent: line.mountDepthPercent ?? DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
      }));
      setGutterLines(normalizedLines);
      setSelectedGutterLineId(normalizedLines[0]?.id ?? null);
      setSnapToGutter(true);
      setIsDrawingGutter(false);
      console.log(`[FixturePlacer] Auto-detected ${normalizedLines.length} gutter line(s) using ${source}.`);
      triggerHaptic('medium');
    } catch (error) {
      console.warn('[FixturePlacer] Auto-detect gutter failed:', error);
      triggerHaptic('heavy');
    } finally {
      setIsAutoDetectingGutter(false);
    }
  }, [imageUrl, isAutoDetectingGutter, setGutterLines]);

  // Find fixture near a screen position
  const findFixtureAtScreen = useCallback((clientX: number, clientY: number, radius = 20): LightFixture | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    let nearest: { fixture: LightFixture; dist: number } | null = null;
    for (const f of fixtures) {
      const baseFx = imageBounds.offsetX + (f.x / 100) * imageBounds.width;
      const baseFy = imageBounds.offsetY + (f.y / 100) * imageBounds.height;
      const fx = ((baseFx - centerX) * zoomLevel) + centerX + panOffset.x;
      const fy = ((baseFy - centerY) * zoomLevel) + centerY + panOffset.y;
      const dist = Math.sqrt(Math.pow(sx - fx, 2) + Math.pow(sy - fy, 2));
      if (dist < radius && (!nearest || dist < nearest.dist)) {
        nearest = { fixture: f, dist };
      }
    }
    return nearest?.fixture ?? null;
  }, [fixtures, imageBounds, containerSize.width, containerSize.height, zoomLevel, panOffset.x, panOffset.y]);

  // -- Mouse Handlers --

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || e.button !== 0) return;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    updateGutterLensFromClient(e.clientX, e.clientY);

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
        const centerX = containerSize.width / 2;
        const centerY = containerSize.height / 2;
        const baseFx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
        const baseFy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
        const fx = ((baseFx - centerX) * zoomLevel) + centerX + panOffset.x;
        const fy = ((baseFy - centerY) * zoomLevel) + centerY + panOffset.y;
        dragOffsetRef.current = { x: e.clientX - rect.left - fx, y: e.clientY - rect.top - fy };
      }
      triggerHaptic('light');
    }
  }, [readOnly, findFixtureAtScreen, imageBounds, isDrawingGutter, toImageCoords, updateGutterLensFromClient, containerSize.width, containerSize.height, zoomLevel, panOffset.x, panOffset.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    updateGutterLensFromClient(e.clientX, e.clientY);
    if (activeFixtureType && !readOnly && !isDragging && !isDraggingBeam && !isDrawingGutter) {
      setGhostPosition(toImageCoords(e.clientX, e.clientY));
    } else if (!activeFixtureType || isDragging || isDraggingBeam || isDrawingGutter) {
      setGhostPosition(null);
    }
    // Beam drag: update rotation + length
    if (isDraggingBeam && selectedId) {
      const fixture = fixtures.find(f => f.id === selectedId);
      if (!fixture) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      const baseFx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
      const baseFy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
      const fx = rect.left + (((baseFx - centerX) * zoomLevel) + centerX + panOffset.x);
      const fy = rect.top + (((baseFy - centerY) * zoomLevel) + centerY + panOffset.y);
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
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const screenX = e.clientX - rect.left - dragOffsetRef.current.x;
    const screenY = e.clientY - rect.top - dragOffsetRef.current.y;
    const baseX = ((screenX - panOffset.x - centerX) / zoomLevel) + centerX;
    const baseY = ((screenY - panOffset.y - centerY) / zoomLevel) + centerY;
    let x = ((baseX - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((baseY - imageBounds.offsetY) / imageBounds.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    const draggedFixture = fixtures.find(f => f.id === selectedId);
    let gutterSnap: GutterSnapResult | null = null;
    if (draggedFixture?.type === 'gutter_uplight') {
      // Gutter fixtures are line-locked: project to line, then shift into trough depth.
      gutterSnap = findNearestGutterSnap(x, y, { force: true });
      if (!gutterSnap) return;
      x = gutterSnap.mountX;
      y = gutterSnap.mountY;
    } else {
      // Snap to gutter line if eligible
      if (snapToGutter && gutterLines.length > 0 && draggedFixture && GUTTER_SNAP_TYPES.has(draggedFixture.type)) {
        const snap = findNearestGutterSnap(x, y);
        if (snap) { x = snap.snappedX; y = snap.snappedY; }
      }
      // HARD RULE: Above first story, must be on a gutter line or clamp to threshold
      if (y < FIRST_STORY_Y_THRESHOLD) {
        const snap = findNearestGutterSnap(x, y);
        if (snap) { x = snap.snappedX; y = snap.snappedY; }
        else { y = FIRST_STORY_Y_THRESHOLD; }
      }
    }
    // Update position live (no history push during drag)
    const updated = fixtures.map(f => {
      if (f.id !== selectedId) return f;
      if (gutterSnap && f.type === 'gutter_uplight') {
        return applyGutterSnapToFixture(f, gutterSnap);
      }
      return { ...f, x, y };
    });
    prevFixturesRef.current = updated;
    onFixturesChange(updated);
  }, [activeFixtureType, readOnly, isDragging, isDraggingBeam, selectedId, snapToGrid, gridSize, imageBounds, fixtures, onFixturesChange, isDrawingGutter, gutterDrawStart, toImageCoords, snapToGutter, gutterLines, findNearestGutterSnap, applyGutterSnapToFixture, updateGutterLensFromClient, containerSize.width, containerSize.height, zoomLevel, panOffset.x, panOffset.y]);

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

    // Quick click -> place new fixture
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
    let gutterSnap: GutterSnapResult | null = null;
    if (activeFixtureType === 'gutter_uplight') {
      if (gutterLines.length === 0) {
        triggerHaptic('heavy');
        return;
      }
      gutterSnap = findNearestGutterSnap(coords.x, coords.y, { force: true });
      if (!gutterSnap) {
        triggerHaptic('heavy');
        return;
      }
      finalX = gutterSnap.mountX;
      finalY = gutterSnap.mountY;
    } else {
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
          // No gutter line nearby - reject placement
          triggerHaptic('heavy');
          return;
        }
      }
    }

    const baseFixture = createFixture(finalX, finalY, activeFixtureType);
    const newFixture = (activeFixtureType === 'gutter_uplight' && gutterSnap)
      ? applyGutterSnapToFixture(baseFixture, gutterSnap)
      : baseFixture;
    pushToHistory([...fixtures, newFixture]);
    setSelectedId(newFixture.id);
    triggerHaptic('medium');
  }, [isDragging, isDraggingBeam, activeFixtureType, readOnly, fixtures, findFixtureAtScreen, toImageCoords, pushToHistory, isDrawingGutter, gutterDrawStart, gutterDrawEnd, addGutterLine, snapToGutter, findNearestGutterSnap, gutterLines.length, applyGutterSnapToFixture]);

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

  // -- Touch Handlers --

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchRef.current = {
        distance,
        zoom: zoomLevel,
        centerX,
        centerY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
      setIsTouchPanning(false);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    updateGutterLensFromClient(touch.clientX, touch.clientY);

    // Gutter drawing mode: start line
    if (isDrawingGutter) {
      const coords = toImageCoords(touch.clientX, touch.clientY);
      if (coords) { setGutterDrawStart(coords); setGutterDrawEnd(coords); }
      return;
    }

    const fixture = findFixtureAtScreen(touch.clientX, touch.clientY);

    if (!fixture && !activeFixtureType && !isDrawingGutter && zoomLevel > 1) {
      setIsTouchPanning(true);
      touchPanRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
      return;
    }

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
          const centerX = containerSize.width / 2;
          const centerY = containerSize.height / 2;
          const baseFx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
          const baseFy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
          const fx = ((baseFx - centerX) * zoomLevel) + centerX + panOffset.x;
          const fy = ((baseFy - centerY) * zoomLevel) + centerY + panOffset.y;
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
  }, [readOnly, zoomLevel, panOffset.x, panOffset.y, findFixtureAtScreen, activeFixtureType, imageBounds, fixtures, pushToHistory, isDrawingGutter, toImageCoords, updateGutterLensFromClient, containerSize.width, containerSize.height]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const rawZoom = pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance));
      const nextZoom = Math.max(MIN_VIEWPORT_ZOOM, Math.min(MAX_VIEWPORT_ZOOM, Number(rawZoom.toFixed(2))));
      const deltaX = centerX - pinchRef.current.centerX;
      const deltaY = centerY - pinchRef.current.centerY;
      const nextPan = clampPan(
        pinchRef.current.panX + deltaX,
        pinchRef.current.panY + deltaY,
        nextZoom
      );
      setZoomLevel(nextZoom);
      setPanOffset(nextPan);
      return;
    }

    const movingTouch = e.touches[0];
    if (movingTouch) {
      updateGutterLensFromClient(movingTouch.clientX, movingTouch.clientY);
    }

    if (isTouchPanning && movingTouch && touchPanRef.current) {
      const deltaX = movingTouch.clientX - touchPanRef.current.startX;
      const deltaY = movingTouch.clientY - touchPanRef.current.startY;
      const nextPan = clampPan(
        touchPanRef.current.panX + deltaX,
        touchPanRef.current.panY + deltaY,
        zoomLevel
      );
      setPanOffset(nextPan);
      return;
    }

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
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      const baseFx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
      const baseFy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
      const fx = rect.left + (((baseFx - centerX) * zoomLevel) + centerX + panOffset.x);
      const fy = rect.top + (((baseFy - centerY) * zoomLevel) + centerY + panOffset.y);
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
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const screenX = touch.clientX - rect.left - dragOffsetRef.current.x;
    const screenY = touch.clientY - rect.top - dragOffsetRef.current.y;
    const baseX = ((screenX - panOffset.x - centerX) / zoomLevel) + centerX;
    const baseY = ((screenY - panOffset.y - centerY) / zoomLevel) + centerY;
    let x = ((baseX - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((baseY - imageBounds.offsetY) / imageBounds.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    const draggedFixture = fixtures.find(f => f.id === selectedId);
    let gutterSnap: GutterSnapResult | null = null;
    if (draggedFixture?.type === 'gutter_uplight') {
      gutterSnap = findNearestGutterSnap(x, y, { force: true });
      if (!gutterSnap) return;
      x = gutterSnap.mountX;
      y = gutterSnap.mountY;
    } else {
      // Snap to gutter line if eligible
      if (snapToGutter && gutterLines.length > 0 && draggedFixture && GUTTER_SNAP_TYPES.has(draggedFixture.type)) {
        const snap = findNearestGutterSnap(x, y);
        if (snap) { x = snap.snappedX; y = snap.snappedY; }
      }
      // HARD RULE: Above first story, must be on a gutter line or clamp to threshold
      if (y < FIRST_STORY_Y_THRESHOLD) {
        const snap = findNearestGutterSnap(x, y);
        if (snap) { x = snap.snappedX; y = snap.snappedY; }
        else { y = FIRST_STORY_Y_THRESHOLD; }
      }
    }
    const updated = fixtures.map(f => {
      if (f.id !== selectedId) return f;
      if (gutterSnap && f.type === 'gutter_uplight') {
        return applyGutterSnapToFixture(f, gutterSnap);
      }
      return { ...f, x, y };
    });
    prevFixturesRef.current = updated;
    onFixturesChange(updated);
  }, [clampPan, zoomLevel, isTouchPanning, isDragging, isDraggingBeam, selectedId, readOnly, snapToGrid, gridSize, imageBounds, fixtures, onFixturesChange, isDrawingGutter, gutterDrawStart, toImageCoords, snapToGutter, gutterLines, findNearestGutterSnap, applyGutterSnapToFixture, updateGutterLensFromClient, containerSize.width, containerSize.height, panOffset.x, panOffset.y]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    setGutterLensState(prev => prev.visible ? { ...prev, visible: false } : prev);
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isTouchPanning) {
      if (e.touches.length === 0) {
        setIsTouchPanning(false);
        touchPanRef.current = null;
      }
      touchStartRef.current = null;
      return;
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

    // Quick tap -> place new fixture
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
        let gutterSnap: GutterSnapResult | null = null;
        if (activeFixtureType === 'gutter_uplight') {
          if (gutterLines.length === 0) {
            triggerHaptic('heavy');
            touchStartRef.current = null;
            return;
          }
          gutterSnap = findNearestGutterSnap(coords.x, coords.y, { force: true });
          if (!gutterSnap) {
            triggerHaptic('heavy');
            touchStartRef.current = null;
            return;
          }
          finalX = gutterSnap.mountX;
          finalY = gutterSnap.mountY;
        } else {
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
        }

        const baseFixture = createFixture(finalX, finalY, activeFixtureType);
        const newFixture = (activeFixtureType === 'gutter_uplight' && gutterSnap)
          ? applyGutterSnapToFixture(baseFixture, gutterSnap)
          : baseFixture;
        pushToHistory([...fixtures, newFixture]);
        setSelectedId(newFixture.id);
        triggerHaptic('medium');
      }
    }
    touchStartRef.current = null;
  }, [isTouchPanning, isDragging, isDraggingBeam, activeFixtureType, readOnly, fixtures, toImageCoords, pushToHistory, isDrawingGutter, gutterDrawStart, addGutterLine, snapToGutter, findNearestGutterSnap, gutterLines.length, applyGutterSnapToFixture]);

  // -- Toolbar Actions --

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
    const baseFixture: LightFixture = {
      ...selectedFixture,
      id: `fixture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(100, selectedFixture.x + 5),
      y: Math.min(100, selectedFixture.y + 5),
      locked: false,
    };
    const newFixture =
      baseFixture.type === 'gutter_uplight'
        ? (() => {
            const snap = findNearestGutterSnap(baseFixture.x, baseFixture.y, { force: true });
            return snap ? applyGutterSnapToFixture(baseFixture, snap) : baseFixture;
          })()
        : baseFixture;
    pushToHistory([...fixtures, newFixture]);
    setSelectedId(newFixture.id);
    triggerHaptic('medium');
  }, [selectedFixture, fixtures, pushToHistory, findNearestGutterSnap, applyGutterSnapToFixture]);

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

  const gutterLensStyle = useMemo<React.CSSProperties | null>(() => {
    if (!showGutterLens) return null;

    const lensLeft = Math.max(
      0,
      Math.min(containerSize.width - GUTTER_LENS_SIZE_PX, gutterLensState.screenX + GUTTER_LENS_OFFSET_PX)
    );
    const lensTop = Math.max(
      0,
      Math.min(containerSize.height - GUTTER_LENS_SIZE_PX, gutterLensState.screenY + GUTTER_LENS_OFFSET_PX)
    );
    const focusX = (gutterLensState.imageX / 100) * imageBounds.width;
    const focusY = (gutterLensState.imageY / 100) * imageBounds.height;
    const bgX = -(focusX * gutterZoomFactor - GUTTER_LENS_SIZE_PX / 2);
    const bgY = -(focusY * gutterZoomFactor - GUTTER_LENS_SIZE_PX / 2);

    return {
      left: lensLeft,
      top: lensTop,
      width: GUTTER_LENS_SIZE_PX,
      height: GUTTER_LENS_SIZE_PX,
      backgroundImage: `url(${imageUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${imageBounds.width * gutterZoomFactor}px ${imageBounds.height * gutterZoomFactor}px`,
      backgroundPosition: `${bgX}px ${bgY}px`,
    };
  }, [
    showGutterLens,
    containerSize.width,
    containerSize.height,
    gutterLensState.screenX,
    gutterLensState.screenY,
    gutterLensState.imageX,
    gutterLensState.imageY,
    imageBounds.width,
    imageBounds.height,
    gutterZoomFactor,
    imageUrl,
  ]);

  const viewportTransformStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
    transformOrigin: 'center center',
  }), [panOffset.x, panOffset.y, zoomLevel]);

  return (
    <div className={containerClassName || 'relative w-full h-full'} style={containerStyle}>
      {/* Floating Toolbar */}
      {!readOnly && (
        <div className="absolute top-2 left-2 right-2 z-30 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 p-1.5 bg-[#0d0d0d]/90 backdrop-blur border border-white/10 rounded-xl overflow-x-auto">
            <button
              onClick={() => setShowGrid(prev => !prev)}
              className={`p-1.5 rounded-lg transition-all ${showGrid ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Toggle Grid (G)"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setSnapToGrid(prev => !prev)}
              className={`p-1.5 rounded-lg transition-all ${snapToGrid ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Snap to Grid"
            >
              <Crosshair size={16} />
            </button>
            <button
              onClick={() => setShowGradientPreview(prev => !prev)}
              className={`p-1.5 rounded-lg transition-all ${showGradientPreview ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Preview Light Gradients"
            >
              {showGradientPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            <div className="w-px h-5 bg-white/10 flex-shrink-0" />

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

            <div className="w-px h-5 bg-white/10 flex-shrink-0" />

            <button
              onClick={() => stepZoom('out')}
              disabled={zoomLevel <= MIN_VIEWPORT_ZOOM}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => stepZoom('in')}
              disabled={zoomLevel >= MAX_VIEWPORT_ZOOM}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={resetViewport}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${zoomLevel > 1 ? 'text-amber-300 bg-white/10 hover:bg-white/20' : 'text-gray-500 bg-white/5'}`}
              title="Reset Viewport"
            >
              {zoomLevel.toFixed(2)}x
            </button>

            <button
              onClick={() => setShowAdvancedToolbar(prev => !prev)}
              className={`ml-auto px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 ${showAdvancedToolbar ? 'bg-[#F6B45A] text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
              title="Advanced Tools"
            >
              <SlidersHorizontal size={13} />
              Advanced
              {showAdvancedToolbar ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-shrink-0 pl-2">
              <Layers size={12} />
              <span>{fixtures.length}</span>
            </div>
          </div>

          {showAdvancedToolbar && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#0d0d0d]/90 backdrop-blur border border-white/10 rounded-xl">
              <button
                onClick={autoDetectGutterLines}
                disabled={isAutoDetectingGutter}
                className={`p-1.5 rounded-lg transition-all ${
                  isAutoDetectingGutter
                    ? 'bg-amber-500/80 text-black'
                    : 'text-gray-400 hover:text-amber-300 hover:bg-white/5'
                } disabled:opacity-70 disabled:cursor-wait`}
                title={isAutoDetectingGutter ? 'Detecting gutter lines...' : 'Auto-Detect Gutter Lines'}
              >
                <Wand2 size={16} className={isAutoDetectingGutter ? 'animate-spin' : ''} />
              </button>
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
                title={gutterLines.length >= MAX_GUTTER_LINES ? `Max ${MAX_GUTTER_LINES} gutter lines reached` : `Draw Gutter Line (${gutterLines.length}/${MAX_GUTTER_LINES})`}
              >
                <Move size={16} />
              </button>
              {gutterLines.length > 0 && (
                <>
                  <button
                    onClick={() => setSnapToGutter(prev => !prev)}
                    className={`p-1.5 rounded-lg transition-all ${snapToGutter ? 'bg-amber-500/80 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title={`Snap to Gutter (${gutterLines.length})`}
                  >
                    <Crosshair size={16} />
                  </button>
                  <button
                    onClick={() => setGutterZoomEnabled(prev => !prev)}
                    className={`p-1.5 rounded-lg transition-all ${gutterZoomEnabled ? 'bg-amber-500/80 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title={`Gutter Lens (${gutterZoomEnabled ? 'ON' : 'OFF'})`}
                  >
                    <ZoomIn size={16} />
                  </button>
                  {gutterZoomEnabled && (
                    <button
                      onClick={cycleGutterZoomFactor}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-amber-300 bg-white/5 hover:bg-white/10 transition-all"
                      title="Cycle lens zoom factor"
                    >
                      {gutterZoomFactor}x
                    </button>
                  )}
                  <button
                    onClick={clearAllGutterLines}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all"
                    title={`Clear ${gutterLines.length} gutter line${gutterLines.length > 1 ? 's' : ''}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}

              {selectedGutterLine && (
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  <button
                    onClick={cycleSelectedGutterLine}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-300 hover:bg-white/10 transition-all"
                    title="Select gutter line"
                  >
                    L{selectedGutterLineIndex + 1}
                  </button>
                  <button
                    onClick={() => nudgeSelectedGutterLineDepth(-GUTTER_DEPTH_NUDGE_STEP_PERCENT)}
                    className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                    title="Nudge mount depth shallower"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-[10px] text-amber-300 font-medium w-12 text-center">
                    {getLineDepthPercent(selectedGutterLine).toFixed(2)}%
                  </span>
                  <button
                    onClick={() => nudgeSelectedGutterLineDepth(GUTTER_DEPTH_NUDGE_STEP_PERCENT)}
                    className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                    title="Nudge mount depth deeper"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}

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
                    title="Lock / Unlock"
                  >
                    {selectedFixture.locked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all"
                    title="Delete Selected"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}

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
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all"
                title="Clear All Fixtures"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          )}

          {showTips && (
            <div className="bg-[#121212]/95 border border-[#F6B45A]/25 rounded-xl p-2.5 text-[11px] text-gray-300 flex items-start gap-2">
              <Info size={14} className="text-[#F6B45A] mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-white">Placement tips</p>
                <p className="text-gray-400">
                  Tap to place. Drag markers to refine. Use two fingers to zoom and pan for tighter alignment.
                </p>
              </div>
              <button
                onClick={dismissTips}
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                title="Dismiss tips"
              >
                <X size={13} />
              </button>
            </div>
          )}
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
          setGutterLensState(prev => prev.visible ? { ...prev, visible: false } : prev);
          setGhostPosition(null);
        }}
        onContextMenu={handleRightClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {gutterLensStyle && (
          <div
            className="absolute pointer-events-none z-40 rounded-full border-2 border-amber-300/90 shadow-[0_0_0_2px_rgba(0,0,0,0.45)] overflow-hidden"
            style={gutterLensStyle}
          >
            <div className="absolute inset-0 border border-white/20 rounded-full" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-200/85 -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-200/85 -translate-y-1/2" />
            <div className="absolute bottom-1 right-2 text-[10px] font-semibold text-amber-200 drop-shadow-sm">
              {gutterZoomFactor}x
            </div>
          </div>
        )}

        <div className="absolute inset-0" style={viewportTransformStyle}>
          {zoomLevel > 1 && (
            <img
              src={imageUrl}
              alt=""
              className="absolute pointer-events-none select-none"
              style={{
                left: imageBounds.offsetX,
                top: imageBounds.offsetY,
                width: imageBounds.width,
                height: imageBounds.height,
                objectFit: 'fill',
                opacity: 1,
              }}
              draggable={false}
            />
          )}

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
                const isSelectedLine = line.id === selectedGutterLineId;
                return (
                  <g key={line.id}>
                    <line
                      className="pointer-events-auto cursor-pointer"
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth={18}
                      onMouseDown={(evt) => { evt.stopPropagation(); evt.preventDefault(); setSelectedGutterLineId(line.id); }}
                      onTouchStart={(evt) => { evt.stopPropagation(); evt.preventDefault(); setSelectedGutterLineId(line.id); }}
                    />
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isSelectedLine ? '#FCD34D' : '#F59E0B'}
                      strokeWidth={isSelectedLine ? 4 : 3}
                      strokeDasharray="8 4"
                      opacity={isSelectedLine ? 1 : 0.8}
                    />
                    <circle cx={x1} cy={y1} r={5} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
                    <circle cx={x2} cy={y2} r={5} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
                    <g>
                      <circle cx={x1 + 12} cy={y1 - 12} r={9} fill={isSelectedLine ? '#FCD34D' : '#F59E0B'} stroke="white" strokeWidth={1} />
                      <text x={x1 + 12} y={y1 - 8} textAnchor="middle" fontSize={11} fontWeight="bold" fill="black">{idx + 1}</text>
                    </g>
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

          <GradientPreview
            fixtures={fixtures}
            containerWidth={imageBounds.width}
            containerHeight={imageBounds.height}
            visible={showGradientPreview}
          />

          {/* Ghost marker preview for active fixture type */}
          {activeFixtureType && ghostPosition && !isDrawingGutter && (
            <div
              className="absolute pointer-events-none z-[80]"
              style={{
                left: imageBounds.offsetX + (ghostPosition.x / 100) * imageBounds.width,
                top: imageBounds.offsetY + (ghostPosition.y / 100) * imageBounds.height,
              }}
            >
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed animate-pulse"
                style={{
                  width: 22,
                  height: 22,
                  borderColor: markerColors[activeFixtureType] || '#F6B45A',
                  boxShadow: `0 0 12px ${(markerColors[activeFixtureType] || '#F6B45A')}80`,
                }}
              />
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: markerColors[activeFixtureType] || '#F6B45A',
                }}
              />
            </div>
          )}

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

                {fixture.type === 'gutter_uplight' ? (
                  <>
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
                )}

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
        </div>

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
