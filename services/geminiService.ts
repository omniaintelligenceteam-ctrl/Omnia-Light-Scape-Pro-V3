import { GoogleGenAI } from "@google/genai";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg',
  aspectRatio: string = '1:1',
  lightIntensity: number = 45,
  beamAngle: number = 30
): Promise<string> => {
  
  // Robust API Key retrieval to prevent 'undefined' access errors
  let apiKey: string | undefined = process.env.API_KEY;
  
  if (!apiKey) {
      try {
          // @ts-ignore
          if (typeof import.meta !== 'undefined' && import.meta.env) {
              // @ts-ignore
              apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          }
      } catch (e) {
          // Ignore errors if import.meta is not available
      }
  }

  if (!apiKey) {
    console.error("API Key Check Failed. API_KEY is missing.");
    throw new Error("Missing API Key. Please check Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Map sliders (0-100) to descriptive prompt instructions
  const getIntensityPrompt = (val: number) => {
    if (val < 30) return "Lighting Intensity: SUBTLE, SOFT, DIM. The lights should be faint accents, not overpowering.";
    if (val > 70) return "Lighting Intensity: BRIGHT, HIGH LUMEN, INTENSE. The lights should be very strong, creating high contrast and dramatic wash.";
    return "Lighting Intensity: BALANCED, STANDARD. Professional landscape lighting levels.";
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return "Beam Angle: 15 DEGREES (NARROW SPOT). The lights should create tight, focused columns of light on walls/trees. High contrast between lit area and shadow.";
    if (angle <= 30) return "Beam Angle: 30 DEGREES (SPOT). Focused beams with defined edges, suitable for highlighting specific architectural features. Sharp cut-off.";
    if (angle >= 60) return "Beam Angle: 60 DEGREES (WIDE FLOOD). The lights should cast a broad, soft wash covering a large area. Soft edges.";
    return "Beam Angle: 45 DEGREES (FLOOD). Standard landscape lighting spread. Balanced coverage.";
  };

  // Construct a prompt that enforces the Day-to-Night conversion rules with strict structural fidelity
  const systemPrompt = `
    Role: Professional Architectural Photo Retoucher.
    Task: Retouch the provided daylight photograph to simulate a night-time landscape lighting installation.

    *** CRITICAL SECURITY PROTOCOL: ANTI-HALLUCINATION (ABSOLUTE HARD RULES) ***
    1.  **NO NEW FEATURES**: DO NOT generate any new features to the home, trees, dormers, or landscape. Anything that isn't in the original picture MUST NOT appear.
    2.  **PRESERVE GEOMETRY**: Keep the picture exactly how it is structurally. You are strictly forbidden from adding trees, plants, bushes, walkways, architectural details, or structures.
    3.  **SOURCE OF TRUTH**: The input image is the absolute truth. If a lawn is empty in the day photo, it MUST remain empty in the night photo. 
    4.  **NO GHOST TREES**: Do not generate silhouettes of trees in the background or foreground to justify a light source. If there is no tree, there is no light.
    5.  **LIGHTING ONLY**: Your ONLY job is to adjust lighting (brightness/contrast/shadows). Do not act as a remodeler.
    6.  **NO BACKGROUND TREES**: **HARD RULE**: Do NOT light up trees that are located behind the house or on the "other side" of the structure. Trees visible above the roofline or in the far distance must remain DARK SILHOUETTES. Only light trees explicitly in the foreground/front yard.

    *** CRITICAL EXCLUSIVITY RULE (HARD RULES) ***
    1. **ONLY SELECTED FIXTURES ALLOWED**: You are strictly limited to generating the fixtures explicitly listed under [APPLY TO EXISTING] in the "REQUESTED DESIGN" section below.
    2. **ABSOLUTE PROHIBITION**: Any fixture type listed under [DO NOT ADD] MUST NOT be generated. For example, if "Soffit Lights" are [DO NOT ADD], the eaves must remain PITCH BLACK. If "Path Lights" are [DO NOT ADD], the walkway must remain DARK.
    3. **NO SUBSTITUTION**: Do not substitute unselected lights to fill dark spots. If a spot is dark because the appropriate fixture was not selected, LEAVE IT DARK.
    4. **RULE HIERARCHY**: The specific placement rules for selected fixtures must be followed strictly unless specific guidance is given in the "ADDITIONAL CUSTOM NOTES" that explicitly goes against them.

    *** CRITICAL LIGHTING PHYSICS & REALISM (HIGH CONTRAST) ***
    - **Global Atmosphere**: Sky/Environment: PITCH BLACK NIGHT SKY. The sky must be black. It must contain visible STARS and a FULL MOON.
    - **CHIAROSCURO EFFECT (CONTRAST)**: The image MUST exhibit high dynamic range (light and dark). Do NOT evenly light the whole house or wash it out. You must allow DARK SHADOWS to exist *between* the cones of light to create architectural depth and dimension.
    - **PHYSICAL LIGHT FALL-OFF**: Light MUST obey physics. It is brightest at the source (bottom) and fades gradually as it goes up the wall. Do NOT paint a solid, uniform bar of light. The top of the light cone should fade softly into darkness.
    - **Lighting Power**: ${getIntensityPrompt(lightIntensity)}
    - **Beam Physics**: ${getBeamAnglePrompt(beamAngle)}
    - **DESIGN RULE (OUTER SECTIONS)**: Always light up the outer sections of the house (the far left and far right corners/edges). Illuminating the full width ensures the home looks bigger at night.
    - **NO SECURITY LIGHTS**: Do NOT generate floodlights, motion sensor lights, or high-intensity security lighting on walls or corners. If such fixtures exist in the photo, keep them OFF and DARK.
    
    *** SPECIFIC FIXTURE RULES (HARD CONSTRAINTS) ***
    - **GUTTER UP LIGHTS**: These fixtures mount on the *outside* lip of the gutter and shine **UPWARDS ONLY**. The physical fixture must be **SMALL, DISCRETE, and LOW-PROFILE**. CRITICAL ALIGNMENT: If a dormer window exists, the light MUST be placed DIRECTLY CENTERED under the window and shine STRAIGHT UP to it. They do **NOT** shine down. They do **NOT** light the soffit.
    - **SOFFIT/EAVE LIGHTS**: These are downlights recessed in the overhangs.
    - **MUTUAL EXCLUSIVITY RULE**: If "Gutter Up Lights" are ON and "Soffit Lights" are OFF, you must **STRICTLY** keep the underside of the roof (the soffits/eaves) PITCH DARK. Do not allow any light to bleed under the roof. Only the face of the dormers above the gutter should be lit.
    
    - **Columns & Pillars (PRIORITY)**: If the user requests "Up Lights", you MUST place lights at the base of any visible architectural columns or pillars grazing upward.
    - **Quantity Adherence**: If the user instructions specify exact numbers (e.g. "10 up lights", "4 path lights"), you MUST attempt to distribute that approximate number of light sources visible in the scene, consistent with professional spacing.
    - **Conflict Resolution**: 
        - If the user asks for "Tree Lights" but the image contains no trees -> **IGNORE THE REQUEST**. Do not add a tree.
        - If the user asks for "Path Lights" but there is no path -> **IGNORE THE REQUEST**. Do not add a path.

    *** REQUESTED DESIGN ***
    ${userInstructions}
  `;

  try {
    const response = await ai.models.generateContent({
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

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};