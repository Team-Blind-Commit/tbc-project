"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { FILLER_WORDS } from "@/lib/speech-eval";
import {
  getLocalSessions,
  mergeSessions,
  type HistorySession,
} from "@/lib/speech-eval-history";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function excerpt(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function extractScore(feedback: string): number | null {
  const match = feedback.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (!match) return null;
  const score = Math.round(Number.parseFloat(match[1]));
  return score >= 0 && score <= 10 ? score : null;
}

function countFillerInText(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const counts: Record<string, number> = {};

  const sorted = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
  let remaining = lower;

  for (const filler of sorted) {
    const pattern = new RegExp(
      `\\b${filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi",
    );
    const matches = remaining.match(pattern);
    if (matches?.length) {
      counts[filler] = matches.length;
      remaining = remaining.replace(pattern, " ");
    }
  }

  return counts;
}

function mostCommonFiller(sessions: HistorySession[]): string {
  const totals: Record<string, number> = {};

  for (const session of sessions) {
    const fromTranscript = countFillerInText(session.transcript);
    const fromCounter = countFillerInText(session.counter_feedback);
    const merged = { ...fromTranscript };

    for (const [word, count] of Object.entries(fromCounter)) {
      merged[word] = (merged[word] ?? 0) + count;
    }

    for (const [word, count] of Object.entries(merged)) {
      totals[word] = (totals[word] ?? 0) + count;
    }
  }

  let best = "—";
  let bestCount = 0;

  for (const [word, count] of Object.entries(totals)) {
    if (count > bestCount) {
      best = word;
      bestCount = count;
    }
  }

  return bestCount > 0 ? `"${best}" (${bestCount})` : "—";
}

function averageScoreThisWeek(sessions: HistorySession[]): string {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const recent = sessions.filter(
    (s) => new Date(s.created_at) >= weekAgo,
  );

  if (recent.length === 0) return "—";

  const scores = recent
    .map((s) => extractScore(s.evaluator_feedback))
    .filter((s): s is number => s !== null);

  if (scores.length === 0) return "—";

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return `${avg.toFixed(1)} / 10`;
}

function SessionCard({ session }: { session: HistorySession }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-white/10 bg-[#1a1a24] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{session.topic}</h3>
            {session.source === "local" ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">
                This device
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {formatDate(session.created_at)}
            {session.duration_seconds > 0
              ? ` · ${Math.floor(session.duration_seconds / 60)}:${(session.duration_seconds % 60).toString().padStart(2, "0")}`
              : ""}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            {excerpt(session.evaluator_feedback)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
        >
          View Details
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Transcript
            </p>
            <p className="mt-2 max-h-40 overflow-y-auto font-mono text-sm leading-relaxed text-gray-400">
              {session.transcript}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-amber-400">Rex — Counter</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-300">
              {session.counter_feedback}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-amber-400">
              Clara — Grammarian
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-300">
              {session.grammarian_feedback}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-amber-400">
              Marcus — Evaluator
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-300">
              {session.evaluator_feedback}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function SpeechEvalHistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCloudSessions, setHasCloudSessions] = useState(false);

  useEffect(() => {
    async function load() {
      const local = getLocalSessions();

      try {
        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();

        if (user) {
          const { data, error } = await supabaseBrowser
            .from("speech_sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (!error && data?.length) {
            const cloud: HistorySession[] = data.map((row) => ({
              id: row.id as string,
              topic: row.topic as string,
              duration_seconds: (row.duration_seconds as number) ?? 0,
              transcript: row.transcript as string,
              counter_feedback: row.counter_feedback as string,
              grammarian_feedback: row.grammarian_feedback as string,
              evaluator_feedback: row.evaluator_feedback as string,
              created_at: row.created_at as string,
              source: "cloud" as const,
            }));
            setHasCloudSessions(true);
            setSessions(mergeSessions(local, cloud));
            setLoading(false);
            return;
          }
        }
      } catch {
        // Local-only fallback
      }

      setSessions(local);
      setLoading(false);
    }

    load();
  }, []);

  const stats = useMemo(
    () => ({
      total: sessions.length,
      avgThisWeek: averageScoreThisWeek(sessions),
      topFiller: mostCommonFiller(sessions),
    }),
    [sessions],
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-[family-name:var(--font-geist-sans)] text-white">
      <header className="border-b border-white/10 px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Session History</h1>
          <nav className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-amber-400"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href="/speech-eval"
              className="transition-colors hover:text-amber-400"
            >
              Speech Evaluator
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-400">History</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        {loading ? (
          <p className="text-center text-gray-400">Loading your sessions…</p>
        ) : (
          <>
            {!hasCloudSessions && sessions.length > 0 ? (
              <p className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-sm text-gray-400">
                Sessions are saved on this browser. Complete a speech and they
                will appear here.
              </p>
            ) : null}

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#1a1a24] px-5 py-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{stats.total}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
                  Total sessions
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1a1a24] px-5 py-4 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {stats.avgThisWeek}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
                  Avg score this week
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1a1a24] px-5 py-4 text-center">
                <p className="text-lg font-bold text-amber-400">
                  {stats.topFiller}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
                  Most common filler
                </p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
                <p className="text-lg text-gray-300">No sessions yet</p>
                <p className="mt-2 text-sm text-gray-500">
                  Record a speech and your feedback will show up here
                  automatically.
                </p>
                <Link
                  href="/speech-eval"
                  className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
                >
                  Start a speech
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}