
import { GoogleGenAI } from "@google/genai";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

// Timeout for API calls (2 minutes)
const API_TIMEOUT_MS = 120000;

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg',
  aspectRatio: string = '1:1',
  lightIntensity: number = 45,
  beamAngle: number = 30,
  colorTemperaturePrompt: string = "Use Soft White (3000K) for all lights."
): Promise<string> => {
  
  // Initialization: The API key is obtained from environment variable
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Map sliders (0-100) to descriptive prompt instructions
  const getIntensityPrompt = (val: number) => {
    if (val < 30) return "Lighting Intensity: SUBTLE, SOFT, DIM. The lights should be faint accents.";
    if (val > 70) return "Lighting Intensity: BRIGHT, HIGH LUMEN, INTENSE. High contrast.";
    return "Lighting Intensity: BALANCED, STANDARD professional levels.";
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return "Beam Angle: 15 DEGREES (NARROW SPOT). Tight columns of light.";
    if (angle <= 30) return "Beam Angle: 30 DEGREES (SPOT). Focused beams with defined edges.";
    if (angle >= 60) return "Beam Angle: 60 DEGREES (WIDE FLOOD). Broad soft wash.";
    return "Beam Angle: 45 DEGREES (FLOOD). Standard spread.";
  };

  // Simplified prompt structure to avoid adversarial trigger patterns while maintaining instruction density.
  const systemPrompt = `
    You are a professional Architectural Lighting Designer and Photo Retoucher.
    Task: Transform the provided daylight photograph into a realistic, high-end night-time landscape lighting scene.

    # CORE CONSTRAINTS (STRICT)
    1. **Structure**: Keep the original image geometry, architecture, and landscaping exactly as is. Do not crop or zoom.
    2. **STRICT PROHIBITION: GEOMETRIC ADDITIONS**: You are FORBIDDEN from adding any physical objects.
       - NO NEW TREES. NO NEW BUSHES.
       - NO NEW SIDEWALKS. NO NEW DRIVEWAYS. NO NEW PATHS.
       - NO NEW ARCHITECTURE (No wings, no dormers, no extra windows).
       - NO NEW DECOR (No pots, no furniture).
       - Your job is to ADD LIGHT, NOT MATTER.
    3. **Background**: Trees in the background must remain dark silhouettes.
    4. **Sky**: The night sky must feature a photorealistic FULL MOON and STARS. The moon should look natural with crater details and realistic luminance.
    5. **Exclusive Generation Protocol**: If a lighting type or location is NOT explicitly listed in "DESIGN REQUEST" as "ALLOWED", it is FORBIDDEN. The default state for all unmentioned surfaces (roofs, paths, walls) is DARKNESS.

    # LIGHTING SPECIFICATIONS
    - **Style**: High-contrast Chiaroscuro. Pitch black environment with specific light sources. No generic ambient wash.
    - **Color Temperature**: ${colorTemperaturePrompt}
    - **Intensity**: ${getIntensityPrompt(lightIntensity)}
    - **Beam**: ${getBeamAnglePrompt(beamAngle)}
    
    # EXCLUSIVE GENERATION RULES
    - **PLACEMENT PRIORITY**: The "DESIGN REQUEST" below contains a strict ALLOW-LIST.
    - **Zero Hallucination**: If the user selects "Trees" only, the House MUST remain DARK. If the user selects "Path" only, the House and Trees MUST remain DARK.
    - **Soffit/Eave Defaults**: DEFAULT OFF. Unless explicitly requested in "DESIGN REQUEST".
    - **Beam Hygiene**: Light sources must be realistic (cone shape, falloff).

    # DESIGN REQUEST
    Apply the following specific configuration to the scene. These instructions override default placement rules if they conflict:
    
    ${userInstructions}
  `;

  try {
    const generatePromise = ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: systemPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
            imageSize: "2K",
            aspectRatio: aspectRatio,
        }
      },
    });

    // Wrap with timeout to prevent hanging
    const response = await withTimeout(
      generatePromise,
      API_TIMEOUT_MS,
      'Generation timed out. The server took too long to respond. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      // Check for finishReason to debug safety blocks
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.warn(`Gemini generation stopped with reason: ${candidate.finishReason}`);
          // We don't throw immediately, as there might still be content, but it's a good indicator of issues.
      }

      if (candidate.content && candidate.content.parts) {
          const parts = candidate.content.parts;
          
          // First, try to find the image part
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
          }
          
          // If no image part found, check for text (error description from model)
          const textPart = parts.find(p => p.text);
          if (textPart && textPart.text) {
             throw new Error(`Generation blocked: ${textPart.text}`);
          }
      }
    }

    // Capture safety ratings if available for debugging
    if (response.candidates && response.candidates[0] && response.candidates[0].safetyRatings) {
        console.warn("Safety Ratings:", response.candidates[0].safetyRatings);
    }

    throw new Error("No image generated. The model returned an empty response (Possible Safety Filter Trigger).");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};