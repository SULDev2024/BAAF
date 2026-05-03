import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function getTreeAnalysis(treeData: string) {
  if (!ai) {
    return "Analysis unavailable: set VITE_GEMINI_API_KEY in .env.local.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain the following phylogenetic tree structure in simple but technical biological terms. Focus on evolutionary relationships and common ancestors: ${treeData}`,
      config: {
        systemInstruction: "You are a professional computational biologist specialized in phylogenetics.",
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analysis unavailable at this moment.";
  }
}
