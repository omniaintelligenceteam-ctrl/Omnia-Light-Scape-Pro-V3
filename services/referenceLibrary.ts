/**
 * Reference Library for Few-Shot Learning
 *
 * Stores good + bad example images per fixture type.
 * At generation time, the relevant examples are loaded and injected
 * into the Gemini API call so the AI sees what correct/incorrect
 * results look like before generating.
 *
 * To add references:
 * 1. Save good/bad result images to public/references/
 * 2. Update FIXTURE_REFERENCES below with the filenames
 */

// Type for multimodal parts sent to Gemini
type GeminiPart = { inlineData: { data: string; mimeType: string } } | { text: string };

export interface FixtureReference {
  type: string;
  goodImages: string[];
  badImages: string[];
  goodDescription: string;
  badDescription: string;
}

/**
 * Manifest of reference images per fixture type.
 * Add filenames to goodImages/badImages arrays for each type.
 * Leave arrays empty if no examples exist yet for that type.
 */
export const FIXTURE_REFERENCES: FixtureReference[] = [
  {
    type: 'UP',
    goodImages: [],
    badImages: [],
    goodDescription: 'Ground-mounted fixture casting a warm beam upward along the wall surface, illuminating architectural features from below',
    badDescription: 'Light mounted on the wall instead of ground, or beam going sideways/down instead of upward',
  },
  {
    type: 'GUTTER',
    goodImages: ['gutter_good_01.png', 'gutter_good_02.png'],
    badImages: ['gutter_bad_01.png', 'gutter_bad_02.png'],
    goodDescription: 'Small light sitting inside the gutter channel, warm beam aimed upward along the wall and roofline edge',
    badDescription: 'Light placed on the wall surface or under the soffit instead of inside the gutter trough, or beam shining DOWNWARD instead of upward',
  },
  {
    type: 'PATH',
    goodImages: [],
    badImages: [],
    goodDescription: 'Low bollard-style fixture standing on the ground beside a walkway, casting a soft downward pool of light on the path surface',
    badDescription: 'Light floating above the ground or placed in garden beds instead of along the path edge',
  },
  {
    type: 'WELL',
    goodImages: [],
    badImages: [],
    goodDescription: 'In-ground well light flush with soil surface, beam aimed upward into tree canopy creating dramatic uplighting through branches',
    badDescription: 'Light mounted on the tree trunk or placed above ground instead of recessed flush into the soil',
  },
  {
    type: 'HARDSCAPE',
    goodImages: [],
    badImages: [],
    goodDescription: 'Small linear light tucked under a step tread or hardscape ledge, casting a subtle wash downward onto the riser face below',
    badDescription: 'Light placed on top of the step or mounted on a vertical surface instead of under the tread overhang',
  },
  {
    type: 'SOFFIT',
    goodImages: [],
    badImages: [],
    goodDescription: 'Recessed downlight in the soffit/overhang, beam aimed straight down illuminating the area below the eave',
    badDescription: 'Light mounted on the wall face or pointing upward instead of recessed in the soffit pointing down',
  },
  {
    type: 'COREDRILL',
    goodImages: [],
    badImages: [],
    goodDescription: 'Flush-mounted light drilled into concrete/hardscape surface, small circular beam aimed upward from the ground plane',
    badDescription: 'Light sitting on top of concrete instead of flush-recessed, or confused with a standard uplight',
  },
];

// Cache loaded images to avoid re-fetching during a session
const imageCache = new Map<string, string>();

/** Infer MIME type from filename extension */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Get references that match the selected fixture types.
 * Only returns entries that have at least one image (good or bad).
 * Caps at 5 types to keep image count manageable.
 */
export function getReferencesForTypes(types: string[]): FixtureReference[] {
  const normalizedTypes = types.map(t => t.toUpperCase());

  const matched = FIXTURE_REFERENCES.filter(
    ref => normalizedTypes.includes(ref.type)
  );

  // Cap at 5 types
  return matched.slice(0, 5);
}

/**
 * Load an image from /references/ as base64.
 * Uses a session cache to avoid re-fetching.
 */
export async function loadReferenceImage(filename: string): Promise<string> {
  if (imageCache.has(filename)) {
    return imageCache.get(filename)!;
  }

  const response = await fetch(`/references/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load reference image: /references/${filename} (${response.status})`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URI prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      imageCache.set(filename, base64);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Build the prefixParts array for Gemini API injection.
 * Returns interleaved text labels + images for each matched fixture type.
 * Returns empty array if no references are available.
 */
export async function buildReferenceParts(types: string[]): Promise<GeminiPart[]> {
  const refs = getReferencesForTypes(types);

  if (refs.length === 0) {
    return [];
  }

  const parts: GeminiPart[] = [];

  parts.push({
    text: '## REFERENCE EXAMPLES — Study these before generating\n\nBelow are examples of CORRECT and INCORRECT fixture rendering for each type you need to produce. Match the CORRECT style exactly. Avoid the mistakes shown in INCORRECT examples.\n\n',
  });

  for (const ref of refs) {
    // Good examples
    if (ref.goodImages.length > 0) {
      parts.push({
        text: `### ${ref.type} LIGHT — CORRECT\n${ref.goodDescription}:\n`,
      });
      for (const img of ref.goodImages) {
        try {
          const base64 = await loadReferenceImage(img);
          parts.push({
            inlineData: { data: base64, mimeType: getMimeType(img) },
          });
        } catch (err) {
          console.warn(`[ReferenceLibrary] Failed to load good image ${img} for ${ref.type}:`, err);
        }
      }
    } else if (ref.goodDescription) {
      parts.push({
        text: `### ${ref.type} LIGHT — CORRECT\n${ref.goodDescription}\n\n`,
      });
    }

    // Bad examples
    if (ref.badImages.length > 0) {
      parts.push({
        text: `### ${ref.type} LIGHT — INCORRECT (DO NOT do this)\n${ref.badDescription}:\n`,
      });
      for (const img of ref.badImages) {
        try {
          const base64 = await loadReferenceImage(img);
          parts.push({
            inlineData: { data: base64, mimeType: getMimeType(img) },
          });
        } catch (err) {
          console.warn(`[ReferenceLibrary] Failed to load bad image ${img} for ${ref.type}:`, err);
        }
      }
    } else if (ref.badDescription) {
      parts.push({
        text: `### ${ref.type} LIGHT — INCORRECT (DO NOT do this)\n${ref.badDescription}\n\n`,
      });
    }
  }

  parts.push({
    text: '## END OF REFERENCE EXAMPLES\nNow generate based on the following images and instructions:\n\n',
  });

  console.log(`[ReferenceLibrary] Built ${parts.length} parts for types: ${refs.map(r => r.type).join(', ')}`);
  return parts;
}
