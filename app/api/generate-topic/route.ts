import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api-guards";
import { getGroq } from "@/lib/groq";
import { getOpenAI } from "@/lib/openai";

const MAX_TOPIC_INPUT_LENGTH = 500;

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
    const rateLimited = enforceRateLimit(request, "generate-topic");
    if (rateLimited) return rateLimited;

    let userInput: string | undefined;
    let regenerate = false;
    let previousTopic: string | undefined;

    try {
      const body = (await request.json()) as {
        userInput?: string;
        regenerate?: boolean;
        previousTopic?: string;
      };
      if (body.regenerate === true) regenerate = true;
      if (body.previousTopic && typeof body.previousTopic === "string") {
        previousTopic = body.previousTopic.trim().slice(0, 200) || undefined;
      }
      if (body.userInput && typeof body.userInput === "string") {
        const trimmed = body.userInput.trim();
        if (trimmed.length > MAX_TOPIC_INPUT_LENGTH) {
          return NextResponse.json(
            { error: "Topic hint is too long." },
            { status: 400 },
          );
        }
        userInput = trimmed || undefined;
      }
    } catch {
      // Empty body is fine — generate a fresh topic
    }

    const userMessage = regenerate
      ? [
          "Generate a completely NEW and different engaging speech topic.",
          previousTopic
            ? `Do NOT repeat or closely paraphrase this previous topic: "${previousTopic}".`
            : "Pick something fresh — avoid generic staples like 'public speaking' or 'leadership' unless you twist them uniquely.",
          userInput
            ? `Optional theme hint from the speaker (use only as loose inspiration): ${userInput}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : (userInput ?? "Generate a random engaging speech topic");

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
