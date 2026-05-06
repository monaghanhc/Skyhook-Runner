export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_TABLE = (import.meta.env.VITE_LEADERBOARD_TABLE as string | undefined) ?? "leaderboard_scores";

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY ?? "",
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  if (!isConfigured()) return [];
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=id,username,score,created_at&order=score.desc,created_at.asc&limit=${limit}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Leaderboard fetch failed (${res.status})`);
  }
  return (await res.json()) as LeaderboardEntry[];
}

export async function submitScore(username: string, score: number): Promise<void> {
  if (!isConfigured()) return;
  const cleanName = username.trim().slice(0, 20);
  if (!cleanName || score <= 0) return;
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify([{ username: cleanName, score }]),
  });
  if (!res.ok) {
    throw new Error(`Leaderboard submit failed (${res.status})`);
  }
}

export function leaderboardConfigured(): boolean {
  return isConfigured();
}
