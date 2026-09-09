export type CourseId = 73232 | 70275 | 71068 | 72097 | 71836;

export type SourceType = "canvas" | "syllabus" | "live-schedule" | "personal";
export type PlannerStatus = "unsubmitted" | "submitted" | "graded" | "not_graded" | "complete";

export interface PlannerItem {
  id: string;
  courseId: CourseId;
  course: string;
  title: string;
  dueAt: string | null;
  pointsPossible?: number | null;
  status: PlannerStatus;
  source: SourceType;
  url?: string | null;
  stale?: boolean;
  kind: "assignment" | "event" | "task";
  detail?: string;
}

export interface DashboardPayload {
  connected: boolean;
  source: "live" | "seed";
  fetchedAt: string;
  items: PlannerItem[];
  warnings: string[];
}
