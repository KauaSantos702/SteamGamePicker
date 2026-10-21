// Draw lists the user builds by hand. Stored per SteamID in localStorage, apart from imported
// Steam collections, so importing or removing collections never touches them.

import type { Collection } from "@/lib/collections";

const PREFIX = "sorteador-listas:";
const ID_PREFIX = "lista-";

export function isCustomList(id: string) {
  return id.startsWith(ID_PREFIX);
}

export function newListId() {
  return ID_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function loadLists(steamId: string): Collection[] {
  try {
    const raw = localStorage.getItem(PREFIX + steamId);
    return raw ? (JSON.parse(raw) as Collection[]) : [];
  } catch {
    return [];
  }
}

export function saveLists(steamId: string, lists: Collection[]) {
  try {
    if (lists.length) localStorage.setItem(PREFIX + steamId, JSON.stringify(lists));
    else localStorage.removeItem(PREFIX + steamId);
  } catch {
    // Storage blocked: the lists still work until the page is reloaded.
  }
}
