import { GoogleGenAI } from "@google/genai";
import type { LightFixture } from "../types/fixtures";

const NANO_BANANA_MODEL = 'gemini-3-pro-image-preview'; // Nano Banana 2 Pro
const DEEPTHINK_MODEL = 'gemini-3-pro-preview'; // For analysis

const API_TIMEOUT_MS = 120000;

interface ManualPlacementResult {
  imageUrl: string;
  prompt: string;
  generationTime: number;
}

/**
 * Converts fixture coordinates to precise Nano Banana 2 Pro prompt
 */
export function buildManualPlacementPrompt(
  fixtures: LightFixture[],
  imageWidth: number,
  imageHeight: number,
  styleNotes?: string
): string {
  const positionDescriptions = fixtures.map((fixture, i) => {
    const px = Math.round((fixture.x / 100) * imageWidth);
    const py = Math.round((fixture.y / 100) * imageHeight);
    
    // Natural language position
    const xPos = fixture.x < 33 ? "left" : fixture.x < 67 ? "center" : "right";
    const yPos = fixture.y < 40 ? "upper" : fixture.y < 70 ? "middle" : "lower";
    
    const typeMap: Record<string, string> = {
      uplight: "LED uplight",
      downlight: "soffit downlight", 
      path_light: "pathway light",
      spot: "accent spot",
      wall_wash: "wall wash fixture",
      well_light: "in-ground well light",
      gutter_uplight: "gutter-mounted uplight",
      step_light: "step light"
    };
    
    return `Fixture ${i + 1}: ${typeMap[fixture.type] || fixture.type} positioned at the ${yPos}-${xPos} of the image (pixel coordinates: ${px}, ${py}), ${fixture.rotation ? `rotated ${fixture.rotation}°, ` : ''}intensity ${Math.round(fixture.intensity * 100)}%, ${fixture.colorTemp}K color temperature`;
  }).join('\n');
  
  return `Transform this residential property photo into a photorealistic nighttime scene with professional landscape lighting.

USER'S EXACT FIXTURE PLACEMENTS (place lights at these precise coordinates):
${positionDescriptions}

RENDERING REQUIREMENTS:
- Photorealistic 2K resolution night render
- Warm ambient lighting from fixtures casting according to their type
- Natural shadows and light falloff based on beam angles
- Maintain architectural accuracy - do not move or alter building structure
- Evening blue hour sky background with stars
- Subtle ground illumination from uplight spill
- Professional-grade fixture housings visible at placement points
- Consistent lighting color temperature across all fixtures

${styleNotes ? `STYLE NOTES: ${styleNotes}` : ''}

Style: Professional architectural visualization, warm and inviting atmosphere, high-end residential lighting design.`;
}

/**
 * Analyzes property with DeepThink and suggests optimal fixture placements
 */
export async function analyzePropertyWithDeepThink(
  imageBase64: string,
  apiKey: string
): Promise<LightFixture[]> {
  const genAI = new GoogleGenAI({ apiKey });
  
  const prompt = `Analyze this property photo for landscape lighting. Identify optimal positions for gutter-mounted uplights along the roofline.

Return ONLY a JSON array of suggested fixtures:
[
  {
    "x": 15.5,  // percentage from left (0-100)
    "y": 55.0,  // percentage from top (0-100)  
    "type": "gutter_uplight",
    "reason": "architectural corner needs accent"
  }
]

Guidelines:
- Space uplights every 6-10 feet along gutters
- Place at corners, peaks, and architectural features
- Avoid obstacles like downspouts
- Include 4-8 fixtures for typical home`;

  try {
    const result = await genAI.models.generateContent({
      model: DEEPTHINK_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      ],
      config: {
        thinkingConfig: { thinkingBudget: 8192 },
        responseMimeType: 'application/json'
      }
    });
    
    const text = result.text || '[]';
    const suggestions = JSON.parse(text);
    
    // Convert to LightFixture format
    return suggestions.map((s: any, i: number) => ({
      id: `deepthink-${i}`,
      x: s.x,
      y: s.y,
      type: s.type || 'gutter_uplight',
      intensity: 0.8,
      colorTemp: 2700,
      beamAngle: 60,
      label: s.reason || `Suggestion ${i + 1}`
    }));
  } catch (error) {
    console.error('DeepThink analysis failed:', error);
    return [];
  }
}

/**
 * Generates night render with Nano Banana 2 Pro using manual placements
 */
export async function generateWithManualPlacement(
  imageBase64: string,
  fixtures: LightFixture[],
  apiKey: string,
  imageWidth: number = 1024,
  imageHeight: number = 768,
  styleNotes?: string
): Promise<ManualPlacementResult> {
  const genAI = new GoogleGenAI({ apiKey });
  const prompt = buildManualPlacementPrompt(fixtures, imageWidth, imageHeight, styleNotes);
  
  const startTime = Date.now();
  
  try {
    const result = await Promise.race([
      genAI.models.generateContent({
        model: NANO_BANANA_MODEL,
        contents: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Generation timed out')), API_TIMEOUT_MS)
      )
    ]) as any;
    
    // Extract image from response
    let imageUrl = '';
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
    
    if (!imageUrl) {
      throw new Error('No image generated');
    }
    
    return {
      imageUrl,
      prompt,
      generationTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Manual placement generation failed:', error);
    throw error;
  }
}

/**
 * Creates inpainting mask for fixture positions (alternative approach)
 */
export function createPlacementMask(
  fixtures: LightFixture[],
  width: number,
  height: number
): string {
  // Create SVG mask - can be converted to base64 PNG in production
  const circles = fixtures.map(f => {
    const cx = (f.x / 100) * width;
    const cy = (f.y / 100) * height;
    return `<circle cx="${cx}" cy="${cy}" r="15" fill="white" />`;
  }).join('');
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="black"/>
    ${circles}
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
