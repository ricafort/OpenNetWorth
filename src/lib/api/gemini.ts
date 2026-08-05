import { GoogleGenerativeAI } from "@google/generative-ai";

// Why: gemini-2.0-flash was deprecated by Google in mid-2025.
// gemini-2.5-flash is the current recommended replacement — same speed tier, better quality.
export const getGeminiModel = (modelName: string = "gemini-2.5-flash") => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
};


/**
 * Wraps Gemini API calls with exponential backoff retry logic.
 * Default: 3 retries, starting at 1000ms delay.
 */
export async function generateContentWithRetry(
    model: any,
    prompt: string,
    retries = 3,
    delay = 1000
): Promise<any> {
    try {
        return await model.generateContent(prompt);
    } catch (error: any) {
        if (retries > 0 && (error.status === 429 || error.message?.includes('429'))) {
            console.warn(`Gemini Rate Limit (429). Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateContentWithRetry(model, prompt, retries - 1, delay * 2);
        }
        throw error;
    }
}

export const startChat = (model: any, history: any[] = []) => {
    return model.startChat({
        history: history,
        generationConfig: {
            maxOutputTokens: 1000,
        },
    });
};
