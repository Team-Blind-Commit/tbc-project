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
type ConversationMessageRole = "user" | "agent";

interface ConversationMessage {
  role: ConversationMessageRole;
  text: string;
  timestamp: number;
}

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

function normalizeConversationMessage(message: unknown): ConversationMessage | null {
  if (typeof message === "string") {
    const text = message.trim();
    if (!text) return null;
    return { role: "agent", text, timestamp: Date.now() };
  }

  if (!message || typeof message !== "object") {
    return null;
  }

  const payload = message as Record<string, unknown>;
  const source = typeof payload.source === "string" ? payload.source.toLowerCase() : "";
  const role: ConversationMessageRole =
    source.includes("user") || source.includes("human") ? "user" : "agent";

  const textCandidates = [
    payload.message,
    payload.text,
    payload.transcript,
    payload.content,
  ];
  const text = textCandidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  if (!text) {
    return null;
  }

  return { role, text: text.trim(), timestamp: Date.now() };
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
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const transcriptRef = useRef<string[]>([]);
  const startedAtRef = useRef<number>(0);
  const phaseRef = useRef<SessionPhase>("idle");
  const pendingConnectRef = useRef<PendingConnect | null>(null);
  const negotiationRetriesRef = useRef(0);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const conversation = useConversation({
    onConnect: () => {
      negotiationRetriesRef.current = 0;
      pendingConnectRef.current = null;
      sessionStartedRef.current = true;
      setConnectHint(null);
      phaseRef.current = "active";
      setPhase("active");
      setError(null);
    },
    onDisconnect: () => {
      sessionStartedRef.current = false;
      setPhase((current) => {
        if (current === "active") {
          phaseRef.current = "idle";
          return "idle";
        }
        return current;
      });
    },
    onMessage: (message) => {
      const normalized = normalizeConversationMessage(message);
      if (normalized) {
        setMessages((current) => [...current, normalized]);
        transcriptRef.current.push(`[${normalized.role}] ${normalized.text}`);
        return;
      }

      const rawMessage: unknown = message;
      const fallback = (
        typeof rawMessage === "string"
          ? rawMessage
          : JSON.stringify(rawMessage ?? "")
      ).trim();
      if (fallback) {
        transcriptRef.current.push(fallback);
      }
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
        if (sessionStartedRef.current) {
          try {
            conversation.endSession();
          } catch (err) {
            console.warn("[voice-coach] endSession skipped:", err);
          } finally {
            sessionStartedRef.current = false;
          }
        }
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

  const safeEndConversation = useCallback(() => {
    if (!sessionStartedRef.current) return;
    try {
      conversation.endSession();
    } catch (err) {
      console.warn("[voice-coach] endSession skipped:", err);
    } finally {
      sessionStartedRef.current = false;
    }
  }, [conversation]);

  const getConversationId = useCallback((): string | undefined => {
    if (!sessionStartedRef.current) return undefined;
    try {
      return conversation.getId() || undefined;
    } catch (err) {
      console.warn("[voice-coach] getId skipped:", err);
      return undefined;
    }
  }, [conversation]);

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
    sessionStartedRef.current = false;
    phaseRef.current = "loading";
    setPhase("loading");
    setTask(null);
    setSummary(null);
    setMessages([]);
    setShowMessages(false);
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
      sessionStartedRef.current = false;
      safeEndConversation();
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
  }, [conversation, mode, safeEndConversation]);

  const endSession = useCallback(async () => {
    const userName = getStoredUserName();
    if (!userName) return;

    if (phaseRef.current !== "active" && !sessionStartedRef.current) {
      console.warn("[voice-coach] endSession called with no active conversation");
      return;
    }

    pendingConnectRef.current = null;
    negotiationRetriesRef.current = 0;
    setConnectHint(null);
    setPhase("ending");
    const conversationId = getConversationId();
    if (!conversationId) {
      console.warn("[voice-coach] endSession skipped: missing conversation id");
      safeEndConversation();
      setError("No active conversation found. Start a new session and try again.");
      phaseRef.current = "idle";
      setPhase("idle");
      return;
    }

    safeEndConversation();

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
          conversation_id: conversationId,
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
  }, [getConversationId, mode, safeEndConversation]);

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
            setShowMessages(false);
          }}
          onViewMessages={() => setShowMessages(true)}
          canViewMessages={messages.length > 0}
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
        <button
          type="button"
          onClick={() => setShowMessages(true)}
          disabled={messages.length === 0 || phase === "loading"}
          className="rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          View Messages {messages.length > 0 ? `(${messages.length})` : ""}
        </button>
      </div>

      {showMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold text-white">Conversation</h3>
              <button
                type="button"
                onClick={() => setShowMessages(false)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <p className="text-sm text-[#9ca3af]">No messages yet.</p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className="rounded-lg border border-white/10 bg-[#0b0b0d] px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-[#8b5cf6]">
                      {message.role}
                    </p>
                    <p className="mt-1 text-sm text-white">{message.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionActions({
  onPracticeAgain,
  onViewMessages,
  canViewMessages,
}: {
  onPracticeAgain: () => void;
  onViewMessages: () => void;
  canViewMessages: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onPracticeAgain}
        className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7c3aed]"
      >
        Practice again
      </button>
      <button
        type="button"
        onClick={onViewMessages}
        disabled={!canViewMessages}
        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
      >
        View Messages
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
