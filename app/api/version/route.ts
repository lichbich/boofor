import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || String(Date.now());
  return NextResponse.json(
    {
      buildId: Number(buildId) || Date.now(),
      version: "1.0.5",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
