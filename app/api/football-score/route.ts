import { NextResponse } from "next/server";
import { getFeaturedMatch, MissingFootballApiKeyError } from "@/lib/football";

export async function GET() {
  try {
    const match = await getFeaturedMatch();
    return NextResponse.json({ match });
  } catch (err) {
    if (err instanceof MissingFootballApiKeyError) {
      return NextResponse.json({ match: null, reason: "missing-key" }, { status: 200 });
    }
    return NextResponse.json({ match: null, reason: "fetch-failed" }, { status: 200 });
  }
}
