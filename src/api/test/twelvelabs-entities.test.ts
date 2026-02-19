import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listEntityCollections,
  createEntityCollection,
  listEntities,
  createEntity,
  deleteEntity,
  uploadAssetFromDataUrl,
  uploadAssetFromUrl,
} from '../twelvelabs-entities';

const mockApiKey = 'test-api-key';
const mockCollectionId = 'col-123';

const mockCollections = [
  { _id: 'col-1', name: 'People', entity_count: 5 },
  { _id: 'col-2', name: 'Logos', entity_count: 3 },
];

const mockEntities = [
  { _id: 'ent-1', name: 'John Doe', status: 'ready', asset_ids: ['a1', 'a2'] },
  { _id: 'ent-2', name: 'Jane Smith', status: 'processing', asset_ids: ['a3'] },
];

describe('listEntityCollections', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns data array of collections', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockCollections }),
    });

    const result = await listEntityCollections(mockApiKey);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('People');
    expect(result[1]._id).toBe('col-2');
  });

  it('sends correct headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await listEntityCollections(mockApiKey);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers['x-api-key']).toBe(mockApiKey);
  });

  it('throws on error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Internal Server Error',
    });

    await expect(listEntityCollections(mockApiKey)).rejects.toThrow(
      'Failed to list entity collections: 500'
    );
  });
});

describe('createEntityCollection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls POST with name in body', async () => {
    const created = { _id: 'col-new', name: 'Brands', entity_count: 0 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => created,
    });

    const result = await createEntityCollection(mockApiKey, 'Brands');
    expect(result.name).toBe('Brands');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/entity-collections');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ name: 'Brands' });
  });
});

describe('listEntities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns entities for a collection', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockEntities }),
    });

    const result = await listEntities(mockApiKey, mockCollectionId);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('John Doe');
  });

  it('passes name filter as query parameter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [mockEntities[0]] }),
    });

    await listEntities(mockApiKey, mockCollectionId, 'John');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain('name=John');
  });

  it('omits name param when no filter provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await listEntities(mockApiKey, mockCollectionId);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).not.toContain('name=');
  });
});

describe('createEntity', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates entity with name and asset_ids', async () => {
    const created = { _id: 'ent-new', name: 'Bob', status: 'ready', asset_ids: ['a1'] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => created,
    });

    const result = await createEntity(mockApiKey, mockCollectionId, 'Bob', ['a1']);
    expect(result.name).toBe('Bob');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(call[1].body)).toEqual({ name: 'Bob', asset_ids: ['a1'] });
  });

  it('throws friendly error on 409 duplicate', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => 'Conflict',
    });

    await expect(createEntity(mockApiKey, mockCollectionId, 'Bob', [])).rejects.toThrow(
      'An entity with this name already exists in this collection.'
    );
  });

  it('throws friendly error when body says already exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'An entity with this name already exists in this collection.',
    });

    await expect(createEntity(mockApiKey, mockCollectionId, 'Bob', [])).rejects.toThrow(
      'An entity with this name already exists in this collection.'
    );
  });
});

describe('deleteEntity', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls DELETE on correct endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await deleteEntity(mockApiKey, mockCollectionId, 'ent-1');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain(`/entity-collections/${mockCollectionId}/entities/ent-1`);
    expect(call[1].method).toBe('DELETE');
  });

  it('throws on error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Not Found',
    });

    await expect(deleteEntity(mockApiKey, mockCollectionId, 'ent-1')).rejects.toThrow(
      'Failed to delete entity: 404'
    );
  });
});

describe('uploadAssetFromDataUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uploads blob from data URL and polls until ready', async () => {
    const mockFetch = vi.fn();
    // First call: POST /assets -> returns created asset id
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'asset-new' }),
    });
    // Second call: GET /assets/asset-new -> ready
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _id: 'asset-new',
        status: 'ready',
        filename: 'face.png',
        file_type: 'image/png',
      }),
    });
    global.fetch = mockFetch;

    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await uploadAssetFromDataUrl(mockApiKey, dataUrl, 'face.png');

    expect(result.status).toBe('ready');
    expect(result._id).toBe('asset-new');

    // Verify POST call used FormData with file blob
    const postCall = mockFetch.mock.calls[0];
    expect(postCall[0]).toContain('/assets');
    expect(postCall[1].method).toBe('POST');
    const formData: FormData = postCall[1].body;
    expect(formData.get('method')).toBe('direct');
    expect(formData.get('file')).toBeInstanceOf(Blob);
  });

  it('polls multiple times if asset is not ready', async () => {
    const mockFetch = vi.fn();
    // POST
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'asset-slow' }),
    });
    // First poll: processing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'asset-slow', status: 'processing', filename: 'f.png', file_type: 'image/png' }),
    });
    // Second poll: ready
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'asset-slow', status: 'ready', filename: 'f.png', file_type: 'image/png' }),
    });
    global.fetch = mockFetch;

    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await uploadAssetFromDataUrl(mockApiKey, dataUrl, 'f.png');

    expect(result.status).toBe('ready');
    // 1 POST + 2 GETs = 3 total calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('uploadAssetFromUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uploads from remote URL and polls until ready', async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'asset-url' }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _id: 'asset-url',
        status: 'ready',
        filename: 'photo.jpg',
        file_type: 'image/jpeg',
      }),
    });
    global.fetch = mockFetch;

    const result = await uploadAssetFromUrl(mockApiKey, 'https://example.com/photo.jpg');

    expect(result.status).toBe('ready');
    const postCall = mockFetch.mock.calls[0];
    const formData: FormData = postCall[1].body;
    expect(formData.get('method')).toBe('url');
    expect(formData.get('url')).toBe('https://example.com/photo.jpg');
  });
});
