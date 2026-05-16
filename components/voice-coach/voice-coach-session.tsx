"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import Link from "next/link";
import {
  MessageSquareText,
  Mic,
  Sparkles,
  Square,
  UserRound,
} from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-response";
import {
  formatVoiceCoachConnectionError,
  isNegotiationTimeout,
} from "@/lib/voice-coach-connection-errors";
import {
  getOrCreateStoredUserName,
  getStoredUserName,
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

interface VoiceCoachHistoryItem {
  id: string;
  title: string;
  mode: string;
  summary: string | null;
  task: string | null;
  transcript: string;
  createdAt: string | null;
  durationSeconds: number | null;
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

function getErrorContextText(context: unknown): string {
  if (context instanceof Error) return `${context.name} ${context.message}`;
  if (typeof context === "string") return context;
  try {
    return JSON.stringify(context ?? "");
  } catch {
    return String(context ?? "");
  }
}

const RETRY_CLOSE_DELAY_MS = 400;

type ConversationHandle = ReturnType<typeof useConversation>;

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isSdkConnected(conv: ConversationHandle | null | undefined): boolean {
  return conv?.status === "connected";
}

function isWebSocketClosedError(message: string, context?: unknown): boolean {
  const combined = `${message} ${getErrorContextText(context)}`.toLowerCase();
  return (
    combined.includes("closing or closed") ||
    combined.includes("websocket is already") ||
    combined.includes("closed before session start") ||
    combined.includes("already in closing")
  );
}

function isRetryableStartupFailure(message: string, context?: unknown): boolean {
  const combined = `${message} ${getErrorContextText(context)}`.toLowerCase();
  return (
    isNegotiationTimeout(message, context) ||
    combined.includes("v1 rtc path not found") ||
    combined.includes("/rtc/v1/validate") ||
    combined.includes("unknown datachannel error") ||
    combined.includes("websocket") ||
    combined.includes("closed before session start") ||
    combined.includes("did not complete")
  );
}

const MODE_SURFACE_STYLES: Record<
  VoiceCoachMode,
  {
    modeLabel: string;
    glassBase: string;
    radialTint: string;
    borderBase: string;
    borderBeam: string;
    cornerGlow: string;
  }
> = {
  Interview: {
    modeLabel: "text-blue-300",
    glassBase:
      "bg-[linear-gradient(135deg,rgba(9,10,14,0.62),rgba(12,14,20,0.5))]",
    radialTint:
      "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_52%)]",
    borderBase: "bg-blue-500/12",
    borderBeam:
      "bg-[conic-gradient(from_0deg,transparent_0deg,transparent_306deg,rgba(59,130,246,0.75)_336deg,transparent_360deg)]",
    cornerGlow: "bg-blue-300/40",
  },
  Debate: {
    modeLabel: "text-rose-300",
    glassBase:
      "bg-[linear-gradient(135deg,rgba(10,9,12,0.62),rgba(16,12,16,0.5))]",
    radialTint:
      "bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.12),transparent_52%)]",
    borderBase: "bg-rose-500/12",
    borderBeam:
      "bg-[conic-gradient(from_0deg,transparent_0deg,transparent_306deg,rgba(244,63,94,0.75)_336deg,transparent_360deg)]",
    cornerGlow: "bg-rose-300/40",
  },
  Presentation: {
    modeLabel: "text-emerald-300",
    glassBase:
      "bg-[linear-gradient(135deg,rgba(8,11,10,0.62),rgba(10,16,14,0.5))]",
    radialTint:
      "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_52%)]",
    borderBase: "bg-emerald-500/12",
    borderBeam:
      "bg-[conic-gradient(from_0deg,transparent_0deg,transparent_306deg,rgba(16,185,129,0.75)_336deg,transparent_360deg)]",
    cornerGlow: "bg-emerald-300/40",
  },
  "Impromptu Speaking": {
    modeLabel: "text-violet-300",
    glassBase:
      "bg-[linear-gradient(135deg,rgba(9,9,14,0.62),rgba(14,12,20,0.5))]",
    radialTint:
      "bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.13),transparent_52%)]",
    borderBase: "bg-violet-500/12",
    borderBeam:
      "bg-[conic-gradient(from_0deg,transparent_0deg,transparent_306deg,rgba(139,92,246,0.75)_336deg,transparent_360deg)]",
    cornerGlow: "bg-violet-300/40",
  },
};

const MODE_COACH_AVATAR: Record<
  VoiceCoachMode,
  {
    name: string;
    ring: string;
    hair: string;
    skin: string;
    shirt: string;
  }
> = {
  Interview: {
    name: "Iris",
    ring: "border-blue-400/45",
    hair: "bg-[#2a2f4f]",
    skin: "bg-[#f2c8a0]",
    shirt: "bg-blue-500/45",
  },
  Debate: {
    name: "Rex",
    ring: "border-rose-400/45",
    hair: "bg-[#3a2315]",
    skin: "bg-[#d8a17a]",
    shirt: "bg-rose-500/45",
  },
  Presentation: {
    name: "Nova",
    ring: "border-emerald-400/45",
    hair: "bg-[#2b3a2f]",
    skin: "bg-[#ecc39f]",
    shirt: "bg-emerald-500/45",
  },
  "Impromptu Speaking": {
    name: "Lyra",
    ring: "border-violet-400/45",
    hair: "bg-[#2e2745]",
    skin: "bg-[#e8ba94]",
    shirt: "bg-violet-500/45",
  },
};

function getSessionHeading(isActive: boolean, isLoading: boolean): string {
  if (isActive) return "Live coaching session";
  if (isLoading) return "Connecting...";
  return "Ready to practice";
}

function getSessionDescription(
  isActive: boolean,
  isLoading: boolean,
  isSpeaking: boolean,
  connectHint: string | null,
): string {
  if (isActive) {
    return isSpeaking
      ? "Coach is speaking. Listen fully, then answer with one clear point."
      : "Your coach is listening. Speak naturally and keep your thoughts structured.";
  }
  if (isLoading) {
    return (
      connectHint ?? "Establishing voice connection. This may take up to 15 seconds."
    );
  }
  return "Your coach remembers your progress and adapts each session to this mode.";
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

function summarizeMessageTitle(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return "Untitled chat";
  return normalized.length > 64 ? `${normalized.slice(0, 61).trim()}...` : normalized;
}

function formatConversationTitle(
  item: VoiceCoachHistoryItem,
  index: number,
): string {
  const fallback = `Session ${index + 1}`;
  const title = item.title.trim();
  if (!title) return fallback;
  return title.length > 72 ? `${title.slice(0, 69).trim()}...` : title;
}

function normalizeTranscriptLines(transcript: string): ConversationMessage[] {
  const lines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => {
    const userMatch = line.match(/^\[(user|human)\]\s*(.+)$/i);
    const agentMatch = line.match(/^\[(agent|assistant)\]\s*(.+)$/i);
    if (userMatch?.[2]) {
      return {
        role: "user" as const,
        text: userMatch[2].trim(),
        timestamp: Date.now() + index,
      };
    }
    if (agentMatch?.[2]) {
      return {
        role: "agent" as const,
        text: agentMatch[2].trim(),
        timestamp: Date.now() + index,
      };
    }
    return {
      role: "agent" as const,
      text: line,
      timestamp: Date.now() + index,
    };
  });
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

function CoachFace({
  avatar,
  speaking,
  blinking = false,
  mouthLevel = 0,
  gaze = "center",
  headMotionClass = "rotate-0 translate-y-0",
  size,
}: {
  avatar: (typeof MODE_COACH_AVATAR)[VoiceCoachMode];
  speaking: boolean;
  blinking?: boolean;
  mouthLevel?: 0 | 1 | 2 | 3;
  gaze?: "center" | "left" | "right";
  headMotionClass?: string;
  size: "large" | "small";
}) {
  const shell = size === "large" ? "h-24 w-24" : "h-9 w-9";
  const face = size === "large" ? "h-14 w-14" : "h-5.5 w-5.5";
  const eyeWhite = size === "large" ? "h-3 w-3.5" : "h-1.5 w-2";
  const pupil = size === "large" ? "h-1.5 w-1.5" : "h-0.5 w-0.5";
  const mouth = size === "large" ? "w-6" : "w-2.5";
  const shoulders = size === "large" ? "h-5 w-12" : "h-2 w-4";
  const mouthClass =
    size === "large"
      ? ["h-1.5", "h-2", "h-2.5", "h-3"][mouthLevel]
      : ["h-0.5", "h-1", "h-1", "h-1.5"][mouthLevel];
  const pupilOffsetClass =
    gaze === "left" ? "-translate-x-0.5" : gaze === "right" ? "translate-x-0.5" : "translate-x-0";

  return (
    <div
      className={`relative flex ${shell} items-center justify-center rounded-full border bg-[#0a0a0f]/75 transition-transform duration-300 ${
        speaking ? "scale-[1.03]" : "scale-100"
      } ${headMotionClass} ${avatar.ring}`}
    >
      <div
        className={`absolute left-1/2 top-2 -translate-x-1/2 rounded-full ${avatar.hair} ${size === "large" ? "h-5 w-10" : "h-2 w-3.5"}`}
      />
      <div
        className={`relative rounded-full border border-black/20 ${avatar.skin} ${face}`}
      >
        <div className="absolute left-1/2 top-[35%] flex -translate-x-1/2 items-center gap-2">
          <span
            className={`relative overflow-hidden rounded-full border border-black/10 bg-white transition-all duration-100 ${eyeWhite} ${
              blinking ? "h-0.5" : size === "large" ? "h-3" : "h-1.5"
            }`}
          >
            <span
              className={`absolute left-1/2 top-1/2 -translate-y-1/2 rounded-full bg-[#1f2937] transition-transform duration-200 ${pupil} ${pupilOffsetClass}`}
            />
          </span>
          <span
            className={`relative overflow-hidden rounded-full border border-black/10 bg-white transition-all duration-100 ${eyeWhite} ${
              blinking ? "h-0.5" : size === "large" ? "h-3" : "h-1.5"
            }`}
          >
            <span
              className={`absolute left-1/2 top-1/2 -translate-y-1/2 rounded-full bg-[#1f2937] transition-transform duration-200 ${pupil} ${pupilOffsetClass}`}
            />
          </span>
        </div>
        <div className="absolute left-1/2 top-[62%] -translate-x-1/2">
          <span
            className={`block ${mouth} rounded-full bg-[#7b3f3f] transition-all duration-200 ${
              speaking
                ? `${mouthClass} animate-pulse`
                : `${size === "large" ? "h-1.5" : "h-0.5"}`
            }`}
          />
        </div>
      </div>
      <div
        className={`absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full ${avatar.shirt} ${shoulders}`}
      />
      {speaking && size === "large" && (
        <div className="pointer-events-none absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-1">
          <span className="h-2 w-1 rounded-full bg-violet-300/80 animate-pulse" />
          <span className="h-4 w-1 rounded-full bg-violet-300/80 animate-pulse [animation-delay:120ms]" />
          <span className="h-3 w-1 rounded-full bg-violet-300/80 animate-pulse [animation-delay:240ms]" />
        </div>
      )}
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
  const [autoEndedByVoice, setAutoEndedByVoice] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [historyItems, setHistoryItems] = useState<VoiceCoachHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [avatarBlinking, setAvatarBlinking] = useState(false);
  const [avatarMouthLevel, setAvatarMouthLevel] = useState<0 | 1 | 2 | 3>(0);
  const [avatarGaze, setAvatarGaze] = useState<"center" | "left" | "right">("center");
  const [avatarHeadMotionClass, setAvatarHeadMotionClass] = useState("rotate-0 translate-y-0");
  const transcriptRef = useRef<string[]>([]);
  const startedAtRef = useRef<number>(0);
  const activeConnectedAtRef = useRef<number>(0);
  const phaseRef = useRef<SessionPhase>("idle");
  const pendingConnectRef = useRef<PendingConnect | null>(null);
  const negotiationRetriesRef = useRef(0);
  const loadingPublicRetryRef = useRef(false);
  const loadingFailureHandledRef = useRef(false);
  const isStartingRef = useRef(false);
  const startAttemptCounterRef = useRef(0);
  const activeStartAttemptRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const autoEndingRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const conversationRef = useRef<ConversationHandle | null>(null);
  const isMountedRef = useRef(false);
  const connectionLockRef = useRef(false);
  const onConnectRef = useRef<() => void>(() => undefined);
  const onDisconnectRef = useRef<() => void>(() => undefined);
  const onMessageRef = useRef<(message: unknown) => void>(() => undefined);
  const onErrorRef = useRef<(message: string, context: unknown) => void>(() => undefined);
  const [storedConversationId, setStoredConversationId] = useState<string | null>(
    null,
  );

  const historyLoadGenerationRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      historyLoadGenerationRef.current += 1;
      activeStartAttemptRef.current = ++startAttemptCounterRef.current;
      connectionLockRef.current = false;
      void (async () => {
        const conv = conversationRef.current;
        if (!conv || conv.status === "disconnected") return;
        try {
          await conv.endSession();
        } catch {
          // Socket may already be closed — stopping mic is best-effort on unmount.
        }
      })();
    };
  }, []);

  const loadHistory = useCallback(async () => {
    const userName = getOrCreateStoredUserName();
    const loadGeneration = ++historyLoadGenerationRef.current;

    setHistoryLoading(true);
    setHistoryError(null);

    const isStale = () => loadGeneration !== historyLoadGenerationRef.current;

    try {
      const response = await fetch("/api/voice-coach/history", {
        headers: { "x-user-name": userName },
      });

      if (isStale()) return;

      const data = await parseApiJson<{
        items?: VoiceCoachHistoryItem[];
        error?: string;
        warning?: string;
        persisted?: boolean;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load chat history");
      }

      if (isStale() || !isMountedRef.current) return;

      setHistoryItems(data.items ?? []);
      if (data.warning) {
        setHistoryError(data.warning);
      } else if (data.persisted === false) {
        setHistoryError("History is temporarily unavailable.");
      }
    } catch (err) {
      if (isStale() || !isMountedRef.current) return;

      const message =
        err instanceof Error ? err.message : "Failed to load chat history";
      const isAbort =
        (err instanceof DOMException && err.name === "AbortError") ||
        message.toLowerCase().includes("aborted");

      if (isAbort) return;

      console.error("[voice-coach] history load failed:", err);
      setHistoryError(
        message === "Failed to fetch"
          ? "Could not reach the server. Check your connection and that npm run dev is running."
          : message,
      );
    } finally {
      if (!isStale() && isMountedRef.current) {
        setHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isMountedRef.current) {
        void loadHistory();
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadHistory]);

  const liveConversationItem = useMemo(() => {
    if (messages.length === 0) return null;
    const firstMeaningfulMessage = messages.find((msg) => msg.text.trim().length > 0);
    const title = firstMeaningfulMessage
      ? summarizeMessageTitle(firstMeaningfulMessage.text)
      : "Current conversation";

    const transcript = messages
      .map((message) => `[${message.role}] ${message.text}`)
      .join("\n");

    return {
      id: "__current__",
      title: `Current: ${title}`,
      mode,
      summary: null,
      task: null,
      transcript,
      createdAt: null,
      durationSeconds: null,
    } satisfies VoiceCoachHistoryItem;
  }, [messages, mode]);

  const allHistoryItems = useMemo(() => {
    if (!liveConversationItem) return historyItems;
    return [liveConversationItem, ...historyItems];
  }, [historyItems, liveConversationItem]);

  const effectiveSelectedHistoryId =
    selectedHistoryId && allHistoryItems.some((item) => item.id === selectedHistoryId)
      ? selectedHistoryId
      : allHistoryItems[0]?.id ?? null;

  const selectedHistoryItem = useMemo(
    () => allHistoryItems.find((item) => item.id === effectiveSelectedHistoryId) ?? null,
    [allHistoryItems, effectiveSelectedHistoryId],
  );

  const selectedHistoryMessages = useMemo(
    () =>
      selectedHistoryItem
        ? normalizeTranscriptLines(selectedHistoryItem.transcript)
        : [],
    [selectedHistoryItem],
  );
  const selectedHistoryIndex = selectedHistoryItem
    ? allHistoryItems.findIndex((item) => item.id === selectedHistoryItem.id)
    : -1;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    let blinkTimer: number | null = null;
    let reopenTimer: number | null = null;

    const scheduleBlink = () => {
      const nextDelayMs = 2200 + Math.random() * 2600;
      blinkTimer = window.setTimeout(() => {
        if (cancelled) return;
        setAvatarBlinking(true);
        reopenTimer = window.setTimeout(() => {
          setAvatarBlinking(false);
          scheduleBlink();
        }, 140);
      }, nextDelayMs);
    };

    scheduleBlink();

    return () => {
      cancelled = true;
      if (blinkTimer !== null) window.clearTimeout(blinkTimer);
      if (reopenTimer !== null) window.clearTimeout(reopenTimer);
    };
  }, []);

  const handleFallbackStartFailure = useCallback((retryErr: unknown) => {
    loadingFailureHandledRef.current = true;
    pendingConnectRef.current = null;
    negotiationRetriesRef.current = 0;
    sessionStartedRef.current = false;
    loadingPublicRetryRef.current = false;
    setConnectHint(null);
    setNotice(null);
    setError(
      formatVoiceCoachConnectionError(
        retryErr instanceof Error
          ? retryErr.message
          : "Public fallback connection failed",
        retryErr,
      ),
    );
    if (!isMountedRef.current) return;
    phaseRef.current = "idle";
    setPhase("idle");
    conversationIdRef.current = null;
    setStoredConversationId(null);
  }, []);

  const endSdkSessionIfOpen = useCallback(async () => {
    const conv = conversationRef.current;
    if (!conv || conv.status === "disconnected") {
      sessionStartedRef.current = false;
      connectionLockRef.current = false;
      return;
    }
    try {
      await conv.endSession();
    } catch (err) {
      console.warn("[voice-coach] endSession skipped:", err);
    } finally {
      sessionStartedRef.current = false;
      connectionLockRef.current = false;
    }
    await delayMs(RETRY_CLOSE_DELAY_MS);
  }, []);

  const startSdkSession = useCallback(
    async (options: Parameters<ConversationHandle["startSession"]>[0]) => {
      const conv = conversationRef.current;
      if (!conv) {
        throw new Error("Voice SDK not ready");
      }
      if (isSdkConnected(conv)) {
        return;
      }
      if (connectionLockRef.current) {
        return;
      }
      connectionLockRef.current = true;
      try {
        await conv.startSession(options);
      } catch (err) {
        connectionLockRef.current = false;
        throw err;
      }
    },
    [],
  );

  onConnectRef.current = () => {
    if (!isMountedRef.current) return;
    connectionLockRef.current = false;
    negotiationRetriesRef.current = 0;
    pendingConnectRef.current = null;
    sessionStartedRef.current = true;
    loadingFailureHandledRef.current = false;
    activeConnectedAtRef.current = Date.now();
    setConnectHint(null);
    phaseRef.current = "active";
    setPhase("active");
    setError(null);

    try {
      const id = conversationRef.current?.getId() || null;
      conversationIdRef.current = id;
      setStoredConversationId(id);
    } catch (err) {
      console.warn("[voice-coach] getId on connect skipped:", err);
    }
  };

  onDisconnectRef.current = () => {
    sessionStartedRef.current = false;
    connectionLockRef.current = false;

    if (!isMountedRef.current) {
      void endSdkSessionIfOpen();
      return;
    }

    if (phaseRef.current === "loading") {
      void endSdkSessionIfOpen();
      return;
    }

    if (
      phaseRef.current === "ending" ||
      phaseRef.current === "done" ||
      autoEndingRef.current
    ) {
      return;
    }

    void (async () => {
      await endSdkSessionIfOpen();
      if (!isMountedRef.current) return;
      if (phaseRef.current === "active") {
        setNotice(
          "Connection lost. Start again to continue, or End session to save.",
        );
        phaseRef.current = "idle";
        setPhase("idle");
      }
    })();
  };

  onMessageRef.current = (message: unknown) => {
    if (!isMountedRef.current) return;
    if (!isSdkConnected(conversationRef.current)) return;

    const normalized = normalizeConversationMessage(message);
    if (normalized) {
      setMessages((current) => [...current, normalized]);
      transcriptRef.current.push(`[${normalized.role}] ${normalized.text}`);
      return;
    }

    const fallback = (
      typeof message === "string" ? message : JSON.stringify(message ?? "")
    ).trim();
    if (fallback) {
      transcriptRef.current.push(fallback);
    }
  };

  onErrorRef.current = (message: string, context: unknown) => {
    if (!isMountedRef.current) return;

    if (isWebSocketClosedError(message, context)) {
      void (async () => {
        await endSdkSessionIfOpen();
        if (!isMountedRef.current) return;
        if (phaseRef.current === "active") {
          setNotice(
            "Voice connection closed. Check that your ElevenLabs agent is Public, then start again.",
          );
          phaseRef.current = "idle";
          setPhase("idle");
        }
      })();
      return;
    }

    console.error("[voice-coach] conversation error:", message, context);

    const pending = pendingConnectRef.current;
    if (
      phaseRef.current === "loading" &&
      pending?.authMode === "signed" &&
      pending.agentId &&
      !loadingPublicRetryRef.current &&
      isRetryableStartupFailure(message, context)
    ) {
      loadingPublicRetryRef.current = true;
      pendingConnectRef.current = {
        authMode: "public",
        agentId: pending.agentId,
        sessionOptions: pending.sessionOptions,
      };
      setConnectHint(
        "Signed handshake failed. Retrying with public agent connection…",
      );
      const publicPending = {
        authMode: "public" as const,
        agentId: pending.agentId,
        sessionOptions: pending.sessionOptions,
      };
      void (async () => {
        await endSdkSessionIfOpen();
        if (
          !isMountedRef.current ||
          phaseRef.current !== "loading" ||
          !pendingConnectRef.current
        ) {
          return;
        }
        try {
          await startSdkSession({
            agentId: publicPending.agentId,
            connectionType: "websocket",
            ...publicPending.sessionOptions,
          });
        } catch (retryErr) {
          if (isMountedRef.current) {
            handleFallbackStartFailure(retryErr);
          }
        }
      })();
      return;
    }

    if (phaseRef.current === "active" || phaseRef.current === "ending") {
      void endSdkSessionIfOpen();
      setNotice(
        `Connection issue: ${formatVoiceCoachConnectionError(message, context).split("\n")[0]}`,
      );
      if (phaseRef.current === "active") {
        phaseRef.current = "idle";
        setPhase("idle");
      }
      return;
    }

    loadingFailureHandledRef.current = true;
    pendingConnectRef.current = null;
    negotiationRetriesRef.current = 0;
    sessionStartedRef.current = false;
    loadingPublicRetryRef.current = false;
    connectionLockRef.current = false;
    setConnectHint(null);
    setError(formatVoiceCoachConnectionError(message, context));
    phaseRef.current = "idle";
    setPhase("idle");
    void endSdkSessionIfOpen();
  };

  const conversation = useConversation({
    onConnect: () => onConnectRef.current(),
    onDisconnect: () => onDisconnectRef.current(),
    onMessage: (message) => onMessageRef.current(message),
    onError: (message, context) => onErrorRef.current(message, context),
  });

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    if (phase !== "loading") return;

    const timeoutMs = 25_000;
    const timer = window.setTimeout(() => {
      if (!isMountedRef.current || phaseRef.current !== "loading") return;

      pendingConnectRef.current = null;
      negotiationRetriesRef.current = 0;
      sessionStartedRef.current = false;
      loadingPublicRetryRef.current = false;
      loadingFailureHandledRef.current = true;
      isStartingRef.current = false;
      connectionLockRef.current = false;
      conversationIdRef.current = null;
      setStoredConversationId(null);
      setConnectHint(null);
      setNotice(null);
      setError(
        formatVoiceCoachConnectionError(
          "NegotiationError: negotiation timed out /rtc/v1/validate v1 RTC path not found",
        ),
      );
      void endSdkSessionIfOpen().then(() => {
        if (!isMountedRef.current || phaseRef.current !== "loading") return;
        phaseRef.current = "idle";
        setPhase("idle");
      });
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [endSdkSessionIfOpen, phase]);

  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    activeStartAttemptRef.current = ++startAttemptCounterRef.current;
    if (phaseRef.current !== "active" && phaseRef.current !== "loading") {
      return;
    }
    void endSdkSessionIfOpen().then(() => {
      if (!isMountedRef.current) return;
      setNotice("Practice mode changed. Start again to connect.");
      phaseRef.current = "idle";
      setPhase("idle");
    });
  }, [endSdkSessionIfOpen, mode]);

  const avatarIsActive = phase === "active" || phase === "ending";
  const avatarIsSpeaking = avatarIsActive && conversation.isSpeaking;

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const scheduleGaze = () => {
      const nextDelayMs = 900 + Math.random() * 1200;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const nextGaze = ["center", "left", "right"][
          Math.floor(Math.random() * 3)
        ] as "center" | "left" | "right";
        setAvatarGaze(nextGaze);
        scheduleGaze();
      }, nextDelayMs);
    };

    scheduleGaze();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const listeningPoses = ["rotate-0 translate-y-0", "rotate-[1deg] -translate-y-[1px]", "rotate-[-1deg] translate-y-0"] as const;
    const speakingPoses = ["rotate-[1deg] -translate-y-[1px]", "rotate-[-1deg] -translate-y-[1px]", "rotate-0 -translate-y-[1px]"] as const;

    const interval = window.setInterval(() => {
      if (cancelled) return;
      const mouthFrame = avatarIsSpeaking
        ? ([1, 2, 3][Math.floor(Math.random() * 3)] as 1 | 2 | 3)
        : 0;
      setAvatarMouthLevel(mouthFrame);

      const poses = avatarIsSpeaking
        ? speakingPoses
        : avatarIsActive
          ? listeningPoses
          : (["rotate-0 translate-y-0"] as const);
      setAvatarHeadMotionClass(poses[Math.floor(Math.random() * poses.length)]);
    }, avatarIsSpeaking ? 140 : 620);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [avatarIsActive, avatarIsSpeaking]);

  const getConversationId = useCallback((): string | undefined => {
    if (conversationIdRef.current) {
      return conversationIdRef.current;
    }
    if (conversation.status !== "connected") {
      return undefined;
    }
    try {
      const id = conversation.getId() || undefined;
      if (id) {
        conversationIdRef.current = id;
        if (isMountedRef.current) {
          setStoredConversationId(id);
        }
      }
      return id;
    } catch (err) {
      console.warn("[voice-coach] getId skipped:", err);
      return undefined;
    }
  }, [conversation]);

  const startSession = useCallback(async () => {
    if (isStartingRef.current || phaseRef.current === "loading") {
      setNotice("A connection attempt is already in progress...");
      return;
    }

    isStartingRef.current = true;
    const startAttemptId = ++startAttemptCounterRef.current;
    activeStartAttemptRef.current = startAttemptId;

    getOrCreateStoredUserName();
    setError(null);
    setNotice(null);
    setConnectHint(null);
    negotiationRetriesRef.current = 0;
    loadingPublicRetryRef.current = false;
    loadingFailureHandledRef.current = false;
    pendingConnectRef.current = null;
    sessionStartedRef.current = false;
    conversationIdRef.current = null;
    setStoredConversationId(null);
    activeConnectedAtRef.current = 0;
    autoEndingRef.current = false;
    phaseRef.current = "loading";
    setPhase("loading");
    setTask(null);
    setSummary(null);
    setAutoEndedByVoice(false);
    setShowMessages(false);
    setMessages([]);
    transcriptRef.current = [];

    try {
      await endSdkSessionIfOpen();
      if (!isMountedRef.current || activeStartAttemptRef.current !== startAttemptId) {
        return;
      }
      if (isSdkConnected(conversationRef.current)) {
        phaseRef.current = "active";
        setPhase("active");
        return;
      }

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
      if (!isMountedRef.current || activeStartAttemptRef.current !== startAttemptId) {
        return;
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
        setConnectHint("Connecting via websocket…");
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
          agentId: data.agentId,
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
        await startSdkSession({
          signedUrl: pending.signedUrl,
          ...pending.sessionOptions,
        });
      } else if (pending.authMode === "public" && pending.agentId) {
        await startSdkSession({
          agentId: pending.agentId,
          ...pending.sessionOptions,
        });
      }
    } catch (err) {
      if (!isMountedRef.current || activeStartAttemptRef.current !== startAttemptId) {
        return;
      }
      console.error("[voice-coach] start failed:", err);
      connectionLockRef.current = false;
      await endSdkSessionIfOpen();
      pendingConnectRef.current = null;
      sessionStartedRef.current = false;
      conversationIdRef.current = null;
      setStoredConversationId(null);
      loadingPublicRetryRef.current = false;
      setConnectHint(null);
      setError(
        formatVoiceCoachConnectionError(
          err instanceof Error ? err.message : "Could not start voice session",
          err,
        ),
      );
      phaseRef.current = "idle";
      setPhase("idle");
    } finally {
      if (
        isMountedRef.current &&
        activeStartAttemptRef.current === startAttemptId
      ) {
        isStartingRef.current = false;
      }
    }
  }, [endSdkSessionIfOpen, mode, startSdkSession]);

  const endSession = useCallback(async (triggeredByVoiceIntent = false) => {
    const userName = getStoredUserName() ?? getOrCreateStoredUserName();
    if (!userName) return;

    const conversationId =
      conversationIdRef.current ?? storedConversationId ?? getConversationId();

    if (
      phaseRef.current !== "active" &&
      phaseRef.current !== "ending" &&
      !conversationId
    ) {
      return;
    }

    pendingConnectRef.current = null;
    negotiationRetriesRef.current = 0;
    loadingPublicRetryRef.current = false;
    setConnectHint(null);
    setAutoEndedByVoice(triggeredByVoiceIntent);
    autoEndingRef.current = true;
    phaseRef.current = "ending";
    setPhase("ending");

    if (!conversationId) {
      sessionStartedRef.current = false;
      setError("No active conversation found. Start a new session and try again.");
      phaseRef.current = "idle";
      setPhase("idle");
      isStartingRef.current = false;
      autoEndingRef.current = false;
      return;
    }

    if (conversation.status !== "disconnected") {
      try {
        await conversation.endSession();
      } catch (err) {
        console.warn("[voice-coach] endSession skipped:", err);
      }
    }
    sessionStartedRef.current = false;

    if (!isMountedRef.current) {
      autoEndingRef.current = false;
      return;
    }

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
        warning?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save session");
      }

      if (!isMountedRef.current) return;

      setTask(data.task ?? null);
      setSummary(data.summary ?? null);
      if (data.warning) {
        setNotice(data.warning);
      } else if (triggeredByVoiceIntent) {
        setNotice("Session ended from your voice command.");
      } else {
        setNotice(null);
      }
      conversationIdRef.current = null;
      setStoredConversationId(null);
      setPhase("done");
      void loadHistory();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("[voice-coach] end session failed:", err);
      setError(
        formatVoiceCoachConnectionError(
          err instanceof Error ? err.message : "Could not save your session",
          err,
        ),
      );
      phaseRef.current = "idle";
      setPhase("idle");
    } finally {
      if (isMountedRef.current) {
        autoEndingRef.current = false;
        isStartingRef.current = false;
      }
    }
  }, [conversation, getConversationId, loadHistory, mode, storedConversationId]);

  const coachAvatar = MODE_COACH_AVATAR[mode];

  if (phase === "done") {
    return (
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <HistorySidebar
          items={allHistoryItems}
          historyLoading={historyLoading}
          historyError={historyError}
          selectedHistoryId={effectiveSelectedHistoryId}
          onSelect={setSelectedHistoryId}
        />
        <div className="space-y-5">
          <div className="rounded-3xl border border-white/[0.08] bg-[#101014] p-8 shadow-[0_0_45px_rgba(139,92,246,0.1)]">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Session complete
            </p>
            {autoEndedByVoice && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/35 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                Auto-ended by voice command
              </p>
            )}
            <h2 className="mt-3 text-2xl font-bold text-white">
              Great work today in {mode}
            </h2>
            {summary && <p className="mt-2 text-sm text-[#9ca3af]">{summary}</p>}
            {task && <HomeworkCard task={task} mode={mode} />}
            <SessionActions
              onPracticeAgain={() => {
                phaseRef.current = "idle";
                setPhase("idle");
                setTask(null);
                setSummary(null);
                setAutoEndedByVoice(false);
                setError(null);
                setNotice(null);
                setConnectHint(null);
                conversationIdRef.current = null;
                setStoredConversationId(null);
              }}
            />
          </div>
          <HistoryContent
            selectedHistoryItem={selectedHistoryItem}
            selectedHistoryMessages={selectedHistoryMessages}
            selectedHistoryIndex={selectedHistoryIndex}
            coachAvatar={coachAvatar}
          />
        </div>
      </div>
    );
  }

  const sdkConnected = conversation.status === "connected";
  const isLive = phase === "active" && sdkConnected;
  const isActive = phase === "active" || phase === "ending";
  const isLoading = phase === "loading" || phase === "ending";
  const canEndSession =
    isLive ||
    phase === "ending" ||
    (Boolean(storedConversationId) &&
      (phase === "active" || phase === "idle"));
  const showStartButton =
    phase === "idle" ||
    phase === "loading" ||
    (phase === "active" && !sdkConnected);
  const heading = getSessionHeading(isLive, isLoading);
  const description = getSessionDescription(
    isLive,
    isLoading,
    conversation.isSpeaking,
    connectHint,
  );
  const isConnected = sdkConnected;
  const liveStateLabel = isConnected
    ? conversation.isSpeaking
      ? "Connected · Coach speaking"
      : "Connected · Listening"
    : isLoading
      ? "Connecting"
      : "Disconnected";
  const modeSurface = MODE_SURFACE_STYLES[mode];
  

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <HistorySidebar
        items={allHistoryItems}
        historyLoading={historyLoading}
        historyError={historyError}
        selectedHistoryId={effectiveSelectedHistoryId}
        onSelect={setSelectedHistoryId}
      />
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl p-[1px]">
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 rounded-3xl ${modeSurface.borderBase}`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute -inset-[125%] ${modeSurface.borderBeam} animate-[spin_8s_linear_infinite]`}
          />

          <div
            className={`relative overflow-hidden rounded-[calc(1.5rem-1px)] border border-white/[0.14] p-8 shadow-[0_0_40px_rgba(2,6,23,0.28)] backdrop-blur-2xl ${modeSurface.glassBase}`}
          >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.005)_65%)]"
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${modeSurface.radialTint}`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.09),transparent)]"
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0 top-0 h-12 w-12 rounded-full blur-md ${modeSurface.cornerGlow} animate-pulse`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute right-0 top-0 h-12 w-12 rounded-full blur-md ${modeSurface.cornerGlow} animate-pulse [animation-delay:200ms]`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-12 w-12 rounded-full blur-md ${modeSurface.cornerGlow} animate-pulse [animation-delay:350ms]`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 right-0 h-12 w-12 rounded-full blur-md ${modeSurface.cornerGlow} animate-pulse [animation-delay:500ms]`}
        />

        <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-medium ${modeSurface.modeLabel}`}>{mode} mode</p>
          <p
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              isConnected
                ? "border-emerald-500/45 bg-emerald-500/12 text-emerald-200"
                : isLoading
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
                  : "border-red-500/45 bg-red-500/12 text-red-200"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected
                    ? "bg-emerald-300"
                    : isLoading
                      ? "bg-blue-300"
                      : "animate-pulse bg-red-300"
                }`}
              />
              {liveStateLabel}
            </span>
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white">{heading}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9ca3af]">
          {description}
        </p>
      </div>

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

      <div className="relative mt-8 flex justify-center">
        <div
          className={`flex h-36 w-36 items-center justify-center rounded-full border transition-all duration-300 ${
            isActive
              ? conversation.isSpeaking
                ? "border-[#8b5cf6] bg-[#8b5cf6]/20 shadow-[0_0_45px_rgba(139,92,246,0.38)]"
                : "border-teal-500/50 bg-teal-500/10 shadow-[0_0_35px_rgba(20,184,166,0.25)]"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <div className="relative">
            <CoachFace
              avatar={coachAvatar}
              speaking={avatarIsSpeaking}
              blinking={avatarBlinking}
              mouthLevel={avatarIsActive ? avatarMouthLevel : 0}
              gaze={avatarGaze}
              headMotionClass={avatarIsActive ? avatarHeadMotionClass : "rotate-0 translate-y-0"}
              size="large"
            />
            <span
              className={`absolute -right-1 -top-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                conversation.isSpeaking && isActive
                  ? "border-violet-300/60 bg-violet-500/20 text-violet-100"
                  : "border-white/20 bg-black/30 text-[#d4d4d8]"
              }`}
            >
              AI
            </span>
          </div>
        </div>
        {isActive && (
          <span
            aria-hidden
            className="absolute h-40 w-40 animate-ping rounded-full border border-[#8b5cf6]/30"
          />
        )}
      </div>

      <p className="mt-3 text-center text-sm text-[#d4d4d8]">
        {coachAvatar.name} · {conversation.isSpeaking && isActive ? "speaking" : "listening"}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[#9ca3af]">
          Status: {conversation.status}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[#9ca3af]">
          Messages: {messages.length}
        </span>
      </div>

      <p className="mt-3 text-center text-xs text-[#6b7280]">
        Status: {conversation.status}
        {isActive
          ? ` · ${conversation.isSpeaking ? "speaking" : "listening"}`
          : ""}
      </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {showStartButton ? (
                <button
                  type="button"
                  onClick={() => void startSession()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  <Mic className="h-4 w-4" />
                  {isLoading ? "Connecting…" : "Start Practicing Free"}
                </button>
              ) : null}
              {canEndSession ? (
                <button
                  type="button"
                  onClick={() => void endSession(false)}
                  disabled={phase === "ending"}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Square className="h-4 w-4" />
                  {phase === "ending" ? "Saving session…" : "End session"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowMessages(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquareText className="h-4 w-4" />
                View Messages {messages.length > 0 ? `(${messages.length})` : ""}
              </button>
            </div>
          </div>
        </div>
        {showMessages && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#111114] shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="text-lg font-semibold text-white">Live Messages</h3>
                <button
                  type="button"
                  onClick={() => setShowMessages(false)}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">No messages yet for this session.</p>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${message.timestamp}-${index}`}
                      className={`rounded-xl border px-4 py-3 ${
                        message.role === "agent"
                          ? "border-[#8b5cf6]/25 bg-[#8b5cf6]/10"
                          : "border-white/10 bg-[#0b0b0d]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                            message.role === "agent"
                              ? "border-[#8b5cf6]/45 bg-[#8b5cf6]/20 text-[#d8b4fe]"
                              : "border-white/15 bg-white/10 text-white"
                          }`}
                        >
                          {message.role === "agent" ? (
                            <CoachFace avatar={coachAvatar} speaking={false} size="small" />
                          ) : (
                            <UserRound className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-wide text-[#8b5cf6]">
                            {message.role === "agent" ? coachAvatar.name : "You"}
                          </p>
                          <p className="mt-1 text-sm text-white">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <HistoryContent
          selectedHistoryItem={selectedHistoryItem}
          selectedHistoryMessages={selectedHistoryMessages}
          selectedHistoryIndex={selectedHistoryIndex}
          coachAvatar={coachAvatar}
        />
      </div>
    </div>
  );
}

function HistorySidebar({
  items,
  historyLoading,
  historyError,
  selectedHistoryId,
  onSelect,
}: {
  items: VoiceCoachHistoryItem[];
  historyLoading: boolean;
  historyError: string | null;
  selectedHistoryId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0f]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
          Chat History
        </p>
        <span className="rounded-full border border-[#8b5cf6]/35 bg-[#8b5cf6]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#d8b4fe]">
          New Chat
        </span>
      </div>
      <div className="max-h-[74vh] space-y-2 overflow-y-auto p-3">
        {historyLoading && (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#9ca3af]">
            Loading history...
          </p>
        )}
        {historyError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {historyError}
          </p>
        )}
        {!historyLoading && items.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#9ca3af]">
            No chat history yet.
          </p>
        )}
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
              selectedHistoryId === item.id
                ? "border-[#8b5cf6]/55 bg-[#8b5cf6]/20 shadow-[0_0_0_1px_rgba(139,92,246,0.35)]"
                : "border-white/10 bg-[#111114] hover:bg-white/[0.04]"
            }`}
          >
            <p
              className={`text-xs ${
                selectedHistoryId === item.id ? "text-[#c4b5fd]" : "text-[#9ca3af]"
              }`}
            >
              {item.mode}
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {formatConversationTitle(item, index)}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function HistoryContent({
  selectedHistoryItem,
  selectedHistoryMessages,
  selectedHistoryIndex,
  coachAvatar,
}: {
  selectedHistoryItem: VoiceCoachHistoryItem | null;
  selectedHistoryMessages: ConversationMessage[];
  selectedHistoryIndex: number;
  coachAvatar: (typeof MODE_COACH_AVATAR)[VoiceCoachMode];
}) {
  if (!selectedHistoryItem) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
      <div className="border-b border-white/10 px-5 py-3">
        <p className="text-sm font-semibold text-white">
          {formatConversationTitle(selectedHistoryItem, Math.max(0, selectedHistoryIndex))}
        </p>
        {selectedHistoryItem?.summary && (
          <p className="mt-1 text-xs text-[#9ca3af]">{selectedHistoryItem.summary}</p>
        )}
        {selectedHistoryItem?.task && (
          <p className="mt-2 inline-flex max-w-full items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
            Task: {selectedHistoryItem.task}
          </p>
        )}
      </div>
      <div className="max-h-[42vh] space-y-3 overflow-y-auto px-5 py-4">
        {selectedHistoryMessages.length === 0 ? (
          <p className="text-sm text-[#9ca3af]">No transcript content found.</p>
        ) : (
          selectedHistoryMessages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`rounded-xl border px-4 py-3 ${
                message.role === "agent"
                  ? "border-[#8b5cf6]/25 bg-[#8b5cf6]/10"
                  : "border-white/10 bg-[#0b0b0d]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    message.role === "agent"
                      ? "border-[#8b5cf6]/45 bg-[#8b5cf6]/20 text-[#d8b4fe]"
                      : "border-white/15 bg-white/10 text-white"
                  }`}
                >
                  {message.role === "agent" ? (
                    <CoachFace avatar={coachAvatar} speaking={false} size="small" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-[#8b5cf6]">
                    {message.role === "agent" ? coachAvatar.name : "You"}
                  </p>
                  <p className="mt-1 text-sm text-white">{message.text}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SessionActions({
  onPracticeAgain,
}: {
  onPracticeAgain: () => void;
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onPracticeAgain}
        className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed]"
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
