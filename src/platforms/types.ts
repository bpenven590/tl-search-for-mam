export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
}

export interface PlatformConfig {
  name: string;
  hostname: string;
  assetUrlPattern: string;
  requiresCredentials: boolean;
  credentialFields: CredentialField[];
  searchBarSelectors: string[];
}

export interface ResolvedAsset {
  tlVideoId: string;
  mamAssetId: string | null;
  mamAssetTitle: string | null;
  deepLink: string | null;
}

export interface PlatformResolver {
  resolve(
    videoId: string,
    credentials: Record<string, string>,
    videoIdField: string
  ): Promise<ResolvedAsset>;

  resolveBatch(
    videoIds: string[],
    credentials: Record<string, string>,
    videoIdField: string
  ): Promise<Map<string, ResolvedAsset>>;
}
