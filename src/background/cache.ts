import { CACHE_TTL_MS } from '../shared/constants';

interface CacheEntry {
  mamAssetId: string;
  mamAssetTitle: string | null;
  resolvedAt: number;
}

export interface CachedAsset {
  mamAssetId: string;
  mamAssetTitle: string | null;
}

class AssetIdCache {
  private cache = new Map<string, CacheEntry>();

  set(videoId: string, mamAssetId: string, mamAssetTitle: string | null = null): void {
    this.cache.set(videoId, { mamAssetId, mamAssetTitle, resolvedAt: Date.now() });
  }

  get(videoId: string): CachedAsset | null {
    const entry = this.cache.get(videoId);
    if (!entry) return null;
    if (Date.now() - entry.resolvedAt > CACHE_TTL_MS) {
      this.cache.delete(videoId);
      return null;
    }
    return { mamAssetId: entry.mamAssetId, mamAssetTitle: entry.mamAssetTitle };
  }

  has(videoId: string): boolean {
    return this.get(videoId) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const assetIdCache = new AssetIdCache();
