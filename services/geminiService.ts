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
  
  // Initialization: The API key must be obtained exclusively from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Map sliders (0-100) to descriptive prompt instructions
  const getIntensityPrompt = (val: number) => {
    if (val < 30) return "Lighting Intensity: Low/Subtle. Soft accents.";
    if (val > 70) return "Lighting Intensity: High/Bright. Strong contrast.";
    return "Lighting Intensity: Medium/Balanced. Professional standard.";
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return "Beam Angle: Narrow Spot (15°). Tight columns.";
    if (angle <= 30) return "Beam Angle: Spot (30°). Focused.";
    if (angle >= 60) return "Beam Angle: Wide Flood (60°). Soft wash.";
    return "Beam Angle: Flood (45°). Standard spread.";
  };

  // Simplified prompt structure to avoid adversarial trigger patterns while maintaining instruction density.
  const systemPrompt = `
    You are a professional Architectural Lighting Designer.
    Task: Create a photorealistic night-time rendering of the provided house photo.

    **Visual Requirements:**
    1.  **Sky**: The night sky must feature a visible Full Moon and Stars.
    2.  **Style**: High-contrast, dramatic night lighting.
    3.  **Intensity**: ${getIntensityPrompt(lightIntensity)}
    4.  **Beam**: ${getBeamAnglePrompt(beamAngle)}

    **Structural Integrity:**
    -   Keep original house geometry and landscaping exactly as is.
    -   Do not add new trees, plants, or buildings.
    -   Background trees must remain dark silhouettes.

    **Fixture Guidelines:**
    -   **Soffit/Eave Lights**: Default to OFF. Roof overhangs should be dark unless soffit lights are requested.
    -   **Gutter Lights**: Mount on gutter lip shining UP only.
    -   **Up Lights**: Place at foundation grazing up walls/columns.

    **Specific Configuration:**
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
      const candidate = response.candidates[0];
      
      // Check for finishReason to debug safety blocks
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.warn(`Gemini generation stopped with reason: ${candidate.finishReason}`);
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

    throw new Error("No image generated. The model returned an empty response (Possible Safety Filter Trigger). Please try a different photo or simpler instructions.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};