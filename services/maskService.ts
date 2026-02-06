/**
 * Mask Generation Service
 *
 * Converts spatial map data (from property analysis) into binary masks
 * for FLUX Fill inpainting. Each mask defines exactly where a fixture
 * or group of fixtures should be placed.
 *
 * Masks are white-on-black PNGs where white = area to inpaint.
 */

import type { SpatialMap, SpatialFixturePlacement } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MaskGroup {
  maskBase64: string;         // Base64 PNG of the combined mask
  fixtureType: string;        // e.g., 'up', 'path', 'gutter'
  subOption: string;          // e.g., 'siding', 'windows', 'walkway'
  fixtureCount: number;       // Number of fixtures in this group
  placements: SpatialFixturePlacement[]; // Individual fixture placements
}

/**
 * Mask shape configuration per fixture type.
 * Defines how large and what shape the mask region should be.
 * All sizes are relative to image dimensions (0-1).
 */
interface MaskShapeConfig {
  /** Width of mask region relative to image width */
  widthRatio: number;
  /** Height of mask region relative to image height */
  heightRatio: number;
  /** Shape: 'ellipse' for circular/oval, 'rect' for rectangular */
  shape: 'ellipse' | 'rect';
  /** Vertical offset from fixture position (negative = up, positive = down) */
  verticalOffsetRatio: number;
  /** Padding multiplier (1.0 = exact size, 1.2 = 20% larger) */
  padding: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASK SHAPE CONFIGS PER FIXTURE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

const MASK_SHAPES: Record<string, MaskShapeConfig> = {
  // Uplights: Tall vertical ellipse covering wall area above fixture
  up: {
    widthRatio: 0.08,
    heightRatio: 0.25,
    shape: 'ellipse',
    verticalOffsetRatio: -0.12, // Shifted up (light goes upward)
    padding: 1.2,
  },
  // Path lights: Small circle at ground level
  path: {
    widthRatio: 0.06,
    heightRatio: 0.06,
    shape: 'ellipse',
    verticalOffsetRatio: 0,
    padding: 1.3,
  },
  // Gutter lights: Thin horizontal strip along gutter line
  gutter: {
    widthRatio: 0.06,
    heightRatio: 0.08,
    shape: 'ellipse',
    verticalOffsetRatio: -0.02, // Slightly above fixture position
    padding: 1.2,
  },
  // Soffit/downlights: Downward cone shape
  soffit: {
    widthRatio: 0.07,
    heightRatio: 0.15,
    shape: 'ellipse',
    verticalOffsetRatio: 0.07, // Shifted down (light goes downward)
    padding: 1.2,
  },
  // Hardscape lights: Small flush circle
  hardscape: {
    widthRatio: 0.05,
    heightRatio: 0.05,
    shape: 'ellipse',
    verticalOffsetRatio: 0,
    padding: 1.3,
  },
  // Core drill lights: Small in-ground circle
  coredrill: {
    widthRatio: 0.05,
    heightRatio: 0.05,
    shape: 'ellipse',
    verticalOffsetRatio: 0,
    padding: 1.3,
  },
  // Well lights: Medium circle with upward emphasis
  well: {
    widthRatio: 0.06,
    heightRatio: 0.15,
    shape: 'ellipse',
    verticalOffsetRatio: -0.06,
    padding: 1.2,
  },
  // Holiday lights: Wide horizontal strip
  holiday: {
    widthRatio: 0.15,
    heightRatio: 0.04,
    shape: 'rect',
    verticalOffsetRatio: 0,
    padding: 1.1,
  },
};

const DEFAULT_MASK_SHAPE: MaskShapeConfig = {
  widthRatio: 0.07,
  heightRatio: 0.12,
  shape: 'ellipse',
  verticalOffsetRatio: -0.05,
  padding: 1.2,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MASK GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a binary mask for a single fixture placement.
 * Returns a white-on-black image where white = inpaint region.
 */
function drawFixtureMask(
  ctx: CanvasRenderingContext2D,
  placement: SpatialFixturePlacement,
  imageWidth: number,
  imageHeight: number
): void {
  const config = MASK_SHAPES[placement.fixtureType] || DEFAULT_MASK_SHAPE;

  // Convert percentage position to pixels
  const centerX = (placement.horizontalPosition / 100) * imageWidth;
  // Vertical position: use a default based on fixture type if not in spatial map
  // Uplights are typically at 70-80% height (near ground), path lights at 85-90%
  const verticalPercent = getVerticalPosition(placement);
  const centerY = (verticalPercent / 100) * imageHeight;

  // Calculate mask dimensions with padding
  const maskWidth = config.widthRatio * imageWidth * config.padding;
  const maskHeight = config.heightRatio * imageHeight * config.padding;

  // Apply vertical offset
  const offsetY = config.verticalOffsetRatio * imageHeight;

  ctx.fillStyle = 'white';

  if (config.shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY + offsetY,
      maskWidth / 2,
      maskHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else {
    // Rectangle
    ctx.fillRect(
      centerX - maskWidth / 2,
      centerY + offsetY - maskHeight / 2,
      maskWidth,
      maskHeight
    );
  }
}

/**
 * Estimate vertical position for a fixture based on its type and anchor.
 * Uses sensible defaults when spatial map doesn't include explicit vertical positions.
 */
function getVerticalPosition(placement: SpatialFixturePlacement): number {
  const anchor = (placement.anchor || '').toLowerCase();

  // Check for explicit vertical hints in the anchor description
  if (anchor.includes('roof') || anchor.includes('gutter') || anchor.includes('soffit')) {
    return 15; // Near top of image
  }
  if (anchor.includes('dormer')) {
    return 20;
  }
  if (anchor.includes('second') || anchor.includes('2nd')) {
    return 35;
  }
  if (anchor.includes('window') && !anchor.includes('first')) {
    return 50; // Mid-height
  }
  if (anchor.includes('first') || anchor.includes('1st')) {
    return 60;
  }

  // Default vertical positions by fixture type
  switch (placement.fixtureType) {
    case 'gutter':
      return 15;  // Gutter line near rooftop
    case 'soffit':
      return 20;  // Eave level
    case 'up':
      return 75;  // Ground level, light goes up
    case 'path':
      return 88;  // Walkway level
    case 'hardscape':
    case 'coredrill':
      return 85;  // Ground/patio level
    case 'well':
      return 80;  // In-ground
    case 'holiday':
      return 18;  // Roofline
    default:
      return 70;  // Default mid-low
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPING LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Group fixtures by type and proximity for efficient batch processing.
 * Fixtures of the same type within 15% horizontal distance are grouped together.
 * Returns 2-4 groups typically.
 */
function groupFixturesByTypeAndRegion(
  placements: SpatialFixturePlacement[]
): Array<{ fixtureType: string; subOption: string; placements: SpatialFixturePlacement[] }> {
  // First group by fixture type + sub-option
  const byTypeMap = new Map<string, SpatialFixturePlacement[]>();

  for (const p of placements) {
    const key = `${p.fixtureType}_${p.subOption}`;
    const existing = byTypeMap.get(key) || [];
    existing.push(p);
    byTypeMap.set(key, existing);
  }

  const groups: Array<{ fixtureType: string; subOption: string; placements: SpatialFixturePlacement[] }> = [];

  for (const [key, typePlacements] of byTypeMap) {
    const [fixtureType, subOption] = key.split('_');

    // Sort by horizontal position for proximity grouping
    const sorted = [...typePlacements].sort(
      (a, b) => a.horizontalPosition - b.horizontalPosition
    );

    // Sub-group by proximity (within 40% horizontal distance)
    let currentGroup: SpatialFixturePlacement[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const distance = sorted[i].horizontalPosition - sorted[i - 1].horizontalPosition;
      if (distance > 40) {
        // Start new sub-group
        groups.push({ fixtureType, subOption, placements: currentGroup });
        currentGroup = [sorted[i]];
      } else {
        currentGroup.push(sorted[i]);
      }
    }

    // Push the last sub-group
    if (currentGroup.length > 0) {
      groups.push({ fixtureType, subOption, placements: currentGroup });
    }
  }

  return groups;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate grouped masks from a spatial map.
 * Returns MaskGroup objects ready for FLUX Fill inpainting.
 */
export function generateGroupedMasks(
  spatialMap: SpatialMap,
  imageWidth: number,
  imageHeight: number
): MaskGroup[] {
  if (!spatialMap.placements || spatialMap.placements.length === 0) {
    return [];
  }

  const groups = groupFixturesByTypeAndRegion(spatialMap.placements);
  const maskGroups: MaskGroup[] = [];

  for (const group of groups) {
    // Create a canvas for this group's combined mask
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('[MaskService] Failed to create canvas context');
      continue;
    }

    // Fill with black (no inpainting)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, imageWidth, imageHeight);

    // Draw white regions for each fixture in the group
    for (const placement of group.placements) {
      drawFixtureMask(ctx, placement, imageWidth, imageHeight);
    }

    // Convert to base64 PNG
    const maskDataUrl = canvas.toDataURL('image/png');
    const maskBase64 = maskDataUrl.split(',')[1];

    maskGroups.push({
      maskBase64,
      fixtureType: group.fixtureType,
      subOption: group.subOption,
      fixtureCount: group.placements.length,
      placements: group.placements,
    });
  }

  return maskGroups;
}

/**
 * Generate a single mask for one fixture placement (for debugging/preview).
 */
export function generateSingleMask(
  placement: SpatialFixturePlacement,
  imageWidth: number,
  imageHeight: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, imageWidth, imageHeight);
  drawFixtureMask(ctx, placement, imageWidth, imageHeight);

  return canvas.toDataURL('image/png').split(',')[1];
}
