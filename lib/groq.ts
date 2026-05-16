import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}
