import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel(
    {
      model: "gemini-2.5-flash",
    },
  );
}
