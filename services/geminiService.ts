import { GoogleGenAI } from "@google/genai";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg'
): Promise<string> => {
  
  // Initialize the client INSIDE the function to ensure fresh API key from auth flow
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct a prompt that enforces the Day-to-Night conversion rules with strict structural fidelity
  const systemPrompt = `
    Task: Transform this daylight landscape photo into a high-end photorealistic night scene.
    
    CRITICAL REALISM & FIDELITY RULES (STRICT ADHERENCE):
    1.  **NO ADDED OBJECTS (ANTI-HALLUCINATION)**: You must NOT add physical objects that are not present in the original photo.
        - **SPECIFICALLY: Do NOT add extra columns, pillars, posts, or architectural supports.**
        - **SPECIFICALLY: Do NOT add trees, bushes, or plants in open grass areas.**
        - **SPECIFICALLY: Do NOT add windows, doors, or dormers.**
    2.  **PRESERVE STRUCTURE**: The house structure, roofline, and hardscape layout must remain factual to the source.
    3.  **CAMERA FREEDOM**: You MAY slightly adjust the camera angle, zoom, or perspective to create a more dramatic composition, strictly provided that the subject matter remains truthful to the source photo (no new items added).
    4.  **LIGHTING ONLY**: Your primary tool is light. Add uplights, path lights, and moonlighting based on the user instructions. Apply these lights only to surfaces that actually exist.
    
    Styling Instructions:
    1.  **Day-to-Night Conversion**: Drastically lower the exposure to simulated night time.
    2.  **Sky Appearance**: STRICTLY choose one of two specific sky types:
        - **Deep Night**: An all-black sky with clear stars and a visible half-to-full moon.
        - **Vibrant Twilight**: A deep, dark late-twilight sky that looks almost like night, featuring rich indigo and royal purple hues with only a faint hint of deep orange on the horizon. The overall scene must still appear dark and night-like.
    3.  **Color Temperature**: STRICTLY use Warm White (3000K) for all artificial lights unless the prompt explicitly requests Holiday colors (Red/Green or Orange/Purple).
    4.  **Realism**: Ensure shadows are realistic.
    
    User Design Request: "${userInstructions}"
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