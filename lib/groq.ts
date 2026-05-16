import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export function getGroq(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  return groq;
}
