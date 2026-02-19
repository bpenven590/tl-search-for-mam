import type { EnrichedResult } from './messages';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function deduplicateVideoIds(videoIds: string[]): string[] {
  return [...new Set(videoIds)];
}

export function groupByVideoId(results: EnrichedResult[]): Map<string, EnrichedResult[]> {
  const groups = new Map<string, EnrichedResult[]>();
  for (const result of results) {
    const group = groups.get(result.videoId) ?? [];
    group.push(result);
    groups.set(result.videoId, group);
  }
  return groups;
}
