export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  created_at: string;
}

export class LeaderboardError extends Error {
  status?: number;
  details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = "LeaderboardError";
    this.status = status;
    this.details = details;
  }
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

async function extractErrorDetails(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string; hint?: string };
      return parsed.message ?? parsed.error ?? parsed.hint ?? text;
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  if (!isConfigured()) return [];
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=id,username,score,created_at&order=score.desc,created_at.asc&limit=${limit}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const details = await extractErrorDetails(res);
    throw new LeaderboardError(`Leaderboard fetch failed (${res.status})`, res.status, details);
  }
  return (await res.json()) as LeaderboardEntry[];
}

export async function fetchDeviceBestScore(deviceId: string): Promise<number | null> {
  if (!isConfigured()) return null;
  const cleanDeviceId = deviceId.trim();
  if (!cleanDeviceId) return null;
  const encoded = encodeURIComponent(cleanDeviceId);
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=score&device_id=eq.${encoded}&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const details = await extractErrorDetails(res);
    throw new LeaderboardError(
      `Leaderboard device lookup failed (${res.status})`,
      res.status,
      details,
    );
  }
  const rows = (await res.json()) as Array<{ score: number }>;
  const first = rows.at(0);
  if (!first) return null;
  return Number(first.score);
}

export async function submitScore(username: string, score: number, deviceId: string): Promise<void> {
  if (!isConfigured()) return;
  const cleanName = username.trim().slice(0, 20);
  const cleanDeviceId = deviceId.trim();
  if (!cleanName || score <= 0 || !cleanDeviceId) return;
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=device_id`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([{ device_id: cleanDeviceId, username: cleanName, score }]),
  });
  if (!res.ok) {
    const details = await extractErrorDetails(res);
    throw new LeaderboardError(`Leaderboard submit failed (${res.status})`, res.status, details);
  }
}

export function leaderboardConfigured(): boolean {
  return isConfigured();
}

export function leaderboardConfigHint(): string {
  return "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in GitHub Actions Secrets or Variables, then redeploy.";
}

export function leaderboardTroubleshootingHint(err: unknown): string {
  if (!(err instanceof LeaderboardError)) return "Failed to reach leaderboard service.";
  if (err.status === 404) {
    return "Leaderboard table not found. Verify VITE_LEADERBOARD_TABLE and create the table in Supabase.";
  }
  if (err.status === 401 || err.status === 403) {
    return "Supabase key/permissions rejected. Verify anon key and RLS insert/select policies.";
  }
  if (err.status === 400) {
    return `Bad leaderboard request${err.details ? `: ${err.details}` : "."}`;
  }
  if (err.status === 409) {
    return "Duplicate constraint conflict. Ensure leaderboard table has unique device_id.";
  }
  return `Leaderboard error${err.status ? ` (${err.status})` : ""}${err.details ? `: ${err.details}` : "."}`;
}
