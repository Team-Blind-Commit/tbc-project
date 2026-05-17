"use client";

import { annotateTranscript } from "@/lib/transcript-annotate";
import type { TranscriptSpanType } from "@/lib/transcript-annotate";

const SPAN_CLASS: Record<TranscriptSpanType, string> = {
  plain: "",
  filler: "rounded bg-orange-500/40 px-0.5 text-white",
  grammar:
    "underline decoration-red-500 decoration-2 underline-offset-2 text-white",
  strong: "rounded bg-teal-500/30 px-0.5 text-white",
};

interface AnnotatedTranscriptProps {
  transcript: string;
  grammarianFeedback: string;
  evaluatorFeedback: string;
}

export function AnnotatedTranscript({
  transcript,
  grammarianFeedback,
  evaluatorFeedback,
}: AnnotatedTranscriptProps) {
  const spans = annotateTranscript(
    transcript,
    grammarianFeedback,
    evaluatorFeedback,
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white">Annotated Transcript</h3>
      <p className="rounded-xl border border-white/[0.06] bg-[#0f1016] p-5 text-sm leading-relaxed text-[#a1a1aa]">
        {spans.map((span, i) =>
          span.type === "plain" ? (
            <span key={i}>{span.text}</span>
          ) : (
            <span key={i} className={SPAN_CLASS[span.type]}>
              {span.text}
            </span>
          ),
        )}
      </p>
      <div className="flex flex-wrap gap-6 text-xs text-[#71717a]">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-red-500" />
          Grammar issues
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Filler words
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          Strong phrases
        </span>
      </div>
    </div>
  );
}
