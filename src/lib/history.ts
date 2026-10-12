// Games drawn during the login session. Stored per SteamID in localStorage and wiped on logout.

import type { HourLimit } from "@/lib/limits";

export type DrawnGame = {
  appid: number;
  name: string;
  playtime_forever: number;
  /** Collection the game was drawn from; absent means the whole library. */
  collection?: { id: string; name: string };
  limit?: HourLimit;
  /** Pre-i18n entries stored the source as finished text. */
  from?: string;
  at: number;
};

const PREFIX = "sorteador-sorteados:";
const MAX_ENTRIES = 200;

export function loadHistory(steamId: string): DrawnGame[] {
  try {
    const raw = localStorage.getItem(PREFIX + steamId);
    return raw ? (JSON.parse(raw) as DrawnGame[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(steamId: string, entry: DrawnGame) {
  try {
    const next = [entry, ...loadHistory(steamId)].slice(0, MAX_ENTRIES);
    localStorage.setItem(PREFIX + steamId, JSON.stringify(next));
  } catch {
    // Storage blocked: the draw still works, it just isn't remembered.
  }
}

export function clearHistory(steamId?: string) {
  try {
    if (steamId) return localStorage.removeItem(PREFIX + steamId);
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}
