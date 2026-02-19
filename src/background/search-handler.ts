import type { SearchRequest, SearchResponse, EnrichedResult } from '../shared/messages';
import { searchByText, searchByImage } from '../api/twelvelabs';
import { getResolver } from '../api/mam-client';
import { buildDeepLink, getPlatformConfig } from '../platforms/registry';
import { assetIdCache } from './cache';
import { deduplicateVideoIds } from '../shared/utils';

export async function handleSearch(
  request: SearchRequest,
  platform: string,
  tlApiKey: string,
  credentials: Record<string, string>,
  videoIdField: string
): Promise<SearchResponse> {
  try {
    // 1. Call TwelveLabs search API
    const tlResult = request.searchType === 'image' && request.imageUrl
      ? await searchByImage(tlApiKey, request.indexId, request.imageUrl, {
          pageToken: request.pageToken,
          queryText: request.query || undefined,  // combined text+image when both present
        })
      : await searchByText(tlApiKey, request.indexId, request.query, {
          pageToken: request.pageToken,
        });

    // 2. Deduplicate video IDs
    const allVideoIds = tlResult.data.map((s) => s.video_id);
    const uniqueVideoIds = deduplicateVideoIds(allVideoIds);

    // 3. Resolve uncached video IDs via MAM
    const resolver = getResolver(platform);
    const resolvedMap = new Map<string, { mamAssetId: string | null; mamAssetTitle: string | null }>();

    // Check cache first
    const uncachedIds = uniqueVideoIds.filter((id) => {
      const cached = assetIdCache.get(id);
      if (cached !== null) {
        resolvedMap.set(id, cached);
        return false;
      }
      return true;
    });

    // Resolve uncached
    if (uncachedIds.length > 0 && resolver) {
      const batchResult = await resolver.resolveBatch(uncachedIds, credentials, videoIdField);
      for (const [videoId, resolved] of batchResult.entries()) {
        if (resolved.mamAssetId) {
          assetIdCache.set(videoId, resolved.mamAssetId, resolved.mamAssetTitle ?? null);
        }
        resolvedMap.set(videoId, { mamAssetId: resolved.mamAssetId, mamAssetTitle: resolved.mamAssetTitle ?? null });
      }
    }

    // 4. Build enriched results
    const platformConfig = getPlatformConfig(platform);
    const results: EnrichedResult[] = tlResult.data.map((segment) => {
      const resolved = resolvedMap.get(segment.video_id);
      const mamAssetId = resolved?.mamAssetId ?? '';
      const mamAssetTitle = resolved?.mamAssetTitle ?? null;
      const deepLink = mamAssetId && platformConfig
        ? buildDeepLink(platformConfig.assetUrlPattern, mamAssetId, segment.start)
        : '';

      return {
        rank: segment.rank,
        start: segment.start,
        end: segment.end,
        score: segment.score,
        videoId: segment.video_id,
        thumbnailUrl: segment.thumbnail_url ?? '',
        filename: mamAssetTitle ?? segment.user_metadata?.['filename'] ?? segment.video_id,
        mamAssetId,
        deepLink,
      };
    });

    return {
      success: true,
      results,
      pageInfo: {
        nextPageToken: tlResult.page_info.next_page_token,
        totalResults: tlResult.page_info.total_results,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
