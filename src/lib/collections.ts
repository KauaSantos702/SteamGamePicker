// Reads the user's Steam library collections from the client's local cloud-storage file.
// The format is undocumented: an array of [key, entry] pairs, where collection entries have
// keys like "user-collections.<id>" and a JSON-encoded `value` with `name` and `added` appids.
// Dynamic collections store a `filterSpec` (a rule) instead of a list, so they are skipped.

export type Collection = { id: string; name: string; appids: number[] };
export type ImportResult = { collections: Collection[]; dynamicSkipped: number };

const PREFIX = "user-collections.";
const STEAMID64_BASE = BigInt("76561197960265728");

/** Collections every Steam account has; their display names come from the translations. */
export const BUILT_IN_COLLECTIONS = ["favorite", "hidden"] as const;
export type BuiltInCollection = (typeof BUILT_IN_COLLECTIONS)[number];

export function isBuiltIn(id: string): id is BuiltInCollection {
  return (BUILT_IN_COLLECTIONS as readonly string[]).includes(id);
}

export const CLOUD_FILE = "cloud-storage-namespace-1.json";

export class CollectionsError extends Error {
  constructor(readonly code: "invalidJson" | "noCollections") {
    super(code);
  }
}

export function steamId3(steamId64: string) {
  return (BigInt(steamId64) - STEAMID64_BASE).toString();
}

export function parseCloudStorage(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new CollectionsError("invalidJson");
  }

  const collections: Collection[] = [];
  let dynamicSkipped = 0;

  for (const pair of Array.isArray(data) ? data : []) {
    const entry = Array.isArray(pair) ? pair[1] : pair;
    if (!entry || typeof entry !== "object") continue;
    const { key, value, is_deleted } = entry as { key?: unknown; value?: unknown; is_deleted?: unknown };
    if (typeof key !== "string" || !key.startsWith(PREFIX) || is_deleted || typeof value !== "string") continue;

    let parsed: { id?: unknown; name?: unknown; added?: unknown; filterSpec?: unknown };
    try {
      parsed = JSON.parse(value);
    } catch {
      continue;
    }
    if (parsed.filterSpec) {
      dynamicSkipped++;
      continue;
    }

    const id = typeof parsed.id === "string" ? parsed.id : key.slice(PREFIX.length);
    const name = typeof parsed.name === "string" && parsed.name ? parsed.name : id;
    const appids = Array.isArray(parsed.added) ? parsed.added.filter((n): n is number => typeof n === "number") : [];
    collections.push({ id, name, appids });
  }

  if (collections.length === 0 && dynamicSkipped === 0) {
    throw new CollectionsError("noCollections");
  }

  return { collections, dynamicSkipped };
}
