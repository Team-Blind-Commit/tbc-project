"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Loader2, Play, RotateCcw } from "lucide-react";
import type { AnalysisResult, SelectedVoices } from "@/lib/speech-eval";

type CardState = "idle" | "loading-audio" | "playing" | "done";

interface FeedbackCardsProps {
  result: AnalysisResult;
  selectedVoices: SelectedVoices;
}

interface CardConfig {
  role: string;
  icon: string;
  name: string;
  text: string;
  voiceId: string;
}

interface PlaybackCoordinator {
  requestPlay: (role: string) => number;
  registerStopHandler: (role: string, stop: () => void) => void;
  unregisterStopHandler: (role: string) => void;
}

const PlaybackContext = createContext<PlaybackCoordinator | null>(null);

function usePlaybackCoordinator(): PlaybackCoordinator {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("FeedbackCard must be used within FeedbackCards");
  }
  return ctx;
}

function SoundWaveBars() {
  const heights = ["h-4", "h-8", "h-6", "h-10", "h-5"];
  return (
    <div className="flex items-end justify-center gap-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full bg-amber-400 animate-pulse ${h}`}
        />
      ))}
    </div>
  );
}

function FeedbackCard({ config }: { config: CardConfig }) {
  const coordinator = usePlaybackCoordinator();
  const [cardState, setCardState] = useState<CardState>("idle");
  const [textOpen, setTextOpen] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playTokenRef = useRef(0);
  const hasCompletedRef = useRef(false);

  const cleanupAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    cleanupAudio();
    playTokenRef.current = 0;
    setError("");
    setCardState((prev) => {
      if (prev === "playing" || prev === "loading-audio") {
        return hasCompletedRef.current ? "done" : "idle";
      }
      return prev;
    });
  }, [cleanupAudio]);

  useEffect(() => {
    coordinator.registerStopHandler(config.role, stopPlayback);
    return () => {
      coordinator.unregisterStopHandler(config.role);
      cleanupAudio();
    };
  }, [config.role, coordinator, stopPlayback, cleanupAudio]);

  async function playFeedback() {
    setError("");
    cleanupAudio();

    const token = coordinator.requestPlay(config.role);
    playTokenRef.current = token;
    setCardState("loading-audio");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: config.text, voiceId: config.voiceId }),
        signal: controller.signal,
      });

      if (playTokenRef.current !== token) return;

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not load audio feedback");
      }

      const blob = await res.blob();
      if (playTokenRef.current !== token) return;

      const url = URL.createObjectURL(blob);
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
      if (playTokenRef.current !== token) {
        audio.pause();
        return;
      }
      setCardState("playing");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (playTokenRef.current !== token) return;
      setError("Could not play feedback");
      setCardState(hasCompletedRef.current ? "done" : "idle");
    }
  }

  const isActive = cardState === "loading-audio" || cardState === "playing";

  return (
    <article
      className={`flex min-h-[280px] flex-col rounded-xl border bg-[#1a1a24] p-6 transition-colors duration-300 ${
        isActive
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : "border-white/10"
      }`}
    >
      <div className="text-center">
        <span className="text-2xl" aria-hidden>
          {config.icon}
        </span>
        <p className="mt-2 text-xs uppercase tracking-wider text-gray-500">
          {config.role}
        </p>
        <p className="mt-0.5 font-semibold text-white">{config.name}</p>
      </div>

      <div className="mt-auto flex flex-1 flex-col items-center justify-center gap-3 py-6">
        {cardState === "idle" && (
          <>
            <button
              type="button"
              onClick={playFeedback}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-black transition-transform hover:scale-105"
              aria-label={`Play ${config.name} feedback`}
            >
              <Play className="h-7 w-7 fill-current" />
            </button>
            <p className="text-xs text-gray-500">Tap to hear feedback</p>
          </>
        )}

        {cardState === "loading-audio" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <p className="text-sm text-gray-400">Getting voice ready...</p>
          </>
        )}

        {cardState === "playing" && (
          <>
            <SoundWaveBars />
            <p className="text-sm font-medium text-amber-400">Speaking...</p>
          </>
        )}

        {cardState === "done" && (
          <>
            <button
              type="button"
              onClick={playFeedback}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-amber-500/40 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Replay
            </button>
            <p className="text-xs text-gray-500">Feedback delivered</p>
          </>
        )}

        {error ? (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setTextOpen((o) => !o)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-amber-400"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {textOpen ? "Hide written feedback" : "Read feedback"}
        </button>

        {textOpen ? (
          <div className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
            <p className="text-sm leading-relaxed text-gray-300">
              {config.text}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function FeedbackCards({ result, selectedVoices }: FeedbackCardsProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const generationRef = useRef(0);
  const stopHandlersRef = useRef<Map<string, () => void>>(new Map());

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

  const coordinator: PlaybackCoordinator = {
    requestPlay,
    registerStopHandler,
    unregisterStopHandler,
  };

  const cards: CardConfig[] = [
    {
      role: "Counter",
      icon: "🔢",
      name: "Rex",
      text: result.counter,
      voiceId: selectedVoices.counter,
    },
    {
      role: "Grammarian",
      icon: "✍️",
      name: "Clara",
      text: result.grammarian,
      voiceId: selectedVoices.grammarian,
    },
    {
      role: "Evaluator",
      icon: "🎯",
      name: "Marcus",
      text: result.evaluator,
      voiceId: selectedVoices.evaluator,
    },
  ];

  return (
    <PlaybackContext.Provider value={coordinator}>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <FeedbackCard key={card.role} config={card} />
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setTranscriptOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            <span>📄 View Transcript</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${transcriptOpen ? "rotate-180" : ""}`}
            />
          </button>
          {transcriptOpen ? (
            <div className="max-h-48 overflow-y-auto border-t border-white/5 px-5 py-4 font-mono text-sm leading-relaxed text-gray-400">
              {result.transcript}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
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
      </div>
    </PlaybackContext.Provider>
  );
}
