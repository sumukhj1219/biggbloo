const API_ENDPOINT = "https://api.fxtwitter.com/";

export interface XProfile {
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
}

interface FxUser {
  screen_name: string;
  name: string;
  description: string;
  avatar_url?: string;
  banner_url?: string;
  followers: number;
  following: number;
  tweets: number;
  verification?: { verified?: boolean };
}

export const getXProfile = async (handle: string): Promise<XProfile> => {
  const res = await fetch(`${API_ENDPOINT}${handle}`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch X profile: ${res.status}`);
  }

  const user: FxUser | undefined = (await res.json())?.user;
  if (!user) throw new Error("X profile missing from response");

  return {
    name: user.name,
    handle: user.screen_name,
    bio: user.description.replace(/^•\s*/, "").replace(/https?:\/\//g, ""),
    avatarUrl: user.avatar_url?.replace("_normal.", "_400x400.") ?? null,
    bannerUrl: user.banner_url ? `${user.banner_url}/600x200` : null,
    followers: user.followers,
    following: user.following,
    posts: user.tweets,
    verified: user.verification?.verified ?? false,
  };
};
