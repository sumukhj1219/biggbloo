const API_ENDPOINT = "https://api.football-data.org/v4/matches";

interface FootballDataTeam {
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  stage: string;
  matchday: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  competition: { name: string };
}

export interface FeaturedMatch {
  id: number;
  isLive: boolean;
  status: FootballDataMatch["status"];
  utcDate: string;
  competition: string;
  stage: string;
  homeTeam: { name: string; shortName: string; tla: string; crest: string | null };
  awayTeam: { name: string; shortName: string; tla: string; crest: string | null };
  homeScore: number;
  awayScore: number;
}

const toFeaturedMatch = (match: FootballDataMatch): FeaturedMatch => ({
  id: match.id,
  isLive: match.status === "IN_PLAY" || match.status === "PAUSED",
  status: match.status,
  utcDate: match.utcDate,
  competition: match.competition.name,
  stage: match.stage.replaceAll("_", " "),
  homeTeam: {
    name: match.homeTeam.name,
    shortName: match.homeTeam.shortName ?? match.homeTeam.name,
    tla: match.homeTeam.tla ?? match.homeTeam.name.slice(0, 3).toUpperCase(),
    crest: match.homeTeam.crest,
  },
  awayTeam: {
    name: match.awayTeam.name,
    shortName: match.awayTeam.shortName ?? match.awayTeam.name,
    tla: match.awayTeam.tla ?? match.awayTeam.name.slice(0, 3).toUpperCase(),
    crest: match.awayTeam.crest,
  },
  homeScore: match.score.fullTime.home ?? 0,
  awayScore: match.score.fullTime.away ?? 0,
});

const fetchMatches = async (apiKey: string, params: Record<string, string>): Promise<FootballDataMatch[]> => {
  const url = new URL(API_ENDPOINT);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 20 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org request failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.matches ?? [];
};

export class MissingFootballApiKeyError extends Error {}

export const getFeaturedMatch = async (): Promise<FeaturedMatch | null> => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new MissingFootballApiKeyError("Missing football-data.org API key in environment variables");
  }

  const live = await fetchMatches(apiKey, { status: "LIVE" });
  if (live.length > 0) {
    return toFeaturedMatch(live[0]);
  }

  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - 3 * 24 * 60 * 60 * 1000);
  const finished = await fetchMatches(apiKey, {
    status: "FINISHED",
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
  });

  if (finished.length === 0) return null;

  const mostRecent = [...finished].sort(
    (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
  )[0];

  return toFeaturedMatch(mostRecent);
};
