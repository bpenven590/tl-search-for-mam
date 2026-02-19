import { TL_API_BASE, TL_SEARCH_ENDPOINT, DEFAULT_PAGE_LIMIT } from '../shared/constants';

export interface TLSearchOptions {
  searchOptions?: string[];
  pageLimit?: number;
  pageToken?: string;
  includeUserMetadata?: boolean;
}

export interface TLSearchSegment {
  rank: number;
  start: number;
  end: number;
  score: number;
  confidence: string;
  video_id: string;
  thumbnail_url: string;
  user_metadata?: Record<string, string>;
}

export interface TLSearchResult {
  data: TLSearchSegment[];
  page_info: {
    total_results: number;
    page_expired_at: string;
    next_page_token?: string;
  };
}

export async function searchByText(
  apiKey: string,
  indexId: string,
  query: string,
  options: TLSearchOptions = {}
): Promise<TLSearchResult> {
  const form = new FormData();
  form.append('index_id', indexId);
  form.append('query_text', query);

  const searchOpts = options.searchOptions ?? ['visual', 'audio'];
  for (const opt of searchOpts) {
    form.append('search_options', opt);
  }

  form.append('page_limit', String(options.pageLimit ?? DEFAULT_PAGE_LIMIT));
  form.append('include_user_metadata', 'true');

  if (options.pageToken) {
    form.append('page_token', options.pageToken);
  }

  const response = await fetch(`${TL_API_BASE}${TL_SEARCH_ENDPOINT}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`TwelveLabs search failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<TLSearchResult>;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function searchByImage(
  apiKey: string,
  indexId: string,
  imageUrl: string,
  options: TLSearchOptions & { queryText?: string } = {}
): Promise<TLSearchResult> {
  const form = new FormData();
  form.append('index_id', indexId);
  form.append('query_media_type', 'image');

  // Optional text query for combined text+image search
  if (options.queryText) {
    form.append('query_text', options.queryText);
  }

  // data: URLs can't be fetched by TwelveLabs — send as binary file instead
  if (imageUrl.startsWith('data:')) {
    const blob = dataUrlToBlob(imageUrl);
    const ext = blob.type.split('/')[1] ?? 'png';
    form.append('query_media_file', blob, `image.${ext}`);
  } else {
    form.append('query_media_url', imageUrl);
  }

  const searchOpts = options.searchOptions ?? ['visual'];
  for (const opt of searchOpts) {
    form.append('search_options', opt);
  }

  form.append('page_limit', String(options.pageLimit ?? DEFAULT_PAGE_LIMIT));
  form.append('include_user_metadata', 'true');

  if (options.pageToken) {
    form.append('page_token', options.pageToken);
  }

  const response = await fetch(`${TL_API_BASE}${TL_SEARCH_ENDPOINT}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`TwelveLabs image search failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<TLSearchResult>;
}
