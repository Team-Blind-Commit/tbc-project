import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, topic, duration_seconds, transcript, counter_feedback, grammarian_feedback, evaluator_feedback, created_at",
      )
      .eq("user_id", user.id)
      .eq("feature", "speech_eval")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[speech-eval/history] read failed:", error.message);
      return NextResponse.json({ sessions: [] });
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    console.error("[speech-eval/history] error:", error);
    return NextResponse.json({ sessions: [] });
  }
}
