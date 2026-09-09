import { COURSES, TERM_END, TERM_START } from "./config";
import { STATIC_SCHEDULE } from "./staticSchedule";
import type { PlannerItem } from "./types";
import seedAssignments from "@/data/seed-assignments.json";

interface CanvasSubmission {
  workflow_state?: string | null;
  score?: number | null;
  grade?: string | null;
  submitted_at?: string | null;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  points_possible?: number | null;
  html_url?: string | null;
  published?: boolean;
  grading_type?: string | null;
  submission?: CanvasSubmission | null;
}

function statusOf(a: CanvasAssignment): PlannerItem["status"] {
  if (a.grading_type === "not_graded") return "not_graded";
  const state = a.submission?.workflow_state;
  if (state === "graded" || a.submission?.score != null || a.submission?.grade != null) return "graded";
  if (state === "submitted" || a.submission?.submitted_at) return "submitted";
  return "unsubmitted";
}

export function isStaleCanvasItem(title: string, dueAt: string | null): boolean {
  const lower = title.toLowerCase();
  if (lower.includes("fall 2024") || lower.includes("fall 2025")) return true;
  if (!dueAt) return false;
  const due = new Date(dueAt);
  return due < TERM_START || due > TERM_END;
}

export function normalizeCanvasAssignments(courseId: PlannerItem["courseId"], rows: CanvasAssignment[]): PlannerItem[] {
  const course = COURSES[courseId].short;
  return rows.filter((row) => row.published !== false).map((row) => ({
    id: `canvas-${courseId}-${row.id}`,
    courseId,
    course,
    title: row.name.trim(),
    dueAt: row.due_at,
    pointsPossible: row.points_possible ?? null,
    status: statusOf(row),
    source: "canvas",
    url: row.html_url ?? null,
    stale: isStaleCanvasItem(row.name, row.due_at),
    kind: "assignment",
  }));
}

export function seedItems(): PlannerItem[] {
  const rows = seedAssignments as Array<{
    courseId: PlannerItem["courseId"];
    assignmentId: number;
    name: string;
    dueAt: string | null;
    pointsPossible: number | null;
    gradingType: string | null;
    htmlUrl: string | null;
    status: PlannerItem["status"];
  }>;

  const canvas: PlannerItem[] = rows.map((row) => ({
    id: `seed-${row.courseId}-${row.assignmentId}`,
    courseId: row.courseId,
    course: COURSES[row.courseId].short,
    title: row.name,
    dueAt: row.dueAt,
    pointsPossible: row.pointsPossible,
    status: row.status,
    source: "canvas",
    url: row.htmlUrl,
    stale: isStaleCanvasItem(row.name, row.dueAt),
    kind: "assignment",
  }));

  return mergeWithStaticSchedule(canvas);
}

function tokens(text: string) {
  const normalized = text.toLowerCase().replace(/\bfirst\b/g, "1").replace(/\btwo\b/g, "2").replace(/\bthree\b/g, "3").replace(/[^a-z0-9]+/g, " ");
  const stop = new Set(["the", "to", "from", "post", "answer", "answers", "case", "and", "or", "of", "a", "an"]);
  return new Set(normalized.split(/\s+/).filter((t) => t && !stop.has(t)));
}

function likelySameItem(a: PlannerItem, b: PlannerItem) {
  if (a.courseId !== b.courseId || !a.dueAt || !b.dueAt) return false;
  if (Math.abs(new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) > 15 * 60 * 1000) return false;
  const aa = tokens(a.title), bb = tokens(b.title);
  const overlap = [...aa].filter((t) => bb.has(t)).length;
  return overlap / Math.max(1, Math.min(aa.size, bb.size)) >= 0.55;
}

export function mergeWithStaticSchedule(canvasItems: PlannerItem[]): PlannerItem[] {
  const validCanvas = canvasItems.filter((item) => !item.stale && item.dueAt);
  const staticItems = STATIC_SCHEDULE.filter((item) => !validCanvas.some((canvas) => likelySameItem(canvas, item)));
  return [...canvasItems, ...staticItems];
}

export function warningsFor(items: PlannerItem[]): string[] {
  const warnings: string[] = [];
  const stale = items.filter((i) => i.source === "canvas" && i.stale);
  if (stale.length) warnings.push(`${stale.length} Canvas item${stale.length === 1 ? "" : "s"} look outdated or outside Fall 2026 and were removed from Upcoming.`);
  if (stale.some((i) => i.courseId === 71068 && /quiz #?3|final exam/i.test(i.title))) warnings.push("IT 400 has stale 2025 Canvas dates for Quiz 3 / Final Exam; Fall 2026 syllabus dates are being used instead.");
  return warnings;
}
