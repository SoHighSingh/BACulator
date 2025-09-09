import { GoogleGenAI } from "@google/genai";

if (!process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY) {
  throw new Error("Missing NEXT_PUBLIC_GOOGLE_GENAI_API_KEY in .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY,
});

export async function parseDrinkToStandards(drinkDescription: string): Promise<number | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a BAC calculator assistant. 
      Given the drink description: "${drinkDescription}", 
      return ONLY the number of standard drinks as a decimal (no units, no text). 
      If unsure, estimate conservatively.`,
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // disable extra "thinking"
        },
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    const parsed = parseFloat(text);
    return isNaN(parsed) ? null : parsed;
  } catch (err) {
    console.error("GenAI error parsing drink:", err);
    return null;
  }
}
