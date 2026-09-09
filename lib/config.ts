import type { CourseId } from "./types";

export const TERM_START = new Date("2026-09-01T00:00:00-04:00");
export const TERM_END = new Date("2026-12-31T23:59:59-05:00");

export const COURSES: Record<CourseId, { short: string; name: string; color: string }> = {
  73232: { short: "IT 491", name: "IT Capstone Project", color: "#8b5cf6" },
  70275: { short: "HSS 404", name: "History Seminar", color: "#14b8a6" },
  71068: { short: "IT 400", name: "Information Technology and the Law", color: "#3b82f6" },
  72097: { short: "PHIL 334", name: "Engineering Ethics", color: "#f59e0b" },
  71836: { short: "YWCC 307", name: "Professional Development in Computing", color: "#ec4899" },
};

export const COURSE_IDS = Object.keys(COURSES).map(Number) as CourseId[];
