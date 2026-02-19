import type { PlatformResolver, ResolvedAsset } from '../types';
import { buildDeepLink, PLATFORMS } from '../registry';
import { ICONIK_SEARCH_API } from '../../shared/constants';

interface IconikSearchResponse {
  objects: Array<{ id: string; title?: string }>;
}

async function lookupAsset(
  videoId: string,
  credentials: Record<string, string>,
  videoIdField: string
): Promise<{ id: string | null; title: string | null }> {
  const appId = credentials['iconik_app_id'];
  const authToken = credentials['iconik_auth_token'];

  if (!appId || !authToken) {
    throw new Error('Iconik credentials missing: iconik_app_id and iconik_auth_token required');
  }

  const iconikQuery = `metadata.${videoIdField}:${videoId}`;
  console.log(`[TL] Iconik lookup — query: "${iconikQuery}"`);

  const response = await fetch(ICONIK_SEARCH_API, {
    method: 'POST',
    headers: {
      'App-ID': appId,
      'Auth-Token': authToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: iconikQuery,
      object_types: ['assets'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Iconik search failed: ${response.status} ${response.statusText}`);
  }

  const data: IconikSearchResponse = await response.json();
  const first = data.objects?.[0] ?? null;
  const assetId = first?.id ?? null;
  const assetTitle = first?.title ?? null;
  const hitCount = data.objects?.length ?? 0;
  console.log(`[TL] Iconik result for ${videoId}: ${assetId ? `asset ${assetId} ("${assetTitle}")` : `NOT FOUND (${hitCount} objects returned)`}`);
  return { id: assetId, title: assetTitle };
}

export const iconikResolver: PlatformResolver = {
  async resolve(videoId, credentials, videoIdField): Promise<ResolvedAsset> {
    const { id: mamAssetId, title: mamAssetTitle } = await lookupAsset(videoId, credentials, videoIdField);
    const platform = PLATFORMS['app.iconik.io'];
    const deepLink = mamAssetId
      ? buildDeepLink(platform.assetUrlPattern, mamAssetId, 0)
      : null;
    return { tlVideoId: videoId, mamAssetId, mamAssetTitle, deepLink };
  },

  async resolveBatch(videoIds, credentials, videoIdField): Promise<Map<string, ResolvedAsset>> {
    const results = new Map<string, ResolvedAsset>();
    await Promise.all(
      videoIds.map(async (videoId) => {
        try {
          const resolved = await iconikResolver.resolve(videoId, credentials, videoIdField);
          results.set(videoId, resolved);
        } catch {
          results.set(videoId, { tlVideoId: videoId, mamAssetId: null, mamAssetTitle: null, deepLink: null });
        }
      })
    );
    return results;
  },
};
