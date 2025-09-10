import { GoogleGenAI } from "@google/genai";

if (!process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY) {
  throw new Error("Missing NEXT_PUBLIC_GOOGLE_GENAI_API_KEY in .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY,
});

export interface DrinkAnalysis {
  standardDrinks: number;
  drinkName: string;
  confidence: 'high' | 'medium' | 'low';
  explanation?: string;
}

export async function parseDrinkToStandards(drinkDescription: string): Promise<number | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
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

export async function analyseDrinkDetailed(drinkInput: string): Promise<DrinkAnalysis> {
  try {
    const prompt = `
You are a precise alcohol content analyzer for a BAC calculator app. Analyze the following drink input and determine the number of standard drinks.

IMPORTANT RULES:
- 1 standard drink = 10g (0.42 oz) of pure alcohol
- Common standards: 12oz beer (5% ABV) = 1 standard, 5oz wine (12% ABV) = 1 standard, 1.5oz spirits (40% ABV) = 1 standard
- If volume/ABV not specified, use typical values for the drink type
- Be conservative with estimates - round down when uncertain
- If the input is unclear or not alcohol, return your best estimation or 0 if non-alcoholic

Drink input: "${drinkInput}"

Respond ONLY with valid JSON in this exact format:
{
  "standardDrinks": number,
  "drinkName": "normalized drink name",
  "confidence": "high|medium|low",
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    });

    const responseText = response.text?.trim() ?? "";
    
    // Clean up response to extract JSON
    const jsonMatch = /\{[\s\S]*\}/.exec(responseText);
    if (!jsonMatch) {
      // No JSON found, fall back to simple parsing
      const fallbackStandards = await parseDrinkToStandards(drinkInput);
      return {
        standardDrinks: fallbackStandards ?? 0,
        drinkName: drinkInput,
        confidence: 'low' as const,
      };
    }

    let analysis: DrinkAnalysis;
    try {
      analysis = JSON.parse(jsonMatch[0]) as DrinkAnalysis;
    } catch {
      // JSON parsing failed, fall back to simple parsing
      const fallbackStandards = await parseDrinkToStandards(drinkInput);
      return {
        standardDrinks: fallbackStandards ?? 0,
        drinkName: drinkInput,
        confidence: 'low' as const,
      };
    }
    
    // Validate response
    if (typeof analysis.standardDrinks !== 'number' || 
        analysis.standardDrinks < 0 || 
        analysis.standardDrinks > 20) {
      throw new Error("Invalid standard drinks value");
    }

    return {
      standardDrinks: Math.round(analysis.standardDrinks * 10) / 10,
      drinkName: analysis.drinkName ?? drinkInput,
      confidence: analysis.confidence ?? 'medium',
    };

  } catch (error) {
    console.error("Error analyzing drink:", error);
    
    // Fallback to existing simple function
    const fallbackStandards = await parseDrinkToStandards(drinkInput);
    
    return {
      standardDrinks: fallbackStandards ?? 0,
      drinkName: drinkInput,
      confidence: 'low' as const,
    };
  }
}

export async function validateDrinkInput(input: string): Promise<boolean> {
  if (!input || input.trim().length < 2) return false;
  
  try {
    const result = await analyseDrinkDetailed(input);
    return result.standardDrinks > 0;
  } catch {
    return false;
  }
}
