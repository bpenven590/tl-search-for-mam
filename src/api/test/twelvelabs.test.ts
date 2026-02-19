import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchByText, searchByImage } from '../twelvelabs';

const mockApiKey = 'test-api-key';
const mockIndexId = 'test-index-id';

const mockSearchResponse = {
  data: [
    {
      rank: 1,
      start: 7,
      end: 13.75,
      score: 0.95,
      confidence: 'high',
      video_id: 'vid-123',
      thumbnail_url: 'https://example.com/thumb.jpg',
      user_metadata: { filename: 'video.mp4' },
    },
  ],
  page_info: { total_results: 1, page_expired_at: '2024-01-01T00:00:00Z' },
};

describe('searchByText', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns search results for valid query', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResponse,
    });

    const result = await searchByText(mockApiKey, mockIndexId, 'soccer highlights');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].video_id).toBe('vid-123');
  });

  it('throws on invalid API key (401)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      searchByText(mockApiKey, mockIndexId, 'query')
    ).rejects.toThrow('TwelveLabs search failed: 401');
  });

  it('passes page token for pagination', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], page_info: { total_results: 0, page_expired_at: '' } }),
    });

    await searchByText(mockApiKey, mockIndexId, 'query', { pageToken: 'token-123' });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData: FormData = call[1].body;
    expect(formData.get('page_token')).toBe('token-123');
  });
});

describe('searchByImage', () => {
  it('returns search results for image URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResponse,
    });

    const result = await searchByImage(mockApiKey, mockIndexId, 'https://example.com/frame.jpg');
    expect(result.data).toHaveLength(1);
  });

  it('sends query_media_file for data: URLs instead of query_media_url', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResponse,
    });

    // Minimal 1x1 PNG as data URL
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await searchByImage(mockApiKey, mockIndexId, dataUrl);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData: FormData = call[1].body;
    expect(formData.get('query_media_file')).toBeInstanceOf(Blob);
    expect(formData.get('query_media_url')).toBeNull();
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(
      searchByImage(mockApiKey, mockIndexId, 'https://example.com/img.jpg')
    ).rejects.toThrow('Network error');
  });
});
