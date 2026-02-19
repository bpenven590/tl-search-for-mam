export type SearchType = 'text' | 'image';

export interface SearchRequest {
  action: 'search';
  query: string;
  indexId: string;
  searchType: SearchType;
  imageUrl?: string;
  pageToken?: string;
}

export interface ResolveRequest {
  action: 'resolve';
  videoIds: string[];
  platform: string;
}

export interface ValidateRequest {
  action: 'validate';
  tlApiKey: string;
  platformCredentials?: Record<string, string>;
  platform?: string;
}

// Entity message types — Content -> Background
export interface ListEntityCollectionsRequest {
  action: 'listEntityCollections';
}

export interface ListEntitiesRequest {
  action: 'listEntities';
  collectionId: string;
  nameFilter?: string;
}

export interface CreateEntityCollectionRequest {
  action: 'createEntityCollection';
  name: string;
}

export interface CreateEntityRequest {
  action: 'createEntity';
  collectionId: string;
  name: string;
  imageDataUrls?: string[];
  imageUrls?: string[];
}

export interface DeleteEntityRequest {
  action: 'deleteEntity';
  collectionId: string;
  entityId: string;
}

export type ContentMessage =
  | SearchRequest
  | ResolveRequest
  | ValidateRequest
  | ListEntityCollectionsRequest
  | ListEntitiesRequest
  | CreateEntityCollectionRequest
  | CreateEntityRequest
  | DeleteEntityRequest;

export interface PageInfo {
  nextPageToken?: string;
  totalResults: number;
}

export interface EnrichedResult {
  rank: number;
  start: number;
  end: number;
  score: number;
  videoId: string;
  thumbnailUrl: string;
  filename: string;
  mamAssetId: string;
  deepLink: string;
}

export interface SearchResponse {
  success: boolean;
  results?: EnrichedResult[];
  pageInfo?: PageInfo;
  error?: string;
}

export interface ValidateResponse {
  success: boolean;
  error?: string;
}

// Entity response types — Background -> Content
export interface EntityCollection {
  id: string;
  name: string;
  entityCount: number;
}

export interface Entity {
  id: string;
  name: string;
  status: 'ready' | 'processing' | string;
  assetCount: number;
}

export interface EntityCollectionsResponse {
  success: boolean;
  collections?: EntityCollection[];
  error?: string;
}

export interface EntitiesResponse {
  success: boolean;
  entities?: Entity[];
  error?: string;
}

export interface CreateEntityCollectionResponse {
  success: boolean;
  collection?: EntityCollection;
  error?: string;
}

export interface CreateEntityResponse {
  success: boolean;
  entity?: Entity;
  error?: string;
}

export interface DeleteEntityResponse {
  success: boolean;
  error?: string;
}
