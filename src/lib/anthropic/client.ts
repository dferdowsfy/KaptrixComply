import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export { genAI };

export const MODELS = {
  PRE_ANALYSIS: "gemini-3.1-flash-lite-preview",
  SYNTHESIS: "gemini-3.1-flash-lite-preview",
  RED_FLAG_DETECTION: "gemini-3.1-flash-lite-preview",
} as const;
