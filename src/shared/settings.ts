export interface TLIndex {
  id: string;
  label: string;
  default: boolean;
}

export interface PlatformSettings {
  enabled: boolean;
  credentials: Record<string, string>;
  videoIdField: string;
}

export interface ExtensionSettings {
  tl_api_key: string;
  tl_indexes: TLIndex[];
  platforms: Record<string, PlatformSettings>;
  search_options: string[];
  theme: 'dark' | 'light' | 'auto';
  page_limit: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  tl_api_key: '',
  tl_indexes: [],
  platforms: {
    'app.iconik.io': {
      enabled: true,
      credentials: {},
      videoIdField: 'TL_VIDEO_ID',
    },
  },
  search_options: ['visual', 'audio'],
  theme: 'dark',
  page_limit: 20,
};

export async function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      const stored = result['settings'] as Partial<ExtensionSettings> | undefined;
      if (!stored) {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        platforms: {
          ...DEFAULT_SETTINGS.platforms,
          ...(stored.platforms ?? {}),
        },
      });
    });
  });
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, resolve);
  });
}
