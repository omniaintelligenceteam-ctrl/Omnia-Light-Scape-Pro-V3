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
    
    *** CRITICAL ZERO-TOLERANCE RULES (STRICT ADHERENCE REQUIRED) ***
    1.  **ABSOLUTE STRUCTURAL FIDELITY**: The input image is the GROUND TRUTH. You must NOT change the physical structure of the home or yard.
    2.  **NO ADDED LANDSCAPING**: Do NOT add trees, bushes, shrubs, flowers, or plants that are not in the original photo. If there is open grass, it MUST remain open grass.
    3.  **NO ADDED ARCHITECTURE**: Do NOT add columns, pillars, posts, fences, walls, dormers, or architectural details.
    4.  **NO ADDED HARDSCAPE**: Do NOT add walkways, paths, stepping stones, or driveways.
    5.  **PERSPECTIVE LOCK**: Keep the exact camera angle, zoom, and perspective of the original image. Do not crop or rotate.
    6.  **STRICT LIGHTING ADHERENCE**: Do NOT add any lighting to the house or landscape that is not explicitly selected in the 'User Design Request'. If a lighting type is not requested, it must remain dark.
    7.  **EXISTENCE CHECK**: If the instructions ask to light an object (e.g., "light the trees" or "light the path") but that object does NOT exist in the image, IGNORE THAT INSTRUCTION. Do NOT create the object just to light it.
    
    Operational Role:
    You are a **Lighting Designer**, not a Landscape Architect. 
    - You apply light to *existing* surfaces.
    - You create shadows based on *existing* objects.
    - You illuminate what is *already there*.
    - If the user asks for tree lights and there are no trees, you do NOTHING for that specific request.
    
    Styling Instructions:
    1.  **Day-to-Night Conversion**: Drastically lower the exposure to simulate night time.
    2.  **Sky Appearance**: STRICTLY choose one of two specific sky types:
        - **Deep Night**: An all-black sky with clear stars and a visible half-to-full moon.
        - **Vibrant Twilight**: A deep, dark late-twilight sky (indigo/royal purple) with a faint hint of deep orange on the horizon.
    3.  **Color Temperature**: STRICTLY use Warm White (3000K) for all artificial lights unless the prompt explicitly requests Holiday colors.
    4.  **Realism**: Ensure light spread conforms to the physics of the fixtures (e.g., up lights wash up, path lights cast down).
    
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