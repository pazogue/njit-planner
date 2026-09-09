import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/canvas";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getDashboard();
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
