import { GoogleGenAI } from "@google/genai";

// Helper to retrieve API Key in different environments (Vite vs Standard/Preview)
const getApiKey = (): string => {
  try {
    // @ts-ignore - Vite environment support
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
    // Standard Node/CRA/Preview environment
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const analyzeSurveillanceFrame = async (base64Image: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "DEMO MODE: Gemini API Key not found. Please connect an API key to enable AI analysis.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1], // Remove the data:image/jpeg;base64, prefix
            },
          },
          {
            text: "You are a security AI. Analyze this image from a lost/stolen device. Briefly describe the surroundings, identify any visible people (do not name them, just describe appearance), and assess if the device appears to be in a secure location or in transit. Keep it under 50 words. Urgent tone.",
          },
        ],
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error: Unable to analyze frame. Connection to AI failed.";
  }
};

export const generateSecurityReport = async (logs: string[]): Promise<string> => {
   if (!getApiKey()) {
    return "DEMO MODE: Cannot generate report without API Key.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a brief security summary based on these recent device logs: ${logs.join('; ')}. Suggest next steps.`,
    });
    return response.text || "No report generated.";
  } catch (error) {
    return "Failed to generate security report.";
  }
}