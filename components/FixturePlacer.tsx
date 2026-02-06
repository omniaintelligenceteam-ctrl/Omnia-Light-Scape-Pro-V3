import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Move, Lock, Unlock, Eye, EyeOff,
  Grid, RotateCcw, Download, Upload, Settings, X,
  Sun, Moon, Crosshair, Layers, Copy, Clipboard
} from 'lucide-react';
import {
  LightFixture,
  FixtureCategory,
  FixturePlacementState,
  FIXTURE_PRESETS,
  getFixturePreset,
  createFixture,
  kelvinToRGB
} from '../types/fixtures';

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

interface FixturePlacerProps {
  imageUrl: string;
  initialFixtures?: LightFixture[];
  onFixturesChange?: (fixtures: LightFixture[]) => void;
  onExport?: (fixtures: LightFixture[]) => void;
  readOnly?: boolean;
  showPreview?: boolean;
}

/**
 * FixturePlacer Component
 * 
 * Canvas overlay for placing and positioning light fixtures on property images.
 * Provides an intuitive interface for:
 * - Click-to-place fixture markers
 * - Drag-to-reposition fixtures
 * - Fixture type selection
 * - Intensity/color temperature controls
 * - Real-time glow preview
 */
export const FixturePlacer: React.FC<FixturePlacerProps> = ({
  imageUrl,
  initialFixtures = [],
  onFixturesChange,
  onExport,
  readOnly = false,
  showPreview = true
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [fixtures, setFixtures] = useState<LightFixture[]>(initialFixtures);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<FixtureCategory>('uplight');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(5); // 5% grid
  const [showGlowPreview, setShowGlowPreview] = useState(showPreview);
  const [showToolbar, setShowToolbar] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Selected fixture helper
  const selectedFixture = useMemo(() =>
    fixtures.find(f => f.id === selectedId),
    [fixtures, selectedId]
  );

  // Compute actual image bounds within container (accounting for object-contain letterboxing)
  const imageBounds = useMemo(() => {
    if (!imageRef.current || containerSize.width === 0 || containerSize.height === 0) {
      return { offsetX: 0, offsetY: 0, width: containerSize.width || 1, height: containerSize.height || 1 };
    }
    const img = imageRef.current;
    const containerAspect = containerSize.width / containerSize.height;
    const imageAspect = img.naturalWidth / img.naturalHeight;

    if (containerAspect > imageAspect) {
      // Container wider than image: horizontal letterboxing
      const renderedHeight = containerSize.height;
      const renderedWidth = containerSize.height * imageAspect;
      return { offsetX: (containerSize.width - renderedWidth) / 2, offsetY: 0, width: renderedWidth, height: renderedHeight };
    } else {
      // Container taller than image: vertical letterboxing
      const renderedWidth = containerSize.width;
      const renderedHeight = containerSize.width / imageAspect;
      return { offsetX: 0, offsetY: (containerSize.height - renderedHeight) / 2, width: renderedWidth, height: renderedHeight };
    }
  }, [containerSize, imageLoaded]);

  // Load image and set up canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Notify parent of changes
  useEffect(() => {
    onFixturesChange?.(fixtures);
  }, [fixtures, onFixturesChange]);

  // Draw preview canvas with glow effects
  useEffect(() => {
    if (!showGlowPreview || !previewCanvasRef.current || !imageLoaded || !imageRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw base image
    ctx.drawImage(img, 0, 0);

    // Draw glow effects for each fixture
    fixtures.forEach(fixture => {
      drawFixtureGlow(ctx, fixture, img.width, img.height);
    });
  }, [fixtures, showGlowPreview, imageLoaded, containerSize]);

  /**
   * Draw a fixture's glow effect on the canvas
   */
  const drawFixtureGlow = useCallback((
    ctx: CanvasRenderingContext2D,
    fixture: LightFixture,
    width: number,
    height: number
  ) => {
    const preset = getFixturePreset(fixture.type);
    const glow = preset.glowConfig;
    
    // Convert percentage position to pixels
    const x = (fixture.x / 100) * width;
    const y = (fixture.y / 100) * height;
    
    // Get color from fixture temperature
    const color = kelvinToRGB(fixture.colorTemp);
    
    // Calculate glow dimensions
    const glowHeight = glow.baseHeight * height * fixture.intensity;
    const glowWidth = glow.baseWidth * width * fixture.intensity;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw multiple gradient layers for realistic falloff
    for (let layer = 0; layer < glow.layers; layer++) {
      const layerScale = 1 - (layer * 0.15);
      const h = glowHeight * layerScale;
      const w = glowWidth * layerScale;
      const alpha = 0.15 * fixture.intensity * layerScale;

      // Create gradient based on direction
      let gradient: CanvasGradient;
      
      switch (glow.direction) {
        case 'up':
          gradient = ctx.createRadialGradient(x, y, 0, x, y - h/2, Math.max(w, h));
          break;
        case 'down':
          gradient = ctx.createRadialGradient(x, y, 0, x, y + h/2, Math.max(w, h));
          break;
        case 'omni':
        default:
          gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
      }

      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

      ctx.fillStyle = gradient;
      
      // Draw ellipse for directional lights, circle for omni
      ctx.beginPath();
      if (glow.direction === 'up') {
        ctx.ellipse(x, y - h/3, w, h, 0, 0, Math.PI * 2);
      } else if (glow.direction === 'down') {
        ctx.ellipse(x, y + h/3, w, h, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(x, y, Math.max(w, h), 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Draw bright core
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
    coreGradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${glow.coreIntensity})`);
    coreGradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  /**
   * Handle click to place new fixture
   */
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Convert container click to image-relative coordinates (accounting for object-contain letterboxing)
    let x = ((e.clientX - rect.left - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((e.clientY - rect.top - imageBounds.offsetY) / imageBounds.height) * 100;

    // Ignore clicks outside the actual image area
    if (x < -2 || x > 102 || y < -2 || y > 102) return;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // Snap to grid if enabled
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    // Check if clicking on existing fixture (using image-relative coords → container pixels)
    const clickedFixture = fixtures.find(f => {
      const fx = imageBounds.offsetX + (f.x / 100) * imageBounds.width;
      const fy = imageBounds.offsetY + (f.y / 100) * imageBounds.height;
      const distance = Math.sqrt(
        Math.pow(e.clientX - rect.left - fx, 2) +
        Math.pow(e.clientY - rect.top - fy, 2)
      );
      return distance < 20;
    });

    if (clickedFixture) {
      setSelectedId(clickedFixture.id);
      triggerHaptic('light');
    } else {
      // Place new fixture
      const newFixture = createFixture(x, y, activeType);
      setFixtures(prev => [...prev, newFixture]);
      setSelectedId(newFixture.id);
      triggerHaptic('medium');
    }
  }, [fixtures, activeType, readOnly, isDragging, snapToGrid, gridSize, imageBounds]);

  /**
   * Handle fixture drag start
   */
  const handleDragStart = useCallback((e: React.MouseEvent, fixtureId: string) => {
    if (readOnly) return;
    
    const fixture = fixtures.find(f => f.id === fixtureId);
    if (!fixture || fixture.locked) return;

    e.stopPropagation();
    setIsDragging(true);
    setSelectedId(fixtureId);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const fx = imageBounds.offsetX + (fixture.x / 100) * imageBounds.width;
      const fy = imageBounds.offsetY + (fixture.y / 100) * imageBounds.height;
      setDragOffset({
        x: e.clientX - rect.left - fx,
        y: e.clientY - rect.top - fy
      });
    }

    triggerHaptic('light');
  }, [fixtures, readOnly, imageBounds]);

  /**
   * Handle fixture drag move
   */
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedId || readOnly) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = ((e.clientX - rect.left - dragOffset.x - imageBounds.offsetX) / imageBounds.width) * 100;
    let y = ((e.clientY - rect.top - dragOffset.y - imageBounds.offsetY) / imageBounds.height) * 100;

    // Clamp to bounds
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // Snap to grid
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    setFixtures(prev => prev.map(f =>
      f.id === selectedId ? { ...f, x, y } : f
    ));
  }, [isDragging, selectedId, dragOffset, readOnly, snapToGrid, gridSize, imageBounds]);

  /**
   * Handle fixture drag end
   */
  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      triggerHaptic('light');
    }
  }, [isDragging]);

  /**
   * Handle right-click to delete nearest fixture
   */
  const handleRightClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find nearest fixture within 30px
    let nearest: { id: string; dist: number } | null = null;
    for (const f of fixtures) {
      const fx = imageBounds.offsetX + (f.x / 100) * imageBounds.width;
      const fy = imageBounds.offsetY + (f.y / 100) * imageBounds.height;
      const dist = Math.sqrt(Math.pow(clickX - fx, 2) + Math.pow(clickY - fy, 2));
      if (dist < 30 && (!nearest || dist < nearest.dist)) {
        nearest = { id: f.id, dist };
      }
    }

    if (nearest) {
      setFixtures(prev => prev.filter(f => f.id !== nearest!.id));
      if (selectedId === nearest.id) setSelectedId(null);
      triggerHaptic('medium');
    }
  }, [fixtures, readOnly, imageBounds, selectedId]);

  /**
   * Delete selected fixture
   */
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setFixtures(prev => prev.filter(f => f.id !== selectedId));
    setSelectedId(null);
    triggerHaptic('medium');
  }, [selectedId]);

  /**
   * Toggle lock on selected fixture
   */
  const toggleLock = useCallback(() => {
    if (!selectedId) return;
    setFixtures(prev => prev.map(f =>
      f.id === selectedId ? { ...f, locked: !f.locked } : f
    ));
    triggerHaptic('light');
  }, [selectedId]);

  /**
   * Duplicate selected fixture
   */
  const duplicateSelected = useCallback(() => {
    if (!selectedFixture) return;
    const newFixture: LightFixture = {
      ...selectedFixture,
      id: `fixture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(100, selectedFixture.x + 5),
      y: Math.min(100, selectedFixture.y + 5),
      locked: false
    };
    setFixtures(prev => [...prev, newFixture]);
    setSelectedId(newFixture.id);
    triggerHaptic('medium');
  }, [selectedFixture]);

  /**
   * Update selected fixture properties
   */
  const updateSelectedFixture = useCallback((updates: Partial<LightFixture>) => {
    if (!selectedId) return;
    setFixtures(prev => prev.map(f =>
      f.id === selectedId ? { ...f, ...updates } : f
    ));
  }, [selectedId]);

  /**
   * Clear all fixtures
   */
  const clearAll = useCallback(() => {
    if (window.confirm('Remove all fixtures?')) {
      setFixtures([]);
      setSelectedId(null);
      triggerHaptic('heavy');
    }
  }, []);

  /**
   * Export fixtures to JSON
   */
  const handleExport = useCallback(() => {
    onExport?.(fixtures);
    
    // Also copy to clipboard
    const data = JSON.stringify(fixtures, null, 2);
    navigator.clipboard.writeText(data);
    triggerHaptic('medium');
  }, [fixtures, onExport]);

  /**
   * Import fixtures from clipboard
   */
  const handleImport = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        setFixtures(imported);
        triggerHaptic('medium');
      }
    } catch {
      console.error('Failed to import fixtures');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          deleteSelected();
          break;
        case 'Escape':
          setSelectedId(null);
          break;
        case 'd':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            duplicateSelected();
          }
          break;
        case 'l':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            toggleLock();
          }
          break;
        case 'g':
          if (!e.metaKey && !e.ctrlKey) {
            setShowGrid(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, duplicateSelected, toggleLock]);

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <AnimatePresence>
        {showToolbar && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700"
          >
            {/* Fixture Type Selector */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-lg">
              {FIXTURE_PRESETS.slice(0, 5).map(preset => (
                <button
                  key={preset.type}
                  onClick={() => setActiveType(preset.type)}
                  className={`p-2 rounded transition-colors ${
                    activeType === preset.type
                      ? 'bg-amber-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-600'
                  }`}
                  title={preset.name}
                >
                  <span className="text-lg">{preset.icon}</span>
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-600" />

            {/* Tools */}
            <button
              onClick={() => setShowGrid(prev => !prev)}
              className={`p-2 rounded transition-colors ${
                showGrid ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle Grid (G)"
            >
              <Grid size={18} />
            </button>

            <button
              onClick={() => setSnapToGrid(prev => !prev)}
              className={`p-2 rounded transition-colors ${
                snapToGrid ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Snap to Grid"
            >
              <Crosshair size={18} />
            </button>

            <button
              onClick={() => setShowGlowPreview(prev => !prev)}
              className={`p-2 rounded transition-colors ${
                showGlowPreview ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle Glow Preview"
            >
              {showGlowPreview ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>

            <div className="w-px h-6 bg-gray-600" />

            {/* Selected fixture actions */}
            {selectedFixture && (
              <>
                <button
                  onClick={duplicateSelected}
                  className="p-2 rounded text-gray-400 hover:text-white transition-colors"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={toggleLock}
                  className={`p-2 rounded transition-colors ${
                    selectedFixture.locked ? 'text-amber-500' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Lock/Unlock (Ctrl+L)"
                >
                  {selectedFixture.locked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
                <button
                  onClick={deleteSelected}
                  className="p-2 rounded text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete (Del)"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-px h-6 bg-gray-600" />
              </>
            )}

            {/* Actions */}
            <button
              onClick={clearAll}
              className="p-2 rounded text-gray-400 hover:text-red-500 transition-colors"
              title="Clear All"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={handleImport}
              className="p-2 rounded text-gray-400 hover:text-white transition-colors"
              title="Import from Clipboard"
            >
              <Clipboard size={18} />
            </button>

            <button
              onClick={handleExport}
              className="p-2 rounded text-gray-400 hover:text-white transition-colors"
              title="Export to Clipboard"
            >
              <Download size={18} />
            </button>

            {/* Fixture count */}
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
              <Layers size={14} />
              <span>{fixtures.length} fixtures</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 cursor-crosshair overflow-hidden"
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Base Image */}
        <img
          src={imageUrl}
          alt="Property"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />

        {/* Glow Preview Canvas (overlay) */}
        {showGlowPreview && imageLoaded && (
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
            style={{ opacity: 0.8 }}
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
              backgroundSize: `${gridSize}% ${gridSize}%`
            }}
          />
        )}

        {/* Fixture Markers */}
        {fixtures.map(fixture => {
          const isSelected = fixture.id === selectedId;
          const preset = getFixturePreset(fixture.type);
          const color = kelvinToRGB(fixture.colorTemp);

          return (
            <motion.div
              key={fixture.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-${fixture.locked ? 'not-allowed' : 'move'}`}
              style={{
                left: imageBounds.offsetX + (fixture.x / 100) * imageBounds.width,
                top: imageBounds.offsetY + (fixture.y / 100) * imageBounds.height,
                zIndex: isSelected ? 100 : 10
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onMouseDown={(e) => handleDragStart(e, fixture.id)}
            >
              {/* Outer glow ring */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''
                }`}
                style={{
                  width: 32,
                  height: 32,
                  marginLeft: -16,
                  marginTop: -16,
                  background: `radial-gradient(circle, rgba(${color[0]}, ${color[1]}, ${color[2]}, ${fixture.intensity * 0.8}) 0%, transparent 70%)`,
                  boxShadow: `0 0 ${20 * fixture.intensity}px rgba(${color[0]}, ${color[1]}, ${color[2]}, ${fixture.intensity * 0.5})`
                }}
              />

              {/* Fixture icon */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-500 border-white scale-110'
                    : 'bg-gray-800 border-amber-500 hover:scale-105'
                } ${fixture.locked ? 'opacity-50' : ''}`}
                style={{
                  color: isSelected ? 'white' : `rgb(${color[0]}, ${color[1]}, ${color[2]})`
                }}
              >
                {preset.icon}
                {fixture.locked && (
                  <Lock size={10} className="absolute -top-1 -right-1 text-amber-400" />
                )}
              </div>

              {/* Label */}
              {fixture.label && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-1 rounded whitespace-nowrap">
                  {fixture.label}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Properties Panel (when fixture selected) */}
      <AnimatePresence>
        {selectedFixture && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur border-t border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="text-lg">{getFixturePreset(selectedFixture.type).icon}</span>
                {getFixturePreset(selectedFixture.type).name}
              </h3>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Intensity */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Intensity: {Math.round(selectedFixture.intensity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedFixture.intensity * 100}
                  onChange={(e) => updateSelectedFixture({ intensity: parseInt(e.target.value) / 100 })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Color Temperature */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Color: {selectedFixture.colorTemp}K
                </label>
                <input
                  type="range"
                  min="2700"
                  max="5000"
                  step="100"
                  value={selectedFixture.colorTemp}
                  onChange={(e) => updateSelectedFixture({ colorTemp: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gradient-to-r from-orange-400 via-yellow-200 to-blue-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Beam Angle */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Beam: {selectedFixture.beamAngle}°
                </label>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={selectedFixture.beamAngle}
                  onChange={(e) => updateSelectedFixture({ beamAngle: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Position display */}
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-4">
              <span>Position: ({selectedFixture.x.toFixed(1)}%, {selectedFixture.y.toFixed(1)}%)</span>
              <span>ID: {selectedFixture.id.slice(-8)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default FixturePlacer;
