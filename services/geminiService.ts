import { GoogleGenAI } from "@google/genai";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg'
): Promise<string> => {
  
  // --- THE FIX IS HERE ---
  // 1. Try to get the key from Vercel/Vite (import.meta.env.VITE_GEMINI_API_KEY)
  // 2. If that fails, try the old way (process.env.API_KEY) for backup
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key Check Failed. VITE_GEMINI_API_KEY is missing.");
    throw new Error("Missing API Key. Please check Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  // -----------------------

  // Construct a prompt that enforces the Day-to-Night conversion rules with strict structural fidelity
  const systemPrompt = `
    Role: Professional Architectural Photo Retoucher.
    Task: Retouch the provided daylight photograph to simulate a night-time landscape lighting installation.

    *** STRICT CONSTRAINT: PRESERVE ORIGINAL IMAGE CONTENT ***
    1.  **NO NEW OBJECTS**: You are FORBIDDEN from adding trees, plants, walkways, structures, furniture, or architectural details that are not present in the original input image.
    2.  **PIXEL-PERFECT GEOMETRY**: The house structure, roofline, windows, and landscape layout must remain EXACTLY as they are in the input image. Do not hallucinate new features.
    3.  **ONLY LIGHTING**: Your ONLY modification allowed is changing the exposure (day to night) and adding light sources to EXISTING objects.

    *** LIGHTING LOGIC ***
    - **Global Atmosphere**: Convert the scene to night. Darken the sky and ambient environment.
    - **Application**: Apply the requested lighting fixtures to the objects that ALREADY EXIST in the photo.
    - **Columns & Pillars**: If the user requests "Up Lights", you MUST place lights at the base of any visible architectural columns or pillars grazing upward.
    - **Conditional Execution**: 
        - If the user asks for "Tree Lights" but there are no trees in the photo -> DO NOT add lights, DO NOT add trees.
        - If the user asks for "Path Lights" but there is no path -> DO NOT add lights, DO NOT add a path.
        - If the user asks for "Gutter Lights" -> Only place them on existing gutters.

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
