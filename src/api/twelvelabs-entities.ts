import { TL_API_BASE } from '../shared/constants';

// Types matching TwelveLabs API response shapes
export interface TLEntityCollection {
  _id: string;
  name: string;
  entity_count: number;
}

export interface TLEntity {
  _id: string;
  name: string;
  status: string;
  asset_ids: string[];
}

export interface TLAsset {
  _id: string;
  status: string;
  filename: string;
  file_type: string;
}

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 30;

function headers(apiKey: string): Record<string, string> {
  return { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
}

async function handleResponse<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`${context}: ${response.status} ${errorText}`);
  }
  return response.json() as Promise<T>;
}

export async function listEntityCollections(apiKey: string): Promise<TLEntityCollection[]> {
  const response = await fetch(`${TL_API_BASE}/entity-collections`, {
    method: 'GET',
    headers: headers(apiKey),
  });
  const result = await handleResponse<{ data: TLEntityCollection[] }>(
    response,
    'Failed to list entity collections'
  );
  return result.data;
}

export async function createEntityCollection(
  apiKey: string,
  name: string
): Promise<TLEntityCollection> {
  const response = await fetch(`${TL_API_BASE}/entity-collections`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ name }),
  });
  return handleResponse<TLEntityCollection>(response, 'Failed to create entity collection');
}

export async function listEntities(
  apiKey: string,
  collectionId: string,
  nameFilter?: string
): Promise<TLEntity[]> {
  const url = new URL(`${TL_API_BASE}/entity-collections/${collectionId}/entities`);
  if (nameFilter) {
    url.searchParams.set('name', nameFilter);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(apiKey),
  });
  const result = await handleResponse<{ data: TLEntity[] }>(response, 'Failed to list entities');
  return result.data;
}

export async function createEntity(
  apiKey: string,
  collectionId: string,
  name: string,
  assetIds: string[]
): Promise<TLEntity> {
  const response = await fetch(
    `${TL_API_BASE}/entity-collections/${collectionId}/entities`,
    {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ name, asset_ids: assetIds }),
    }
  );

  if (response.status === 409) {
    throw new Error('An entity with this name already exists in this collection.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    if (errorText.includes('already exists')) {
      throw new Error('An entity with this name already exists in this collection.');
    }
    throw new Error(`Failed to create entity: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<TLEntity>;
}

export async function deleteEntity(
  apiKey: string,
  collectionId: string,
  entityId: string
): Promise<void> {
  const response = await fetch(
    `${TL_API_BASE}/entity-collections/${collectionId}/entities/${entityId}`,
    {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey },
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to delete entity: ${response.status} ${errorText}`);
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function pollAssetReady(apiKey: string, assetId: string): Promise<TLAsset> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`${TL_API_BASE}/assets/${assetId}`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to poll asset status: ${response.status} ${errorText}`);
    }

    const asset = (await response.json()) as TLAsset;
    if (asset.status === 'ready') {
      return asset;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Asset ${assetId} did not become ready within ${POLL_MAX_ATTEMPTS}s`);
}

export async function uploadAssetFromDataUrl(
  apiKey: string,
  dataUrl: string,
  filename: string
): Promise<TLAsset> {
  const blob = dataUrlToBlob(dataUrl);
  const form = new FormData();
  form.append('method', 'direct');
  form.append('file', blob, filename);

  const response = await fetch(`${TL_API_BASE}/assets`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  const created = await handleResponse<{ _id: string }>(response, 'Failed to upload asset');
  return pollAssetReady(apiKey, created._id);
}

export async function uploadAssetFromUrl(apiKey: string, url: string): Promise<TLAsset> {
  const form = new FormData();
  form.append('method', 'url');
  form.append('url', url);

  const response = await fetch(`${TL_API_BASE}/assets`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  const created = await handleResponse<{ _id: string }>(response, 'Failed to upload asset from URL');
  return pollAssetReady(apiKey, created._id);
}
