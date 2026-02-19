import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { assetIdCache } from '../cache';

describe('AssetIdCache', () => {
  beforeEach(() => {
    assetIdCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves asset IDs', () => {
    assetIdCache.set('video-1', 'asset-abc');
    expect(assetIdCache.get('video-1')).toEqual({ mamAssetId: 'asset-abc', mamAssetTitle: null });
  });

  it('stores and retrieves asset title', () => {
    assetIdCache.set('video-1', 'asset-abc', 'My Video.mp4');
    expect(assetIdCache.get('video-1')).toEqual({ mamAssetId: 'asset-abc', mamAssetTitle: 'My Video.mp4' });
  });

  it('returns null for unknown video IDs', () => {
    expect(assetIdCache.get('unknown')).toBeNull();
  });

  it('returns null after TTL expires', () => {
    assetIdCache.set('video-2', 'asset-xyz');
    vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutes
    expect(assetIdCache.get('video-2')).toBeNull();
  });

  it('reports has() correctly', () => {
    assetIdCache.set('vid', 'asset');
    expect(assetIdCache.has('vid')).toBe(true);
    expect(assetIdCache.has('other')).toBe(false);
  });

  it('clears all entries', () => {
    assetIdCache.set('v1', 'a1');
    assetIdCache.set('v2', 'a2');
    assetIdCache.clear();
    expect(assetIdCache.size()).toBe(0);
  });
});
