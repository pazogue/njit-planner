import { COURSE_IDS } from "./config";
import { mergeWithStaticSchedule, normalizeCanvasAssignments, seedItems, warningsFor } from "./normalize";
import type { CanvasAssignment } from "./normalize";
import type { DashboardPayload, PlannerItem } from "./types";

async function fetchAssignments(courseId: PlannerItem["courseId"], baseUrl: string, token: string): Promise<CanvasAssignment[]> {
  const url = new URL(`/api/v1/courses/${courseId}/assignments`, baseUrl);
  url.searchParams.set("per_page", "100");
  url.searchParams.append("include[]", "submission");
  url.searchParams.set("order_by", "due_at");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Canvas ${courseId}: ${response.status} ${response.statusText}`);
  return response.json();
}

export async function getDashboard(): Promise<DashboardPayload> {
  const baseUrl = process.env.CANVAS_BASE_URL || "https://njit.instructure.com";
  const token = process.env.CANVAS_ACCESS_TOKEN;

  if (!token) {
    const fallback = seedItems();
    return {
      connected: false,
      source: "seed",
      fetchedAt: new Date().toISOString(),
      items: fallback,
      warnings: ["Canvas is in preview mode. Add CANVAS_ACCESS_TOKEN on the server to turn on live sync.", ...warningsFor(fallback)],
    };
  }

  try {
    const results = await Promise.allSettled(COURSE_IDS.map((id) => fetchAssignments(id, baseUrl, token)));
    const items: PlannerItem[] = [];
    const warnings: string[] = [];

    results.forEach((result, index) => {
      const courseId = COURSE_IDS[index];
      if (result.status === "fulfilled") items.push(...normalizeCanvasAssignments(courseId, result.value));
      else warnings.push(`Could not sync ${courseId}: ${result.reason instanceof Error ? result.reason.message : "unknown error"}`);
    });

    if (!items.length) throw new Error("Canvas returned no assignment data.");
    const merged = mergeWithStaticSchedule(items);
    warnings.push(...warningsFor(merged));
    return { connected: true, source: "live", fetchedAt: new Date().toISOString(), items: merged, warnings };
  } catch (error) {
    const fallback = seedItems();
    return {
      connected: false,
      source: "seed",
      fetchedAt: new Date().toISOString(),
      items: fallback,
      warnings: [`Live Canvas sync failed; showing the imported snapshot instead. ${error instanceof Error ? error.message : ""}`.trim(), ...warningsFor(fallback)],
    };
  }
}
