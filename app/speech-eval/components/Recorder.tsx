"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import type { AnalysisResult, SelectedVoices } from "@/lib/speech-eval";
import {
  COUNTER_VOICES,
  DEFAULT_VOICES,
  EVALUATOR_VOICES,
  GRAMMARIAN_VOICES,
} from "@/lib/speech-eval";

type RecorderState = "idle" | "recording" | "analyzing" | "done";

interface RecorderProps {
  topic: string;
  onAnalysisComplete: (
    result: AnalysisResult,
    voices: SelectedVoices,
    durationSeconds: number,
  ) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function WaveformBars({ count = 5 }: { count?: number }) {
  const heights = ["h-3", "h-6", "h-8", "h-5", "h-7"];
  return (
    <div className="flex items-end justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full bg-amber-500/80 animate-pulse ${heights[i % heights.length]}`}
        />
      ))}
    </div>
  );
}

export function Recorder({ topic, onAnalysisComplete }: RecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [voices, setVoices] = useState<SelectedVoices>(DEFAULT_VOICES);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupStream();
    };
  }, [stopTimer, cleanupStream]);

  async function startRecording() {
    setError("");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await analyzeRecording(blob);
      };

      recorder.start();
      setState("recording");
      setElapsed(0);
      elapsedRef.current = 0;

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow mic access and try again.");
    }
  }

  async function analyzeRecording(blob: Blob) {
    setState("analyzing");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("topic", topic);
      formData.append("duration_seconds", String(elapsedRef.current));

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json()) as {
          error?: string;
          code?: string;
        };
        throw new Error(data.error ?? "Analysis failed");
      }

      const result = (await res.json()) as AnalysisResult;
      setState("done");
      onAnalysisComplete(result, voices, elapsedRef.current);
    } catch (err) {
      setState("idle");
      setError(
        err instanceof Error ? err.message : "Could not analyze your speech",
      );
    }
  }

  function stopRecording() {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-center">
        <p className="text-xs uppercase tracking-wider text-amber-500/80">
          Your Topic
        </p>
        <p className="mt-1 text-lg font-semibold text-white">{topic}</p>
      </div>

      {state === "idle" && (
        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-medium text-gray-300">
              Choose your evaluator voices:
            </p>

            <label className="block space-y-1.5">
              <span className="text-xs text-gray-500">Counter (Rex)</span>
              <select
                value={voices.counter}
                onChange={(e) =>
                  setVoices((v) => ({ ...v, counter: e.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              >
                {COUNTER_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-gray-500">Grammarian (Clara)</span>
              <select
                value={voices.grammarian}
                onChange={(e) =>
                  setVoices((v) => ({ ...v, grammarian: e.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              >
                {GRAMMARIAN_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-gray-500">Evaluator (Marcus)</span>
              <select
                value={voices.evaluator}
                onChange={(e) =>
                  setVoices((v) => ({ ...v, evaluator: e.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              >
                {EVALUATOR_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={startRecording}
            className="group flex w-full flex-col items-center gap-4"
          >
            <div className="relative flex h-36 w-36 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-amber-500/10" />
              <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-500/40 transition-transform group-hover:scale-105">
                <Mic className="h-12 w-12 text-amber-400" />
              </span>
            </div>
            <span className="text-sm font-medium text-gray-300">
              Click to Start Recording
            </span>
          </button>
        </div>
      )}

      {state === "recording" && (
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
            <span className="absolute inset-0 animate-pulse rounded-full ring-4 ring-red-500/50" />
            <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-red-500/20">
              <Mic className="h-12 w-12 text-red-400" />
            </span>
          </div>

          <p className="font-mono text-3xl font-bold tabular-nums text-white">
            {formatTime(elapsed)}
          </p>

          <button
            type="button"
            onClick={stopRecording}
            className="rounded-xl bg-red-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-400"
          >
            Stop &amp; Analyze
          </button>
        </div>
      )}

      {state === "analyzing" && (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/5 ring-2 ring-amber-500/30">
              <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
            </span>
          </div>
          <p className="text-center text-lg font-medium text-white">
            Our experts are reviewing your speech...
          </p>
          <WaveformBars />
        </div>
      )}

      {error ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
