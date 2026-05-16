"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import Link from "next/link";
import { Mic, MicOff, Square } from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-response";
import {
  formatVoiceCoachConnectionError,
  isNegotiationTimeout,
} from "@/lib/voice-coach-connection-errors";
import {
  getStoredUserName,
  setStoredUserName,
  voiceCoachHeaders,
} from "@/lib/voice-coach-client";
import type { VoiceCoachMode } from "@/lib/voice-coach-modes";

type SessionPhase = "idle" | "loading" | "active" | "ending" | "done";
type AuthMode = "signed" | "public";

interface PendingConnect {
  authMode: AuthMode;
  signedUrl?: string;
  agentId?: string;
  sessionOptions: {
    dynamicVariables: { mode: VoiceCoachMode; memory: string };
  };
}

interface VoiceCoachSessionProps {
  mode: VoiceCoachMode;
}

function HomeworkCard({ task, mode }: { task: string; mode: VoiceCoachMode }) {
  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
        Your homework before next {mode} session
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#f5f5f5]">{task}</p>
      <p className="mt-3 text-xs text-[#9ca3af]">
        Saved to your dashboard. Your coach will ask how it went next time.
      </p>
    </div>
  );
}

export function VoiceCoachSession({ mode }: VoiceCoachSessionProps) {
  return (
    <ConversationProvider>
      <VoiceCoachSessionInner mode={mode} />
    </ConversationProvider>
  );
}

