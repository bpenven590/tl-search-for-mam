import type { PlatformConfig } from './types';

export const PLATFORMS: Record<string, PlatformConfig> = {
  'app.iconik.io': {
    name: 'Iconik',
    hostname: 'app.iconik.io',
    assetUrlPattern: 'https://app.iconik.io/asset/{asset_id}#tl_seek={start}',
    requiresCredentials: true,
    credentialFields: [
      {
        key: 'iconik_app_id',
        label: 'App ID',
        type: 'text',
        placeholder: 'uuid',
      },
      {
        key: 'iconik_auth_token',
        label: 'Auth Token',
        type: 'password',
        placeholder: 'eyJ...',
      },
    ],
    // Iconik is Angular/Material — try common selectors in order; first visible match wins.
    // Update this list if Iconik's DOM changes.
    searchBarSelectors: [
      'input[type="search"]',
      'input[placeholder*="earch"]',
      'input[aria-label*="earch"]',
      'app-search input',
      'iconik-search input',
    ],
  },
};

export function getPlatformConfig(hostname: string): PlatformConfig | null {
  return PLATFORMS[hostname] ?? null;
}

export function buildDeepLink(
  pattern: string,
  assetId: string,
  startSeconds: number
): string {
  return pattern
    .replace('{asset_id}', assetId)
    .replace('{start}', String(startSeconds));
}
