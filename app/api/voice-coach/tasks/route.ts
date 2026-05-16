import { NextRequest, NextResponse } from "next/server";
import { fetchOpenHomework } from "@/lib/build-coach-memory";
import { getUserNameFromHeader } from "@/lib/user-name";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const userName = getUserNameFromHeader(request);

    if (!userName) {
      return NextResponse.json(
        { error: "user_name is required (x-user-name header)" },
        { status: 400 },
      );
    }

    const tasks = await fetchOpenHomework(userName);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[voice-coach/tasks] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userName = getUserNameFromHeader(request);
    const body = (await request.json()) as {
      task_id?: string;
      completed?: boolean;
    };

    if (!userName) {
      return NextResponse.json(
        { error: "user_name is required (x-user-name header)" },
        { status: 400 },
      );
    }

    const taskId = body.task_id?.trim();
    if (!taskId) {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }

    if (
      typeof body.completed !== "undefined" &&
      typeof body.completed !== "boolean"
    ) {
      return NextResponse.json(
        { error: "completed must be a boolean when provided" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 },
      );
    }

    const { data, error } = await supabase
      .from("action_points")
      .update({
        completed: body.completed ?? true,
        completed_at: body.completed !== false ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .eq("user_name", userName)
      .select("id")
      .limit(1);

    if (error) {
      console.error("[voice-coach/tasks] patch:", error.message);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[voice-coach/tasks] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
