import { NextResponse } from "next/server";
import { getNowPlaying } from "@/lib/lastfm";
import { findPreviewUrl } from "@/lib/itunes";

export async function GET() {
  try {
    const track = await getNowPlaying();
    if (!track) {
      return NextResponse.json({ isPlaying: false, track: null });
    }

    let previewUrl: string | null = null;
    try {
      previewUrl = await findPreviewUrl(track.artist, track.title);
    } catch {
      previewUrl = null;
    }

    return NextResponse.json({
      isPlaying: track.isPlaying,
      track: { ...track, previewUrl },
    });
  } catch {
    return NextResponse.json(
      { isPlaying: false, track: null, error: "Failed to fetch now-playing data" },
      { status: 200 }
    );
  }
}
