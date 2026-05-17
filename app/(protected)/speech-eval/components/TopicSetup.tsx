"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

const EXAMPLE_TOPICS = [
  "My biggest life lesson",
  "Why curiosity matters",
  "A skill everyone should learn",
] as const;

interface TopicSetupProps {
  onTopicConfirmed: (topic: string) => void;
}

export function TopicSetup({ onTopicConfirmed }: TopicSetupProps) {
  const [topic, setTopic] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [fromSurprise, setFromSurprise] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSurpriseMe() {
    setLoading(true);
    setError("");
    setSuggestion("");

    const previousTopic = fromSurprise && topic.trim() ? topic.trim() : undefined;

    try {
      const res = await fetch("/api/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: topic.trim() || undefined,
          regenerate: Boolean(previousTopic),
          previousTopic,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to generate topic");
      }

      const data = (await res.json()) as { topic: string; suggestion: string };
      setTopic(data.topic);
      setSuggestion(data.suggestion);
      setFromSurprise(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate a topic",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-teal-400/90">
          Step 1
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          What will you speak about?
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Pick a topic, then record a 45–60 second practice speech for the panel.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setFromSurprise(false);
            setError("");
          }}
          placeholder="Type your own topic or use Surprise Me..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-gray-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
        />

        <button
          type="button"
          onClick={handleSurpriseMe}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {fromSurprise ? "✨ Surprise Me Again" : "✨ Surprise Me"}
        </button>

        {suggestion ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-gray-400">
            {suggestion}
          </div>
        ) : null}

        {error ? (
          <p className="text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onTopicConfirmed(topic.trim())}
        disabled={!topic.trim()}
        className="w-full rounded-xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        I&apos;m Ready to Speak →
      </button>

      <div className="space-y-3">
        <p className="text-center text-xs uppercase tracking-wider text-gray-500">
          Or try an example
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_TOPICS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setTopic(example);
                setSuggestion("");
                setFromSurprise(false);
                setError("");
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-amber-500/40 hover:text-white"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
