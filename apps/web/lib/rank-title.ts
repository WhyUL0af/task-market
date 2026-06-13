export const rankTitles = [
  "初階",
  "冒險家",
  "傭兵",
  "達人",
  "勇士",
  "菁英",
  "聖者",
  "傳奇"
] as const;

export const maxRankLevel = rankTitles.length;

export function rankTitle(level?: number | null) {
  const normalized = Math.min(Math.max(level ?? 1, 1), maxRankLevel);
  return rankTitles[normalized - 1];
}

export function getLevelByTitle(titleName?: string | null): number {
  if (!titleName) {
    return 1;
  }

  const index = rankTitles.findIndex((title) => title === titleName);
  return index >= 0 ? index + 1 : 1;
}
