import { NextResponse, type NextRequest } from "next/server";
import { getCronEnv } from "@/lib/env";
import { runDailyScan } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { CRON_SECRET } = getCronEnv();
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyScan();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Daily scan failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
