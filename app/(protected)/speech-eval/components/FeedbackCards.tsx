"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Loader2, Pause, Play, RotateCcw, X } from "lucide-react";
import type { AnalysisResult, SelectedVoices } from "@/lib/speech-eval";
import {
  deriveSessionMetrics,
  extractImprovements,
  extractStrengths,
} from "@/lib/feedback-summary";
import {
  fetchSpeakAudio,
  ttsCacheKey,
  type SpeakRole,
} from "@/lib/tts-cache";
import { AnnotatedTranscript } from "./AnnotatedTranscript";
import { SessionSummary } from "./SessionSummary";

type CardState = "idle" | "loading-audio" | "playing" | "paused" | "done";

interface FeedbackCardsProps {
  result: AnalysisResult;
  selectedVoices: SelectedVoices;
  onPracticeAgain: () => void;
}

interface JudgeConfig {
  role: SpeakRole;
  roleLabel: string;
  name: string;
  text: string;
  voiceId: string;
  fillColor: string;
  accentText: string;
  accentBg: string;
}

interface PlaybackCoordinator {
  requestPlay: (role: string) => number;
  registerStopHandler: (role: string, stop: () => void) => void;
  unregisterStopHandler: (role: string) => void;
  getCachedUrl: (key: string) => string | undefined;
  setCachedUrl: (key: string, url: string) => void;
}

const PlaybackContext = createContext<PlaybackCoordinator | null>(null);

function usePlaybackCoordinator(): PlaybackCoordinator {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("Must be inside PlaybackContext.Provider");
  return ctx;
}

/** Gender-neutral head + shoulders SVG silhouette */
function JudgeSilhouette({
  fillColor,
  isActive,
}: {
  fillColor: string;
  isActive: boolean;
}) {
  return (
    <svg viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {isActive && (
        <ellipse cx="40" cy="22" rx="23" ry="25" stroke={fillColor} strokeWidth="2" strokeOpacity="0.45" className="animate-pulse" />
      )}
      {/* Head */}
      <ellipse cx="40" cy="22" rx="15" ry="17" fill={fillColor} />
      {/* Neck */}
      <rect x="36" y="37" width="8" height="7" rx="3" fill={fillColor} />
      {/* Shoulders */}
      <path d="M4 72 C4 53 20 46 40 46 C60 46 76 53 76 72" fill={fillColor} />
    </svg>
  );
}

function SoundWaveBars({ small = false }: { small?: boolean }) {
  const bars = [12, 20, 16, 24, 16, 20, 12];
  return (
    <div className="flex items-end justify-center gap-0.5" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className={`rounded-full bg-amber-400 animate-pulse ${small ? "w-0.5" : "w-1"}`}
          style={{ height: small ? h * 0.65 : h }}
        />
      ))}
    </div>
  );
}

