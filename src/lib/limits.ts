/** Playtime filters for the draw. "0" means never played; other values are "less than N hours". */
export const HOUR_LIMITS = ["any", "0", "2", "10"] as const;
export type HourLimit = (typeof HOUR_LIMITS)[number];

export function matchesLimit(playtimeMinutes: number, limit: HourLimit) {
  if (limit === "any") return true;
  const max = Number(limit) * 60;
  return max === 0 ? playtimeMinutes === 0 : playtimeMinutes < max;
}
