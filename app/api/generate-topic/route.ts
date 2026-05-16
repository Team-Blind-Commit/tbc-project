import { NextRequest, NextResponse } from "next/server";
import { getGroq } from "@/lib/groq";
import { getOpenAI } from "@/lib/openai";

const SYSTEM_PROMPT =
  'You are a speech topic generator. Generate a short, interesting topic for a 1-minute practice speech. Return ONLY a JSON object with two fields: topic (a one-line speech title) and suggestion (2 sentences max on how to approach it). No markdown, no explanation, just the JSON.';

function parseTopicJson(raw: string): { topic: string; suggestion: string } {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
  const parsed = JSON.parse(jsonStr) as { topic?: string; suggestion?: string };

  if (!parsed.topic || typeof parsed.topic !== "string") {
    throw new Error("Invalid topic in response");
  }

  return {
    topic: parsed.topic.trim(),
    suggestion:
      typeof parsed.suggestion === "string" ? parsed.suggestion.trim() : "",
  };
}

async function generateTopic(userMessage: string): Promise<string> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0.9,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch {
    const fallback = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0.9,
    });
    return fallback.choices[0]?.message?.content ?? "";
  }
}

export async function POST(request: NextRequest) {
  try {
    let userInput: string | undefined;

    try {
      const body = (await request.json()) as { userInput?: string };
      if (body.userInput && typeof body.userInput === "string") {
        userInput = body.userInput.trim() || undefined;
      }
    } catch {
      // Empty body is fine — generate a fresh topic
    }

    const userMessage =
      userInput ??
      "Generate a random engaging speech topic";

    const raw = await generateTopic(userMessage);
    const { topic, suggestion } = parseTopicJson(raw);

    return NextResponse.json({ topic, suggestion });
  } catch (error) {
    console.error("[generate-topic] error:", error);
    return NextResponse.json(
      { error: "Failed to generate topic" },
      { status: 500 },
    );
  }
}
