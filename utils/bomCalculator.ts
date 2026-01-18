import { LineItem, BOMData, BOMFixture, FixtureCatalogItem } from '../types';
import {
  DEFAULT_FIXTURE_WATTAGES,
  TRANSFORMER_SIZES,
  FIXTURE_TYPE_NAMES
} from '../constants';

// Map fixture pricing IDs to fixture types
const FIXTURE_ID_TO_TYPE: Record<string, string> = {
  'default_up': 'up',
  'default_path': 'path',
  'default_gutter': 'gutter',
  'default_soffit': 'soffit',
  'default_hardscape': 'hardscape',
  'default_coredrill': 'coredrill'
};

/**
 * Extracts the fixture type from a line item ID
 */
function getFixtureType(itemId: string): string | null {
  // Check direct mapping
  if (FIXTURE_ID_TO_TYPE[itemId]) {
    return FIXTURE_ID_TO_TYPE[itemId];
  }

  // Check if the ID contains a known fixture type
  const types = ['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill'];
  for (const type of types) {
    if (itemId.toLowerCase().includes(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Calculates the recommended transformer based on total wattage
 * Uses the 80% rule - transformer should run at max 80% capacity
 */
function calculateTransformer(totalWattage: number): { name: string; watts: number; loadPercentage: number } {
  // Minimum transformer size = wattage / 0.8 (80% rule)
  const minTransformerSize = totalWattage / 0.8;

  // Find the smallest transformer that can handle the load
  for (const transformer of TRANSFORMER_SIZES) {
    if (transformer.watts >= minTransformerSize) {
      const loadPercentage = Math.round((totalWattage / transformer.watts) * 100);
      return {
        name: transformer.name,
        watts: transformer.watts,
        loadPercentage
      };
    }
  }

  // If no single transformer works, recommend the largest one
  const largest = TRANSFORMER_SIZES[TRANSFORMER_SIZES.length - 1];
  return {
    name: `${largest.name} (may need multiple)`,
    watts: largest.watts,
    loadPercentage: Math.round((totalWattage / largest.watts) * 100)
  };
}

/**
 * Estimates wire footage based on fixture count
 */
function calculateWireEstimate(totalFixtures: number): { gauge: string; footage: number; runsNeeded: number } {
  // Base footage estimate
  const baseFootage = 150;
  const additionalPerFixture = 25;

  // Calculate total footage
  const footage = baseFootage + Math.max(0, totalFixtures - 10) * additionalPerFixture;

  // Determine wire gauge (12/2 for most, 10/2 for longer runs)
  const gauge = footage > 300 ? '10/2' : '12/2';

  // Estimate number of home runs (roughly 1 per 10-15 fixtures)
  const runsNeeded = Math.max(1, Math.ceil(totalFixtures / 12));

  return { gauge, footage, runsNeeded };
}

/**
 * Generates a Bill of Materials from quote line items
 */
export function generateBOM(
  lineItems: LineItem[],
  fixtureCatalog?: FixtureCatalogItem[]
): BOMData {
  const fixtures: BOMFixture[] = [];
  let totalWattage = 0;
  let totalFixtures = 0;

  for (const item of lineItems) {
    const fixtureType = getFixtureType(item.id);

    // Skip non-fixture items (like transformers)
    if (!fixtureType || item.id.includes('transformer')) {
      continue;
    }

    // Get wattage from user's catalog or use defaults
    const catalogItem = fixtureCatalog?.find(c => c.fixtureType === fixtureType);
    const wattage = catalogItem?.wattage || DEFAULT_FIXTURE_WATTAGES[fixtureType] || 4;

    const fixtureWattage = item.quantity * wattage;
    totalWattage += fixtureWattage;
    totalFixtures += item.quantity;

    fixtures.push({
      id: item.id,
      category: fixtureType,
      name: FIXTURE_TYPE_NAMES[fixtureType] || item.name,
      quantity: item.quantity,
      wattage: wattage,
      totalWattage: fixtureWattage,
      sku: catalogItem?.sku || undefined,
      brand: catalogItem?.brand || undefined
    });
  }

  return {
    fixtures,
    totalWattage,
    totalFixtures,
    recommendedTransformer: calculateTransformer(totalWattage),
    wireEstimate: calculateWireEstimate(totalFixtures),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Exports BOM data as CSV string
 */
export function exportBOMAsCSV(bom: BOMData): string {
  const lines: string[] = [];

  // Header
  lines.push('Category,Name,Quantity,Wattage (per unit),Total Wattage,Brand,SKU');

  // Fixtures
  for (const fixture of bom.fixtures) {
    lines.push([
      fixture.category,
      `"${fixture.name}"`,
      fixture.quantity,
      fixture.wattage,
      fixture.totalWattage,
      `"${fixture.brand || ''}"`,
      `"${fixture.sku || ''}"`
    ].join(','));
  }

  // Summary
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`Total Fixtures,${bom.totalFixtures}`);
  lines.push(`Total Wattage,${bom.totalWattage}W`);
  lines.push(`Recommended Transformer,${bom.recommendedTransformer.name}`);
  lines.push(`Load Percentage,${bom.recommendedTransformer.loadPercentage}%`);
  lines.push(`Wire Gauge,${bom.wireEstimate.gauge}`);
  lines.push(`Wire Footage Estimate,${bom.wireEstimate.footage}ft`);
  lines.push(`Home Runs Needed,${bom.wireEstimate.runsNeeded}`);

  return lines.join('\n');
}

/**
 * Downloads BOM as CSV file
 */
export function downloadBOMAsCSV(bom: BOMData, filename?: string): void {
  const csv = exportBOMAsCSV(bom);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `BOM_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies SKU list to clipboard
 */
export async function copySkusToClipboard(bom: BOMData): Promise<boolean> {
  const skuList = bom.fixtures
    .filter(f => f.sku)
    .map(f => `${f.quantity}x ${f.sku} (${f.name})`)
    .join('\n');

  if (!skuList) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(skuList);
    return true;
  } catch {
    return false;
  }
}
