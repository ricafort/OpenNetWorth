import { GoogleGenerativeAI } from "@google/generative-ai";

export const getGeminiModel = (modelName: string = "gemini-2.0-flash") => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
};

export const startChat = (model: any, history: any[] = []) => {
    return model.startChat({
        history: history,
        generationConfig: {
            maxOutputTokens: 1000,
        },
    });
};
