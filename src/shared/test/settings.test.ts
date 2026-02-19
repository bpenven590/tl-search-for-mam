import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../settings';

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset storage mock
    const storageMock = chrome.storage.local.get as ReturnType<typeof vi.fn>;
    storageMock.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
      if (callback) callback({});
      return Promise.resolve({});
    });
  });

  it('returns default settings when nothing is stored', async () => {
    const settings = await loadSettings();
    expect(settings.tl_api_key).toBe('');
    expect(settings.theme).toBe('dark');
    expect(settings.page_limit).toBe(20);
  });

  it('merges stored settings with defaults', async () => {
    const storageMock = chrome.storage.local.get as ReturnType<typeof vi.fn>;
    storageMock.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
      if (callback) callback({ settings: { tl_api_key: 'test-key' } });
      return Promise.resolve({});
    });

    const settings = await loadSettings();
    expect(settings.tl_api_key).toBe('test-key');
    expect(settings.theme).toBe('dark'); // default preserved
  });

  it('saves settings to storage', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, tl_api_key: 'my-key' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { settings: expect.objectContaining({ tl_api_key: 'my-key' }) },
      expect.any(Function)
    );
  });
});
