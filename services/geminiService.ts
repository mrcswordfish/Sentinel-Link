import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client
// We assume process.env.API_KEY is available as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeSurveillanceFrame = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) {
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
   if (!process.env.API_KEY) {
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
