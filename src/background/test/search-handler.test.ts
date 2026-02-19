import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearch } from '../search-handler';
import { assetIdCache } from '../cache';

vi.mock('../../api/twelvelabs', () => ({
  searchByText: vi.fn(),
  searchByImage: vi.fn(),
}));

vi.mock('../../api/mam-client', () => ({
  getResolver: vi.fn(),
}));

import { searchByText } from '../../api/twelvelabs';
import { getResolver } from '../../api/mam-client';

const mockTLResult = {
  data: [
    {
      rank: 1, start: 7, end: 13.75, score: 0.95, confidence: 'high',
      video_id: 'vid-123', thumbnail_url: 'https://example.com/thumb.jpg',
      user_metadata: { filename: 'video.mp4' },
    },
  ],
  page_info: { total_results: 1, page_expired_at: '', next_page_token: undefined },
};

describe('handleSearch', () => {
  beforeEach(() => {
    assetIdCache.clear();
    vi.clearAllMocks();
  });

  it('returns enriched results on success', async () => {
    (searchByText as ReturnType<typeof vi.fn>).mockResolvedValue(mockTLResult);
    (getResolver as ReturnType<typeof vi.fn>).mockReturnValue({
      resolveBatch: vi.fn().mockResolvedValue(
        new Map([['vid-123', { tlVideoId: 'vid-123', mamAssetId: 'iconik-asset', mamAssetTitle: 'My Asset', deepLink: null }]])
      ),
    });

    const request = { action: 'search' as const, query: 'soccer', indexId: 'idx-1', searchType: 'text' as const };
    const result = await handleSearch(request, 'app.iconik.io', 'api-key', { iconik_app_id: 'x', iconik_auth_token: 'y' }, 'TL_VIDEO_ID');

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0].mamAssetId).toBe('iconik-asset');
    // Iconik asset title takes precedence over user_metadata filename
    expect(result.results?.[0].filename).toBe('My Asset');
  });

  it('returns error on API failure', async () => {
    (searchByText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

    const request = { action: 'search' as const, query: 'test', indexId: 'idx-1', searchType: 'text' as const };
    const result = await handleSearch(request, 'app.iconik.io', 'key', {}, 'TL_VIDEO_ID');

    expect(result.success).toBe(false);
    expect(result.error).toContain('API error');
  });

  it('uses cache for repeated video IDs', async () => {
    assetIdCache.set('vid-123', 'cached-asset');
    (searchByText as ReturnType<typeof vi.fn>).mockResolvedValue(mockTLResult);
    const mockResolver = { resolveBatch: vi.fn() };
    (getResolver as ReturnType<typeof vi.fn>).mockReturnValue(mockResolver);

    const request = { action: 'search' as const, query: 'test', indexId: 'idx-1', searchType: 'text' as const };
    await handleSearch(request, 'app.iconik.io', 'key', {}, 'TL_VIDEO_ID');

    expect(mockResolver.resolveBatch).not.toHaveBeenCalled();
  });
});
