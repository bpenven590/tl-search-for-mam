import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsForm } from '../settings-form';

describe('SettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="test-root"></div>';

    const storageMock = chrome.storage.local.get as ReturnType<typeof vi.fn>;
    storageMock.mockImplementation((_keys: unknown, callback?: (result: Record<string, unknown>) => void) => {
      if (callback) callback({});
      return Promise.resolve({});
    });
  });

  it('renders without errors', async () => {
    const root = document.getElementById('test-root')!;
    const form = new SettingsForm(root);
    await form.init();
    expect(root.innerHTML).not.toBe('');
  });

  it('renders TwelveLabs section', async () => {
    const root = document.getElementById('test-root')!;
    const form = new SettingsForm(root);
    await form.init();
    expect(root.innerHTML).toContain('TwelveLabs');
  });

  it('renders platform sections', async () => {
    const root = document.getElementById('test-root')!;
    const form = new SettingsForm(root);
    await form.init();
    expect(root.innerHTML).toContain('Iconik');
  });
});
