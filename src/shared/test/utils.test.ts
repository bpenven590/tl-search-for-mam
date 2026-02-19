import { describe, it, expect } from 'vitest';
import { formatTime, deduplicateVideoIds, groupByVideoId } from '../utils';
import type { EnrichedResult } from '../messages';

describe('formatTime', () => {
  it('formats seconds to m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats hours to h:mm:ss', () => {
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7200)).toBe('2:00:00');
  });
});

describe('deduplicateVideoIds', () => {
  it('removes duplicate video IDs', () => {
    const result = deduplicateVideoIds(['a', 'b', 'a', 'c', 'b']);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateVideoIds([])).toEqual([]);
  });
});

describe('groupByVideoId', () => {
  const makeResult = (videoId: string, rank: number): EnrichedResult => ({
    rank, videoId, start: 0, end: 5, confidence: 'high', score: 0.9,
    thumbnailUrl: '', filename: 'test.mp4', mamAssetId: 'asset-1', deepLink: 'https://example.com',
  });

  it('groups results by videoId', () => {
    const results = [makeResult('v1', 1), makeResult('v2', 2), makeResult('v1', 3)];
    const groups = groupByVideoId(results);
    expect(groups.get('v1')).toHaveLength(2);
    expect(groups.get('v2')).toHaveLength(1);
  });
});
