import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Server-only Gemini client factory.
// Returns a generative model handle configured for gemini-2.0-flash.
// The "server-only" import above causes a build error if this file is ever
// imported into a Client Component, keeping the API key off the client.
export function getGeminiModel() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel(
    {
      model: "gemini-2.0-flash",
    },
  );
}
