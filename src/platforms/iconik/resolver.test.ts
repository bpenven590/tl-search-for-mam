import { describe, it, expect, vi, beforeEach } from 'vitest';
import { iconikResolver } from './resolver';

const mockCredentials = {
  iconik_app_id: 'test-app-id',
  iconik_auth_token: 'test-auth-token',
};

describe('iconikResolver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves a video_id to a MAM asset_id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [{ id: 'iconik-asset-uuid', title: 'test.mp4' }] }),
    });

    const result = await iconikResolver.resolve('tl-video-id', mockCredentials, 'TL_VIDEO_ID');
    expect(result.mamAssetId).toBe('iconik-asset-uuid');
    expect(result.deepLink).toContain('iconik-asset-uuid');
    expect(result.tlVideoId).toBe('tl-video-id');
  });

  it('returns null mamAssetId when video not found in Iconik', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ objects: [] }),
    });

    const result = await iconikResolver.resolve('unknown-id', mockCredentials, 'TL_VIDEO_ID');
    expect(result.mamAssetId).toBeNull();
    expect(result.deepLink).toBeNull();
  });

  it('throws when credentials are missing', async () => {
    await expect(
      iconikResolver.resolve('video-id', {}, 'TL_VIDEO_ID')
    ).rejects.toThrow('Iconik credentials missing');
  });

  it('throws on Iconik API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(
      iconikResolver.resolve('video-id', mockCredentials, 'TL_VIDEO_ID')
    ).rejects.toThrow('Iconik search failed');
  });

  it('resolves batch of video IDs', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objects: [{ id: 'asset-1' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objects: [] }) });

    const results = await iconikResolver.resolveBatch(
      ['vid-1', 'vid-2'], mockCredentials, 'TL_VIDEO_ID'
    );
    expect(results.get('vid-1')?.mamAssetId).toBe('asset-1');
    expect(results.get('vid-2')?.mamAssetId).toBeNull();
  });
});
