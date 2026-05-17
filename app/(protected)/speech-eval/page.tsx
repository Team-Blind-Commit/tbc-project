"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TopicSetup } from "./components/TopicSetup";
import { Recorder } from "./components/Recorder";
import { FeedbackCards } from "./components/FeedbackCards";
import type { AnalysisResult, SelectedVoices } from "@/lib/speech-eval";
import { DEFAULT_VOICES } from "@/lib/speech-eval";
import { saveLocalSession } from "@/lib/speech-eval-history";
import {
  clearLastFeedback,
  loadLastFeedback,
  saveLastFeedback,
} from "@/lib/speech-eval-last-feedback";

type Stage = "setup" | "recording" | "feedback";

export default function SpeechEvalPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedVoices, setSelectedVoices] =
    useState<SelectedVoices>(DEFAULT_VOICES);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") return;
    const last = loadLastFeedback();
    if (!last) return;
    setTopic(last.topic);
    setResult(last.result);
    setSelectedVoices(last.selectedVoices);
    setStage("feedback");
  }, []);

  function handleTopicConfirmed(confirmedTopic: string) {
    setTopic(confirmedTopic);
    setStage("recording");
  }

  function handleAnalysisComplete(
    analysis: AnalysisResult,
    voices: SelectedVoices,
    durationSeconds: number,
  ) {
    if (!analysis.persisted) {
      saveLocalSession(topic, analysis, durationSeconds);
    }
    saveLastFeedback(topic, analysis, voices);
    setResult(analysis);
    setSelectedVoices(voices);
    setStage("feedback");
  }

  function handlePracticeAgain() {
    clearLastFeedback();
    setStage("setup");
    setResult(null);
    setTopic("");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-[family-name:var(--font-geist-sans)] text-white">
      <header className="border-b border-white/10 px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-teal-400/90">
              Face The Panel
            </p>
            <h1 className="text-2xl font-bold text-white">Speech Evaluator</h1>
          </div>
          <nav className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-amber-400"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-400">Face The Panel</span>
          </nav>
        </div>
      </header>

      <main className="px-4 py-10 sm:px-8 sm:py-14">
        {stage === "setup" && (
          <TopicSetup onTopicConfirmed={handleTopicConfirmed} />
        )}
        {stage === "recording" && (
          <Recorder
            topic={topic}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}
        {stage === "feedback" && result && (
          <FeedbackCards
            result={result}
            selectedVoices={selectedVoices}
            onPracticeAgain={handlePracticeAgain}
          />
        )}
      </main>
    </div>
  );
}
