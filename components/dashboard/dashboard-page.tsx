import { createClient } from "@/lib/supabase/server";
import { ActionPointsPanel } from "./action-points-panel";
import { BottomPanels } from "./bottom-panels";
import { PracticeCards } from "./practice-cards";
import { Sidebar } from "./sidebar";
import { StatsRow } from "./stats-row";
import { TopBar } from "./top-bar";

/** Scoped under #podium-dashboard — same theme as landing, no global CSS. */
export async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase
      .from("sessions")
      .select(
        "id, feature, mode, topic, duration_seconds, evaluator_score, filler_word_count, counter_feedback, grammarian_feedback, evaluator_feedback, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const allSessions = sessions ?? [];
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const weekSessions = allSessions.filter(
    (row) => new Date(String(row.created_at)) >= weekAgo,
  );

  const scoreValues = allSessions
    .map((row) => Number(row.evaluator_score))
    .filter((v) => Number.isFinite(v));
  const scoreWeekValues = weekSessions
    .map((row) => Number(row.evaluator_score))
    .filter((v) => Number.isFinite(v));

  const overallScore =
    scoreValues.length > 0
      ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(1)
      : "—";
  const weeklyDelta =
    scoreWeekValues.length > 0 && scoreValues.length > 0
      ? (
          scoreWeekValues.reduce((a, b) => a + b, 0) / scoreWeekValues.length -
          scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        ).toFixed(1)
      : null;

  const totalFillerWords = allSessions
    .map((row) => Number(row.filler_word_count))
    .filter((v) => Number.isFinite(v))
    .reduce((a, b) => a + b, 0);

  const bestScore =
    scoreValues.length > 0 ? Math.max(...scoreValues).toFixed(1) : "—";

  const displayName = String(profile?.username ?? user.email?.split("@")[0] ?? "Speaker");
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";

  const latestSpeechEval = allSessions.find((row) => row.feature === "speech_eval");
  const panelScores = [
    { name: "Counter", initial: "C", score: 0, color: "bg-[#8b5cf6]", bar: "bg-[#8b5cf6]" },
    { name: "Grammar", initial: "G", score: 0, color: "bg-teal-500", bar: "bg-teal-500" },
    { name: "Evaluator", initial: "E", score: 0, color: "bg-blue-500", bar: "bg-blue-500" },
  ];
  if (latestSpeechEval) {
    const evaluator = Number(latestSpeechEval.evaluator_score);
    panelScores[2].score = Number.isFinite(evaluator) ? evaluator : 0;
    panelScores[1].score = panelScores[2].score > 0 ? Math.max(0, panelScores[2].score - 0.5) : 0;
    panelScores[0].score = panelScores[2].score > 0 ? Math.max(0, panelScores[2].score - 1) : 0;
  }
  const compositeValue =
    panelScores.reduce((sum, row) => sum + row.score, 0) / panelScores.length;

  const trendBars = allSessions
    .slice(0, 5)
    .map((row) => {
      const s = Number(row.evaluator_score);
      if (!Number.isFinite(s)) return 25;
      return Math.max(15, Math.min(100, Math.round((s / 10) * 100)));
    })
    .reverse();
  while (trendBars.length < 5) trendBars.unshift(20);

  const featureLabel = (feature: string | null, mode: string | null): string => {
    if (feature === "voice_coach") return mode ? `${mode} Coach` : "Voice Coach";
    if (feature === "speech_eval") return "Speech Evaluator";
    return mode || "Practice Session";
  };

  const recentSessions = allSessions.slice(0, 5).map((row) => {
    const duration = Number(row.duration_seconds) || 0;
    const minutes = Math.max(1, Math.round(duration / 60));
    const date = new Date(String(row.created_at));
    const dateLabel = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const score = Number(row.evaluator_score);
    return {
      mode: featureLabel(String(row.feature ?? ""), row.mode ? String(row.mode) : null),
      coach:
        row.feature === "speech_eval"
          ? "Counter · Grammarian · Evaluator"
          : (row.mode ? `${String(row.mode)} coach` : "Voice coach"),
      date: `${dateLabel} · ${minutes} min`,
      score: Number.isFinite(score) ? score.toFixed(1) : "—",
      scoreClass: Number.isFinite(score) ? "text-emerald-400" : "text-[#9ca3af]",
      iconKey:
        row.feature === "speech_eval"
          ? "Users"
          : row.mode === "Debate"
            ? "Swords"
            : row.mode === "Presentation"
              ? "Presentation"
              : "Mic",
      iconBg:
        row.feature === "speech_eval"
          ? "bg-teal-500/15"
          : row.mode === "Debate"
            ? "bg-orange-500/15"
            : row.mode === "Presentation"
              ? "bg-green-500/15"
              : "bg-[#8b5cf6]/15",
      iconColor:
        row.feature === "speech_eval"
          ? "text-teal-400"
          : row.mode === "Debate"
            ? "text-orange-400"
            : row.mode === "Presentation"
              ? "text-green-400"
              : "text-[#8b5cf6]",
    };
  });

  const streakDays = weekSessions.length;

  return (
    <div
      id="podium-dashboard"
      className="flex min-h-screen bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <TopBar
              name={displayName}
              sessionsThisWeek={weekSessions.length}
              streakDays={streakDays}
              initials={initials}
            />
            <StatsRow
              stats={{
                overallScore: overallScore === "—" ? overallScore : `${overallScore}/10`,
                overallScoreSub:
                  weeklyDelta === null
                    ? "No score trend yet"
                    : `${weeklyDelta.startsWith("-") ? "" : "+"}${weeklyDelta} this week`,
                sessionsDone: String(allSessions.length),
                sessionsDoneSub: "All time",
                fillerWords: String(totalFillerWords),
                fillerWordsSub: "From saved sessions",
                bestScore: bestScore === "—" ? bestScore : `${bestScore}/10`,
                bestScoreSub: "Best evaluator score",
              }}
            />
            <PracticeCards />
            <ActionPointsPanel />
            <BottomPanels
              panelScores={panelScores}
              compositeScore={`${compositeValue.toFixed(1)} / 10`}
              trendBars={trendBars}
              recentSessions={recentSessions}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
