const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export type OwnedGame = {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  rtime_last_played?: number;
  img_icon_url?: string;
};

export type PlayerSummary = {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
  communityvisibilitystate: number;
};

export class PrivateLibraryError extends Error {}

function apiKey() {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("STEAM_API_KEY não configurada (veja .env.example).");
  return key;
}

export function appUrl(fallbackOrigin: string) {
  return (process.env.APP_URL || fallbackOrigin).replace(/\/$/, "");
}

export function buildLoginUrl(baseUrl: string) {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": `${baseUrl}/api/auth/steam/callback`,
    "openid.realm": baseUrl,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${OPENID_ENDPOINT}?${params}`;
}

/** Confirms the OpenID response with Steam and returns the SteamID64, or null if invalid. */
export async function verifyLogin(query: URLSearchParams, baseUrl: string): Promise<string | null> {
  if (query.get("openid.mode") !== "id_res") return null;
  if (query.get("openid.op_endpoint") !== OPENID_ENDPOINT) return null;
  if (!query.get("openid.return_to")?.startsWith(`${baseUrl}/api/auth/steam/callback`)) return null;

  const match = query.get("openid.claimed_id")?.match(CLAIMED_ID_RE);
  if (!match) return null;

  const body = new URLSearchParams();
  for (const [k, v] of query) if (k.startsWith("openid.")) body.set(k, v);
  body.set("openid.mode", "check_authentication");

  const res = await fetch(OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  return /is_valid\s*:\s*true/.test(text) ? match[1] : null;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const gamesCache = new Map<string, { at: number; games: OwnedGame[] }>();

export async function getOwnedGames(steamId: string, { fresh = false } = {}): Promise<OwnedGame[]> {
  const cached = gamesCache.get(steamId);
  if (!fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.games;

  const params = new URLSearchParams({
    key: apiKey(),
    steamid: steamId,
    include_appinfo: "1",
    include_played_free_games: "1",
    format: "json",
  });
  const res = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GetOwnedGames respondeu ${res.status}`);

  const data = (await res.json()) as { response?: { games?: OwnedGame[] } };
  // A private "Game details" setting returns an empty response object.
  if (!data.response?.games) throw new PrivateLibraryError();

  const games = data.response.games;
  gamesCache.set(steamId, { at: Date.now(), games });
  return games;
}

export async function getPlayerSummary(steamId: string): Promise<PlayerSummary | null> {
  const params = new URLSearchParams({ key: apiKey(), steamids: steamId });
  const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${params}`, {
    next: { revalidate: 600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { response?: { players?: PlayerSummary[] } };
  return data.response?.players?.[0] ?? null;
}
