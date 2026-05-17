"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Mic, Users } from "lucide-react";
import {
  averageEvaluatorScoreThisWeek,
  combineDashboardHistory,
  hasLocalOnlyItems,
  mapSpeechEvalCloudToDashboard,
  mapSpeechEvalSession,
  mergeVoiceCoachHistory,
  sessionsThisWeekCount,
  type DashboardHistoryFeature,
  type DashboardHistoryItem,
  type VoiceCoachCloudHistoryItem,
} from "@/lib/dashboard-history";
import {
  getLocalSessions,
  type HistorySession,
} from "@/lib/speech-eval-history";
import {
  readVoiceCoachLocalHistory,
  resolveVoiceCoachUserId,
} from "@/lib/voice-coach-local-history";
import { resolveVoiceCoachHistoryModeTheme } from "@/lib/voice-coach-mode-theme";

type FilterKey = "all" | DashboardHistoryFeature;

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

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function excerpt(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function featureLabel(feature: DashboardHistoryFeature): string {
  return feature === "speech_eval" ? "Speech Evaluator" : "Voice Coach";
}

function mergeSpeechEvalForDashboard(
  local: HistorySession[],
  cloudRows: Record<string, unknown>[],
): DashboardHistoryItem[] {
  const cloudItems = cloudRows.map(mapSpeechEvalCloudToDashboard);
  const cloudIds = new Set(cloudItems.map((item) => item.id));
  const localOnly = local
    .filter((session) => !cloudIds.has(session.id))
    .map(mapSpeechEvalSession);
  return [...cloudItems, ...localOnly].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function HistorySessionCard({ item }: { item: DashboardHistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const modeTheme =
    item.feature === "voice_coach" && item.mode
      ? resolveVoiceCoachHistoryModeTheme(item.mode)
      : null;

  const preview =
    item.feature === "speech_eval"
      ? excerpt(item.evaluatorFeedback ?? item.transcript ?? "")
      : excerpt(item.summary ?? item.transcript ?? "");

  const scoreLabel =
    item.evaluatorScore !== null && item.evaluatorScore !== undefined
      ? `${item.evaluatorScore}/10`
      : null;

  return (
    <article className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  item.feature === "speech_eval"
                    ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                    : "border-[#8b5cf6]/30 bg-[#8b5cf6]/10 text-[#c4b5fd]"
                }`}
              >
                {item.feature === "speech_eval" ? (
                  <Users className="h-3 w-3" />
                ) : (
                  <Mic className="h-3 w-3" />
                )}
                {featureLabel(item.feature)}
              </span>
              {item.mode && modeTheme ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${modeTheme.border} ${modeTheme.modeLabel}`}
                >
                  {item.mode}
                </span>
              ) : null}
              {item.source === "local" ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#9ca3af]">
                  This device
                </span>
              ) : null}
              {scoreLabel ? (
                <span className="text-sm font-semibold text-emerald-400">
                  {scoreLabel}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 font-semibold text-white">{item.title}</h3>
            <p className="mt-1 text-xs text-[#9ca3af]">
              {formatDate(item.createdAt)}
              {item.durationSeconds > 0
                ? ` · ${formatDuration(item.durationSeconds)}`
                : ""}
            </p>
            {preview ? (
              <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
                {preview}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
          >
            View details
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {expanded ? (
          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
            {item.feature === "speech_eval" ? (
              <>
                {item.transcript ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#9ca3af]">
                      Transcript
                    </p>
                    <p className="mt-2 max-h-40 overflow-y-auto font-mono text-sm leading-relaxed text-[#d4d4d8]">
                      {item.transcript}
                    </p>
                  </div>
                ) : null}
                {item.counterFeedback ? (
                  <div>
                    <p className="text-xs font-medium text-amber-400">
                      Rex — Counter
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                      {item.counterFeedback}
                    </p>
                  </div>
                ) : null}
                {item.grammarianFeedback ? (
                  <div>
                    <p className="text-xs font-medium text-amber-400">
                      Clara — Grammarian
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                      {item.grammarianFeedback}
                    </p>
                  </div>
                ) : null}
                {item.evaluatorFeedback ? (
                  <div>
                    <p className="text-xs font-medium text-amber-400">
                      Marcus — Evaluator
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                      {item.evaluatorFeedback}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {item.summary ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#9ca3af]">
                      Summary
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#d4d4d8]">
                      {item.summary}
                    </p>
                  </div>
                ) : null}
                {item.task ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#9ca3af]">
                      Homework
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-amber-200/90">
                      {item.task}
                    </p>
                  </div>
                ) : null}
                {item.strengths ? (
                  <div>
                    <p className="text-xs font-medium text-emerald-400">
                      Strengths
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                      {item.strengths}
                    </p>
                  </div>
                ) : null}
                {item.weaknesses ? (
                  <div>
                    <p className="text-xs font-medium text-rose-400">
                      Areas to improve
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                      {item.weaknesses}
                    </p>
                  </div>
                ) : null}
                {item.messages && item.messages.length > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#9ca3af]">
                      Conversation
                    </p>
                    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                      {item.messages.map((msg, index) => (
                        <li
                          key={`${msg.timestamp}-${index}`}
                          className={`rounded-lg px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-white/[0.06] text-white"
                              : "bg-[#8b5cf6]/10 text-[#e9d5ff]"
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider text-[#9ca3af]">
                            {msg.role === "user" ? "You" : "Coach"}
                          </span>
                          <p className="mt-0.5 leading-relaxed">{msg.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : item.transcript ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#9ca3af]">
                      Transcript
                    </p>
                    <p className="mt-2 max-h-40 overflow-y-auto font-mono text-sm leading-relaxed text-[#d4d4d8]">
                      {item.transcript}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function DashboardHistoryPage() {
  const [items, setItems] = useState<DashboardHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setWarning(null);

      const localSpeech = getLocalSessions();
      let cloudSpeechRows: Record<string, unknown>[] = [];
      let speechWarning: string | null = null;

      try {
        const res = await fetch("/api/speech-eval/history");
        if (res.ok) {
          const payload = (await res.json()) as {
            sessions?: Record<string, unknown>[];
          };
          cloudSpeechRows = payload.sessions ?? [];
        }
      } catch (err) {
        console.warn("[dashboard-history] speech-eval fetch failed:", err);
        speechWarning = "Speech Evaluator history could not be loaded from the cloud.";
      }

      const speechEvalItems = mergeSpeechEvalForDashboard(
        localSpeech,
        cloudSpeechRows,
      );

      let voiceCoachItems: DashboardHistoryItem[] = [];
      try {
        const userId = await resolveVoiceCoachUserId();
        const localVoice = readVoiceCoachLocalHistory(userId);

        const vcRes = await fetch("/api/voice-coach/history");
        if (vcRes.ok) {
          const vcPayload = (await vcRes.json()) as {
            items?: VoiceCoachCloudHistoryItem[];
            warning?: string;
          };
          const cloudVoice = vcPayload.items ?? [];
          if (vcPayload.warning) {
            speechWarning = speechWarning
              ? `${speechWarning} ${vcPayload.warning}`
              : vcPayload.warning;
          }
          voiceCoachItems = mergeVoiceCoachHistory(localVoice, cloudVoice);
        } else {
          voiceCoachItems = mergeVoiceCoachHistory(localVoice, []);
        }
      } catch (err) {
        console.warn("[dashboard-history] voice-coach load failed:", err);
        speechWarning = speechWarning
          ? speechWarning
          : "Voice Coach history could not be loaded.";
      }

      setItems(combineDashboardHistory(speechEvalItems, voiceCoachItems));
      setWarning(speechWarning);
      setLoading(false);
    }

    void load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.feature === filter);
  }, [items, filter]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      avgThisWeek: averageEvaluatorScoreThisWeek(
        items.filter((i) => i.feature === "speech_eval"),
      ),
      thisWeek: sessionsThisWeekCount(filtered),
    }),
    [filtered, items],
  );

  const showLocalBanner = hasLocalOnlyItems(items);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "speech_eval", label: "Speech Evaluator" },
    { key: "voice_coach", label: "Voice Coach" },
  ];

  return (
    <div className="space-y-8">
      {warning ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-[#9ca3af]">
          {warning}
        </p>
      ) : null}

      {showLocalBanner ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-[#9ca3af]">
          Some sessions are stored only on this device. New sessions save to your
          account when practice completes successfully.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === key
                ? "bg-white/[0.1] text-white"
                : "bg-white/[0.04] text-[#9ca3af] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-[#9ca3af]">Loading your sessions…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.total}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[#9ca3af]">
                {filter === "all" ? "Total sessions" : "Filtered sessions"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {stats.avgThisWeek}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[#9ca3af]">
                Avg panel score this week
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.thisWeek}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[#9ca3af]">
                Sessions this week
              </p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-12 text-center">
              <p className="text-lg text-[#d4d4d8]">No sessions yet</p>
              <p className="mt-2 text-sm text-[#9ca3af]">
                Start practicing with Voice Coach or Speech Evaluator — your
                history will appear here.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/voice-coach"
                  className="inline-block rounded-xl bg-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed]"
                >
                  Voice Coach
                </Link>
                <Link
                  href="/speech-eval"
                  className="inline-block rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
                >
                  Speech Evaluator
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((item) => (
                <HistorySessionCard key={`${item.feature}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
