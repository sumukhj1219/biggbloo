const API_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

interface LastFmImage {
  size: string;
  "#text": string;
}

interface LastFmTrack {
  name: string;
  artist: { "#text": string };
  album: { "#text": string };
  image: LastFmImage[];
  url: string;
  "@attr"?: { nowplaying?: string };
}

export interface NowPlayingTrack {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string | null;
  songUrl: string;
  previewUrl?: string | null;
}

export const getNowPlaying = async (): Promise<NowPlayingTrack | null> => {
  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_USERNAME;

  if (!apiKey || !username) {
    throw new Error("Missing Last.fm credentials in environment variables");
  }

  const url = new URL(API_ENDPOINT);
  url.searchParams.set("method", "user.getrecenttracks");
  url.searchParams.set("user", username);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch Last.fm recent tracks: ${res.status}`);
  }

  const data = await res.json();
  const track: LastFmTrack | undefined = data?.recenttracks?.track?.[0];
  if (!track) return null;

  const image = track.image?.find((img) => img.size === "extralarge")?.["#text"] || null;

  return {
    isPlaying: track["@attr"]?.nowplaying === "true",
    title: track.name,
    artist: track.artist["#text"],
    album: track.album["#text"],
    albumImageUrl: image || null,
    songUrl: track.url,
  };
};
