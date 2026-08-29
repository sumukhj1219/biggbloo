const SEARCH_ENDPOINT = "https://itunes.apple.com/search";

export const findPreviewUrl = async (artist: string, title: string): Promise<string | null> => {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("term", `${artist} ${title}`);
  url.searchParams.set("media", "music");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  return data?.results?.[0]?.previewUrl ?? null;
};