/** Open book component — pure display, receives all state from parent */
function OpenBook({
  judge,
  cardState,
  error,
  onClose,
  onPlay,
  onTogglePause,
  onStop,
}: {
  judge: JudgeConfig;
  cardState: CardState;
  error: string;
  onClose: () => void;
  onPlay: (e: React.MouseEvent) => void;
  onTogglePause: (e: React.MouseEvent) => void;
  onStop: (e: React.MouseEvent) => void;
}) {
  const isLoading = cardState === "loading-audio";
  const isPlaying = cardState === "playing";
  const isPaused = cardState === "paused";
  const isDone = cardState === "done";

  return (
    <div
      className="relative mt-0 overflow-hidden rounded-b-2xl shadow-inner"
      role="region"
      aria-label={`${judge.name}'s written feedback`}
    >
      {/* Accent ribbon at top of book */}
      <div className={`h-1 w-full ${judge.accentBg}`} />

      <div className="flex min-h-[240px] bg-[#f5f0e6]">
        {/* Left page — identity + audio controls */}
        <div className="flex w-44 shrink-0 flex-col items-center justify-start gap-4 border-r-2 border-dashed border-[#c9b99a] bg-[#ede7d9] px-4 py-5">
          <div className="text-center">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${judge.accentText}`}>
              {judge.roleLabel}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#2c1e0f]">{judge.name}</p>
          </div>

          {/* Audio controls */}
          <div className="flex flex-col items-center gap-2">
            {isLoading && <Loader2 className="h-9 w-9 animate-spin text-amber-700" />}

            {(cardState === "idle" || isDone) && (
              <button
                type="button"
                onClick={onPlay}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-black shadow-md transition-transform hover:scale-105"
                aria-label={`Play ${judge.name} feedback`}
              >
                <Play className="h-5 w-5 fill-current" />
              </button>
            )}

            {(isPlaying || isPaused) && (
              <>
                <SoundWaveBars small />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-600/40 bg-amber-400/30 text-amber-800"
                    aria-label={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={onStop} className="text-[10px] text-[#7a6040] hover:text-[#2c1e0f]">
                    Stop
                  </button>
                </div>
              </>
            )}

            {isDone && (
              <button
                type="button"
                onClick={onPlay}
                className="flex items-center gap-1 text-xs text-[#7a6040] hover:text-amber-700"
              >
                <RotateCcw className="h-3 w-3" />
                Replay
              </button>
            )}

            {isLoading && <p className="text-[10px] text-[#7a6040]">Loading…</p>}
            {isPlaying && <p className="text-[10px] font-medium text-amber-700">Speaking…</p>}
            {isPaused && <p className="text-[10px] text-[#7a6040]">Paused</p>}

            {error ? <p className="text-[10px] text-red-700" role="alert">{error}</p> : null}
          </div>

          {/* Decorative ruled lines */}
          <div className="mt-auto w-full space-y-2 opacity-20">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-px w-full bg-[#7a6040]" />
            ))}
          </div>
        </div>

        {/* Book spine */}
        <div className="w-3 shrink-0 bg-gradient-to-r from-[#c9b99a] via-[#d5c5a8] to-[#ede7d9]" />

        {/* Right page — text */}
        <div className="relative flex-1 overflow-hidden px-6 py-5">
          {/* Ruled-line background */}
          <div className="pointer-events-none absolute inset-0 px-6 py-5" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-[#c9b99a]/35"
                style={{ height: 28 }}
              />
            ))}
          </div>
          {/* Actual text, line-height matching ruled lines */}
          <p className="relative text-sm leading-7 text-[#2c1e0f]">{judge.text}</p>
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#c9b99a]/60 text-[#5a3e20] transition-colors hover:bg-[#c9b99a] hover:text-[#2c1e0f]"
        aria-label="Close feedback book"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Single judge: owns its own playback state.
 * Renders silhouette + desk, and if isBookOpen, renders the open book below.
 * The book is rendered OUTSIDE this component in the parent so it spans full width —
 * this component exposes state via an onStateChange callback.
 */
function JudgeSeat({
  config,
  isBookOpen,
  onToggleBook,
  onStateChange,
}: {
  config: JudgeConfig;
  isBookOpen: boolean;
  onToggleBook: () => void;
  onStateChange: (
    role: SpeakRole,
    state: CardState,
    error: string,
    handlers: {
      onPlay: (e: React.MouseEvent) => void;
      onTogglePause: (e: React.MouseEvent) => void;
      onStop: (e: React.MouseEvent) => void;
    },
  ) => void;
}) {
  const coordinator = usePlaybackCoordinator();
  const [cardState, setCardState] = useState<CardState>("idle");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playTokenRef = useRef(0);
  const hasCompletedRef = useRef(false);

  const cacheKey = ttsCacheKey(config.text, config.voiceId, config.role);

  const cleanupAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current && coordinator.getCachedUrl(cacheKey) !== urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = null;
  }, [cacheKey, coordinator]);

  const stopPlayback = useCallback(() => {
    cleanupAudio();
    playTokenRef.current = 0;
    setError("");
    setCardState((prev) =>
      prev === "playing" || prev === "paused" || prev === "loading-audio"
        ? hasCompletedRef.current ? "done" : "idle"
        : prev,
    );
  }, [cleanupAudio]);

  useEffect(() => {
    coordinator.registerStopHandler(config.role, stopPlayback);
    return () => {
      coordinator.unregisterStopHandler(config.role);
      cleanupAudio();
    };
  }, [config.role, coordinator, stopPlayback, cleanupAudio]);

  const playFeedback = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError("");
    cleanupAudio();

    const token = coordinator.requestPlay(config.role);
    playTokenRef.current = token;
    setCardState("loading-audio");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let url = coordinator.getCachedUrl(cacheKey);
      if (!url) {
        const blob = await fetchSpeakAudio(config.text, config.voiceId, config.role, controller.signal);
        url = URL.createObjectURL(blob);
        coordinator.setCachedUrl(cacheKey, url);
      }
      if (playTokenRef.current !== token) return;

      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (playTokenRef.current !== token) return;
        hasCompletedRef.current = true;
        setCardState("done");
      };
      audio.onerror = () => {
        if (playTokenRef.current !== token) return;
        setError("Playback failed");
        setCardState("idle");
      };
      await audio.play();
      if (playTokenRef.current !== token) { audio.pause(); return; }
      setCardState("playing");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (playTokenRef.current !== token) return;
      setError(err instanceof Error ? err.message : "Could not play feedback");
      setCardState(hasCompletedRef.current ? "done" : "idle");
    }
  }, [cacheKey, cleanupAudio, config, coordinator]);

  const togglePause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (cardState === "playing") { audio.pause(); setCardState("paused"); }
    else if (cardState === "paused") { void audio.play().then(() => setCardState("playing")); }
  }, [cardState]);

  const handleStop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    stopPlayback();
  }, [stopPlayback]);

  // Bubble state + handlers up to parent so the book panel can use them
  useEffect(() => {
    onStateChange(config.role, cardState, error, {
      onPlay: playFeedback,
      onTogglePause: togglePause,
      onStop: handleStop,
    });
  }, [
    config.role,
    cardState,
    error,
    playFeedback,
    togglePause,
    handleStop,
    onStateChange,
  ]);

  const isActive = cardState === "playing" || cardState === "paused" || cardState === "loading-audio";

  return (
    <div className="flex flex-col items-center">
      {/* Silhouette — clickable to open/close book */}
      <button
        type="button"
        onClick={onToggleBook}
        className={`w-24 cursor-pointer rounded-xl p-1 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
          isBookOpen ? "scale-105" : "hover:scale-105"
        }`}
        aria-pressed={isBookOpen}
        aria-label={`${config.name}, ${config.roleLabel} — ${isBookOpen ? "close" : "open"} written notes`}
      >
        <JudgeSilhouette fillColor={config.fillColor} isActive={isActive} />
      </button>

      {/* Name + role */}
      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-widest ${config.accentText}`}>
        {config.roleLabel}
      </p>
      <p className="font-semibold text-white">{config.name}</p>

      {/* Desk surface */}
      <div
        className={`mt-3 w-full rounded-t-lg border border-b-0 px-3 py-3 transition-colors duration-200 ${
          isBookOpen ? "border-amber-500/40 bg-amber-950/20" : "border-white/[0.08] bg-[#13141b]"
        }`}
      >
        <div className="flex flex-col items-center gap-1.5">
          {/* Play controls */}
          {cardState === "loading-audio" && (
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          )}
          {(cardState === "idle" || cardState === "done") && (
            <button
              type="button"
              onClick={playFeedback}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-black shadow transition-transform hover:scale-105"
              aria-label={`Play ${config.name}`}
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
          )}
          {(cardState === "playing" || cardState === "paused") && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePause}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400"
                aria-label={cardState === "paused" ? "Resume" : "Pause"}
              >
                {cardState === "paused"
                  ? <Play className="h-3.5 w-3.5 fill-current" />
                  : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={handleStop} className="text-[10px] text-gray-500 hover:text-white">
                Stop
              </button>
            </div>
          )}
          {isActive && <SoundWaveBars small />}
          {cardState === "done" && (
            <button type="button" onClick={playFeedback} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-amber-400">
              <RotateCcw className="h-3 w-3" /> Replay
            </button>
          )}
          {error ? <p className="text-[10px] text-red-400" role="alert">{error}</p> : null}

          {/* Book toggle */}
          <button
            type="button"
            onClick={onToggleBook}
            className={`mt-1 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors ${
              isBookOpen ? "bg-amber-500/15 text-amber-400" : "text-gray-600 hover:text-amber-400"
            }`}
          >
            <span aria-hidden>📖</span>
            {isBookOpen ? "Close notes" : "Read notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedbackCards({
  result,
  selectedVoices,
  onPracticeAgain,
}: FeedbackCardsProps) {
  const generationRef = useRef(0);
  const stopHandlersRef = useRef<Map<string, () => void>>(new Map());
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const [selectedRole, setSelectedRole] = useState<SpeakRole | null>(null);

  // Per-judge playback state bubbled up from each JudgeSeat
  const [judgeStates, setJudgeStates] = useState<
    Record<
      string,
      {
        cardState: CardState;
        error: string;
        handlers: {
          onPlay: (e: React.MouseEvent) => void;
          onTogglePause: (e: React.MouseEvent) => void;
          onStop: (e: React.MouseEvent) => void;
        };
      }
    >
  >({});

  const wordCount = useMemo(
    () => result.transcript.trim().split(/\s+/).filter(Boolean).length,
    [result.transcript],
  );
  const metrics = useMemo(
    () => deriveSessionMetrics(result.evaluatorScore, result.fillerWordCount, wordCount),
    [result.evaluatorScore, result.fillerWordCount, wordCount],
  );
  const strengths = useMemo(
    () => extractStrengths(result.counter, result.grammarian, result.evaluator, result.fillerWordCount),
    [result.counter, result.grammarian, result.evaluator, result.fillerWordCount],
  );
  const improvements = useMemo(
    () => extractImprovements(result.counter, result.grammarian, result.evaluator),
    [result.counter, result.grammarian, result.evaluator],
  );

  const judges: JudgeConfig[] = useMemo(() => [
    {
      role: "counter" as SpeakRole,
      roleLabel: "Counter",
      name: "Rex",
      text: result.counter,
      voiceId: selectedVoices.counter,
      fillColor: "#0f766e",
      accentText: "text-teal-400",
      accentBg: "bg-teal-500",
    },
    {
      role: "grammarian" as SpeakRole,
      roleLabel: "Grammarian",
      name: "Clara",
      text: result.grammarian,
      voiceId: selectedVoices.grammarian,
      fillColor: "#7c3aed",
      accentText: "text-purple-400",
      accentBg: "bg-purple-500",
    },
    {
      role: "evaluator" as SpeakRole,
      roleLabel: "Evaluator",
      name: "Marcus",
      text: result.evaluator,
      voiceId: selectedVoices.evaluator,
      fillColor: "#b45309",
      accentText: "text-amber-400",
      accentBg: "bg-amber-500",
    },
  ], [result, selectedVoices]);

  const selectedJudge = judges.find((j) => j.role === selectedRole) ?? null;
  const selectedState = selectedRole ? judgeStates[selectedRole] : null;

  const handleStateChange = useCallback(
    (
      role: SpeakRole,
      cardState: CardState,
      error: string,
      handlers: {
        onPlay: (e: React.MouseEvent) => void;
        onTogglePause: (e: React.MouseEvent) => void;
        onStop: (e: React.MouseEvent) => void;
      },
    ) => {
      setJudgeStates((prev) => {
        const current = prev[role];
        if (
          current?.cardState === cardState &&
          current.error === error &&
          current.handlers.onPlay === handlers.onPlay &&
          current.handlers.onTogglePause === handlers.onTogglePause &&
          current.handlers.onStop === handlers.onStop
        ) {
          return prev;
        }
        return { ...prev, [role]: { cardState, error, handlers } };
      });
    },
    [],
  );

  const requestPlay = useCallback((role: string) => {
    generationRef.current += 1;
    const token = generationRef.current;
    for (const [otherRole, stop] of stopHandlersRef.current) {
      if (otherRole !== role) stop();
    }
    return token;
  }, []);

  const registerStopHandler = useCallback((role: string, stop: () => void) => {
    stopHandlersRef.current.set(role, stop);
  }, []);

  const unregisterStopHandler = useCallback((role: string) => {
    stopHandlersRef.current.delete(role);
  }, []);

  const getCachedUrl = useCallback((key: string) => audioCacheRef.current.get(key), []);
  const setCachedUrl = useCallback((key: string, url: string) => {
    audioCacheRef.current.set(key, url);
  }, []);

  const coordinator: PlaybackCoordinator = useMemo(() => ({
    requestPlay, registerStopHandler, unregisterStopHandler, getCachedUrl, setCachedUrl,
  }), [requestPlay, registerStopHandler, unregisterStopHandler, getCachedUrl, setCachedUrl]);

  useEffect(() => {
    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    void (async () => {
      for (const judge of judges) {
        if (controller.signal.aborted) return;
        const key = ttsCacheKey(judge.text, judge.voiceId, judge.role);
        if (audioCacheRef.current.has(key)) continue;
        try {
          const blob = await fetchSpeakAudio(judge.text, judge.voiceId, judge.role, controller.signal);
          if (controller.signal.aborted) return;
          audioCacheRef.current.set(key, URL.createObjectURL(blob));
        } catch { /* best-effort */ }
      }
    })();

    return () => {
      controller.abort();
      for (const url of audioCacheRef.current.values()) URL.revokeObjectURL(url);
      audioCacheRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <PlaybackContext.Provider value={coordinator}>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <SessionSummary metrics={metrics} strengths={strengths} improvements={improvements} />

        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Your Panel</h2>
            <p className="mt-1 text-sm text-gray-500">
              Press ▶ to hear a judge · tap 📖 to read their full notes
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#15161e] to-[#0f1016]">
            {/* Stage glow */}
            <div className="relative px-6 pt-8 pb-0">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-25"
                style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, #f59e0b33, transparent)" }}
                aria-hidden
              />

              <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
                {judges.map((judge) => (
                  <JudgeSeat
                    key={judge.role}
                    config={judge}
                    isBookOpen={selectedRole === judge.role}
                    onToggleBook={() =>
                      setSelectedRole((r) => (r === judge.role ? null : judge.role))
                    }
                    onStateChange={handleStateChange}
                  />
                ))}
              </div>
            </div>

            {/* Open book panel — full width below all three judges */}
            {selectedJudge && selectedState ? (
              <OpenBook
                judge={selectedJudge}
                cardState={selectedState.cardState}
                error={selectedState.error}
                onClose={() => setSelectedRole(null)}
                onPlay={selectedState.handlers.onPlay}
                onTogglePause={selectedState.handlers.onTogglePause}
                onStop={selectedState.handlers.onStop}
              />
            ) : (
              <p className="py-3 text-center text-[10px] uppercase tracking-[0.2em] text-gray-700">
                face the panel
              </p>
            )}
          </div>
        </section>

        <AnnotatedTranscript
          transcript={result.transcript}
          grammarianFeedback={result.grammarian}
          evaluatorFeedback={result.evaluator}
        />

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPracticeAgain}
            className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            Practice Again
          </button>
          <Link
            href="/speech-eval/history"
            className="rounded-xl border border-white/10 px-8 py-3 text-sm font-medium text-white transition-colors hover:border-amber-500/40 hover:bg-white/5"
          >
            See My History
          </Link>
        </div>

        {result.persisted ? (
          <p className="text-center text-xs text-emerald-400/90" role="status">
            Session saved to your account history.
          </p>
        ) : null}

        {result.warning ? (
          <p
            className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-center text-sm leading-relaxed text-gray-400"
            role="status"
          >
            {result.warning}
          </p>
        ) : null}
      </div>
    </PlaybackContext.Provider>
  );
}
