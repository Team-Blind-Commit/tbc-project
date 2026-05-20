"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

interface TaskItem {
  id: string;
  task: string;
  mode: string | null;
  created_at: string;
}

export function ActionPointsPanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/voice-coach/tasks");
        if (!res.ok) {
          throw new Error("Failed to load tasks");
        }
        const data = (await res.json()) as { tasks: TaskItem[] };
        if (!cancelled) {
          setTasks(data.tasks);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load homework tasks.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markComplete(taskId: string) {
    const res = await fetch("/api/voice-coach/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ task_id: taskId, completed: true }),
    });

    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  }

  return (
    <article className="rounded-xl border border-white/[0.06] bg-[#1a1a24] p-6">
      <h3 className="font-semibold text-white">Homework from your coach</h3>
      <p className="mt-1 text-sm text-[#9ca3af]">
        Complete these before your next session — your coach will follow up.
      </p>

      {loading && (
        <p className="mt-5 text-sm text-[#6b7280]">Loading tasks…</p>
      )}

      {error && (
        <p className="mt-5 text-sm text-red-300">{error}</p>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p className="mt-5 text-sm text-[#6b7280]">
          No open tasks. Finish a voice session to get personalized homework.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-[#0f1016] px-4 py-3"
          >
            <button
              type="button"
              onClick={() => markComplete(task.id)}
              className="mt-0.5 shrink-0 text-[#6b7280] transition-colors hover:text-emerald-400"
              aria-label="Mark task complete"
            >
              <Circle className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              {task.mode && (
                <p className="text-xs font-medium text-[#8b5cf6]">{task.mode}</p>
              )}
              <p className="text-sm text-[#d4d4d8]">{task.task}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-transparent" aria-hidden />
          </li>
        ))}
      </ul>
    </article>
  );
}
