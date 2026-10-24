import { NextResponse } from "next/server";
import { getXProfile } from "@/lib/x";

export const revalidate = 3600;

export async function GET() {
  try {
    return NextResponse.json(await getXProfile("biggbloo"));
  } catch {
    return NextResponse.json({ error: "Failed to fetch X profile" }, { status: 502 });
  }
}
