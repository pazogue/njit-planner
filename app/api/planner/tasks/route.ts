import { NextRequest, NextResponse } from "next/server";

const FUNCTION_URL = "https://ozzvsaajhmncusbzejav.supabase.co/functions/v1/planner-data";

async function callPlanner(action: string, body: Record<string, unknown> = {}) {
  const token = process.env.CANVAS_ACCESS_TOKEN;
  if (!token) throw new Error("Canvas token is not configured");

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-canvas-token": token,
    },
    body: JSON.stringify({ action, ...body }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Planner storage failed (${response.status})`);
  return data;
}

function toPlannerItem(row: any) {
  return {
    id: row.client_ref || `db-${row.id}`,
    courseId: Number(row.course_id),
    course: row.course,
    title: row.title,
    dueAt: row.due_at,
    status: row.status,
    source: "personal" as const,
    kind: "task" as const,
    detail: row.detail || undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    actualMinutes: row.actual_minutes ?? undefined,
    databaseId: row.id,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const data = await callPlanner("list");
    return NextResponse.json({ tasks: (data.tasks || []).map(toPlannerItem), connected: true });
  } catch (error) {
    return NextResponse.json({ tasks: [], connected: false, error: error instanceof Error ? error.message : "Planner storage unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const task = await request.json();
    const data = await callPlanner("upsert", {
      task: {
        clientRef: task.id,
        courseId: task.courseId,
        course: task.course,
        title: task.title,
        dueAt: task.dueAt,
        status: task.status,
        detail: task.detail,
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes,
      },
    });
    return NextResponse.json({ task: toPlannerItem(data.task), saved: true });
  } catch (error) {
    return NextResponse.json({ saved: false, error: error instanceof Error ? error.message : "Could not save task" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json();
    const data = await callPlanner("toggle", { id });
    return NextResponse.json({ task: toPlannerItem(data.task), saved: true });
  } catch (error) {
    return NextResponse.json({ saved: false, error: error instanceof Error ? error.message : "Could not update task" }, { status: 400 });
  }
}