function VoiceCoachSessionInner({ mode }: VoiceCoachSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectHint, setConnectHint] = useState<string | null>(null);
  const [task, setTask] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const transcriptRef = useRef<string[]>([]);
  const startedAtRef = useRef<number>(0);
  const phaseRef = useRef<SessionPhase>("idle");
  const pendingConnectRef = useRef<PendingConnect | null>(null);
  const negotiationRetriesRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const conversation = useConversation({
    onConnect: () => {
      negotiationRetriesRef.current = 0;
      pendingConnectRef.current = null;
      setConnectHint(null);
      phaseRef.current = "active";
      setPhase("active");
      setError(null);
    },
    onDisconnect: () => {
      setPhase((current) => {
        if (current === "active") {
          phaseRef.current = "idle";
          return "idle";
        }
        return current;
      });
    },
    onMessage: (message) => {
      const text =
        typeof message === "string" ? message : JSON.stringify(message);
      transcriptRef.current.push(text);
    },
    onError: (message, context) => {
      console.error("[voice-coach] conversation error:", message, context);

      if (
        phaseRef.current === "loading" &&
        isNegotiationTimeout(message, context) &&
        negotiationRetriesRef.current < 1 &&
        pendingConnectRef.current
      ) {
        negotiationRetriesRef.current += 1;
        setNotice("Connection timed out — retrying once…");
        conversation.endSession();
        const pending = pendingConnectRef.current;

        window.setTimeout(() => {
          if (phaseRef.current !== "loading" || !pendingConnectRef.current) {
            return;
          }

          if (pending.authMode === "signed" && pending.signedUrl) {
            void conversation.startSession({
              signedUrl: pending.signedUrl,
              ...pending.sessionOptions,
            });
          } else if (pending.authMode === "public" && pending.agentId) {
            void conversation.startSession({
              agentId: pending.agentId,
              ...pending.sessionOptions,
            });
          }
        }, 1500);
        return;
      }

      pendingConnectRef.current = null;
      negotiationRetriesRef.current = 0;
      setConnectHint(null);
      setError(formatVoiceCoachConnectionError(message, context));
      phaseRef.current = "idle";
      setPhase("idle");
    },
  });

  const startSession = useCallback(async () => {
    let userName = getStoredUserName();
    if (!userName) {
      userName = "Guest";
      setStoredUserName(userName);
    }

    setError(null);
    setNotice(null);
    setConnectHint(null);
    negotiationRetriesRef.current = 0;
    pendingConnectRef.current = null;
    phaseRef.current = "loading";
    setPhase("loading");
    setTask(null);
    setSummary(null);
    transcriptRef.current = [];

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch(
        `/api/voice-coach/signed-url?mode=${encodeURIComponent(mode)}`,
        { headers: voiceCoachHeaders() },
      );

      const data = await parseApiJson<{
        error?: string;
        authMode?: AuthMode;
        signedUrl?: string;
        agentId?: string;
        memory?: string;
        warning?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start session");
      }

      if (!data.memory) {
        throw new Error("Invalid session response from server");
      }

      if (data.warning) {
        console.warn("[voice-coach]", data.warning);
        setNotice(data.warning);
      }

      if (data.authMode === "public") {
        setConnectHint(
          "Connecting via public agent — ensure your ElevenLabs agent is Public under Security.",
        );
      } else if (data.authMode === "signed") {
        setConnectHint("Connecting securely…");
      }

      startedAtRef.current = Date.now();

      const sessionOptions = {
        dynamicVariables: {
          mode,
          memory: data.memory,
        },
      };

      let pending: PendingConnect | null = null;
      if (data.authMode === "signed" && data.signedUrl) {
        pending = {
          authMode: "signed",
          signedUrl: data.signedUrl,
          sessionOptions,
        };
      } else if (data.authMode === "public" && data.agentId) {
        pending = {
          authMode: "public",
          agentId: data.agentId,
          sessionOptions,
        };
      } else {
        throw new Error(
          data.warning ??
            "Could not start voice session. Fix ELEVENLABS_API_KEY or set agent to Public in ElevenLabs.",
        );
      }

      pendingConnectRef.current = pending;
      if (pending.authMode === "signed" && pending.signedUrl) {
        await conversation.startSession({
          signedUrl: pending.signedUrl,
          ...pending.sessionOptions,
        });
      } else if (pending.authMode === "public" && pending.agentId) {
        await conversation.startSession({
          agentId: pending.agentId,
          ...pending.sessionOptions,
        });
      }
    } catch (err) {
      console.error("[voice-coach] start failed:", err);
      pendingConnectRef.current = null;
      setConnectHint(null);
      setError(
        formatVoiceCoachConnectionError(
          err instanceof Error ? err.message : "Could not start voice session",
          err,
        ),
      );
      phaseRef.current = "idle";
      setPhase("idle");
    }
  }, [conversation, mode]);

  const endSession = useCallback(async () => {
    const userName = getStoredUserName();
    if (!userName) return;

    pendingConnectRef.current = null;
    negotiationRetriesRef.current = 0;
    setConnectHint(null);
    setPhase("ending");
    conversation.endSession();

    const durationSeconds = Math.round(
      (Date.now() - startedAtRef.current) / 1000,
    );
    const transcript =
      transcriptRef.current.join("\n") ||
      `Voice coaching session in ${mode} mode. Duration: ${durationSeconds}s.`;

    try {
      const res = await fetch("/api/voice-coach/end-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...voiceCoachHeaders(),
        },
        body: JSON.stringify({
          mode,
          user_name: userName,
          transcript,
          duration_seconds: durationSeconds,
          conversation_id: conversation.getId() || undefined,
        }),
      });

      const data = await parseApiJson<{
        error?: string;
        task?: string;
        summary?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save session");
      }

      setTask(data.task ?? null);
      setSummary(data.summary ?? null);
      setPhase("done");
    } catch (err) {
      console.error("[voice-coach] end session failed:", err);
      setError(
        formatVoiceCoachConnectionError(
          err instanceof Error ? err.message : "Could not save your session",
          err,
        ),
      );
      phaseRef.current = "idle";
      setPhase("idle");
    }
  }, [conversation, mode]);

  if (phase === "done") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-8">
        <h2 className="text-2xl font-bold text-white">Session complete</h2>
        {summary && <p className="mt-2 text-sm text-[#9ca3af]">{summary}</p>}
        {task && <HomeworkCard task={task} mode={mode} />}
        <SessionActions
          onPracticeAgain={() => {
            phaseRef.current = "idle";
            setPhase("idle");
            setTask(null);
            setSummary(null);
          }}
        />
      </div>
    );
  }

  const isActive = phase === "active" || phase === "ending";
  const isLoading = phase === "loading" || phase === "ending";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-8">
      <p className="text-sm font-medium text-[#8b5cf6]">{mode} mode</p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        {isActive
          ? "Live coaching session"
          : isLoading
            ? "Connecting…"
            : "Ready to practice"}
      </h2>
      <p className="mt-2 text-sm text-[#9ca3af]">
        {isActive
          ? conversation.isSpeaking
            ? "Coach is speaking…"
            : "Listening — respond naturally."
          : isLoading
            ? connectHint ??
              "Establishing voice connection — this can take up to 15 seconds."
            : "Your coach remembers your progress and will adapt to this mode."}
      </p>

      {notice && !error && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full border transition-all duration-300 ${
            isActive
              ? conversation.isSpeaking
                ? "border-[#8b5cf6] bg-[#8b5cf6]/20 shadow-[0_0_40px_rgba(139,92,246,0.35)]"
                : "border-teal-500/50 bg-teal-500/10 shadow-[0_0_30px_rgba(20,184,166,0.2)]"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          {isActive ? (
            <Mic className="h-10 w-10 text-[#8b5cf6]" />
          ) : (
            <MicOff className="h-10 w-10 text-[#6b7280]" />
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[#6b7280]">
        Status: {conversation.status}
        {isActive
          ? ` · ${conversation.isSpeaking ? "speaking" : "listening"}`
          : ""}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!isActive ? (
          <button
            type="button"
            onClick={startSession}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed] disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            {isLoading ? "Connecting…" : "Start Practicing Free"}
          </button>
        ) : (
          <button
            type="button"
            onClick={endSession}
            disabled={phase === "ending"}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Square className="h-4 w-4" />
            {phase === "ending" ? "Saving session…" : "End session"}
          </button>
        )}
      </div>
    </div>
  );
}

function SessionActions({ onPracticeAgain }: { onPracticeAgain: () => void }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onPracticeAgain}
        className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7c3aed]"
      >
        Practice again
      </button>
      <Link
        href="/dashboard"
        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
      >
        View dashboard
      </Link>
    </div>
  );
}
