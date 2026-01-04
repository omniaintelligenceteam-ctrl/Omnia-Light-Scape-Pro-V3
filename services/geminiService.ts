import { GoogleGenAI } from "@google/genai";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg'
): Promise<string> => {
  
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  // It is polyfilled in vite.config.ts to include VITE_GEMINI_API_KEY if present.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;


  if (!apiKey) {
    console.error("API Key Check Failed. API_KEY is missing.");
    throw new Error("Missing API Key. Please check Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Construct a prompt that enforces the Day-to-Night conversion rules with strict structural fidelity
  const systemPrompt = `
    Role: Professional Architectural Photo Retoucher.
    Task: Retouch the provided daylight photograph to simulate a night-time landscape lighting installation.

    *** CRITICAL SECURITY PROTOCOL: ANTI-HALLUCINATION ***
    1.  **ZERO TOLERANCE FOR NEW OBJECTS**: You are strictly FORBIDDEN from adding trees, plants, bushes, walkways, or structures.
    2.  **SOURCE OF TRUTH**: The input image is the absolute truth. If a lawn is empty in the day photo, it MUST remain empty in the night photo. 
    3.  **NO GHOST TREES**: Do not generate silhouettes of trees in the background or foreground to justify a light source. If there is no tree, there is no light.
    4.  **PIXEL FIDELITY**: The geometry of the house and landscape must match the original image exactly.
    5.  **NEGATIVE CONSTRAINT ENFORCEMENT**: If the prompt says "[DO NOT ADD]" regarding Soffit Lights, the roof eaves and overhangs MUST remain dark and unlit. Do not apply downlighting unless explicitly requested.

    *** LIGHTING APPLICATION LOGIC ***
    - **Global Atmosphere**: Convert the scene to night. Darken the sky and ambient environment.
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
            imageSize: "1K", 
            aspectRatio: "1:1", 
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