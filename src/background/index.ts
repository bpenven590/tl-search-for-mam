import type { ContentMessage, SearchResponse } from '../shared/messages';
import { loadSettings } from '../shared/settings';
import { handleSearch } from './search-handler';
import {
  listEntityCollections,
  listEntities,
  createEntityCollection,
  createEntity,
  deleteEntity,
  uploadAssetFromDataUrl,
  uploadAssetFromUrl,
} from '../api/twelvelabs-entities';

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, sender, sendResponse) => {
    if (message.action === 'search') {
      const platform = sender.tab?.url
        ? new URL(sender.tab.url).hostname
        : 'app.iconik.io';

      loadSettings()
        .then((settings) => {
          const platformSettings = settings.platforms[platform];
          return handleSearch(
            message,
            platform,
            settings.tl_api_key,
            platformSettings?.credentials ?? {},
            platformSettings?.videoIdField ?? 'TL_VIDEO_ID'
          );
        })
        .then(sendResponse)
        .catch((err) => {
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Background error' });
        });

      return true; // Keep message channel open for async response
    }

    if (message.action === 'validate') {
      const response: SearchResponse = { success: true };
      sendResponse(response);
      return false;
    }

    if (message.action === 'listEntityCollections') {
      loadSettings()
        .then((settings) => listEntityCollections(settings.tl_api_key))
        .then((collections) => {
          sendResponse({
            success: true,
            collections: collections.map((c) => ({
              id: c._id,
              name: c.name,
              // API may use entity_count or entities_count; fallback to 0
              entityCount: c.entity_count ?? (c as Record<string, unknown>).entities_count as number ?? 0,
            })),
          });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to list entity collections' });
        });
      return true;
    }

    if (message.action === 'listEntities') {
      loadSettings()
        .then((settings) =>
          listEntities(settings.tl_api_key, message.collectionId, message.nameFilter)
        )
        .then((entities) => {
          sendResponse({
            success: true,
            entities: entities.map((e) => ({
              id: e._id,
              name: e.name,
              status: e.status,
              assetCount: e.asset_ids.length,
            })),
          });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to list entities' });
        });
      return true;
    }

    if (message.action === 'createEntityCollection') {
      loadSettings()
        .then((settings) => createEntityCollection(settings.tl_api_key, message.name))
        .then((collection) => {
          sendResponse({
            success: true,
            collection: { id: collection._id, name: collection.name, entityCount: 0 },
          });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to create entity collection' });
        });
      return true;
    }

    if (message.action === 'createEntity') {
      loadSettings()
        .then(async (settings) => {
          const apiKey = settings.tl_api_key;
          const assetIds: string[] = [];

          if (message.imageDataUrls) {
            for (const dataUrl of message.imageDataUrls) {
              const asset = await uploadAssetFromDataUrl(apiKey, dataUrl, 'image.jpg');
              assetIds.push(asset._id);
            }
          }

          if (message.imageUrls) {
            for (const url of message.imageUrls) {
              const asset = await uploadAssetFromUrl(apiKey, url);
              assetIds.push(asset._id);
            }
          }

          return createEntity(apiKey, message.collectionId, message.name, assetIds);
        })
        .then((entity) => {
          sendResponse({
            success: true,
            entity: {
              id: entity._id,
              name: entity.name,
              status: entity.status,
              assetCount: entity.asset_ids.length,
            },
          });
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : 'Failed to create entity';
          sendResponse({ success: false, error: errorMsg });
        });
      return true;
    }

    if (message.action === 'deleteEntity') {
      loadSettings()
        .then((settings) =>
          deleteEntity(settings.tl_api_key, message.collectionId, message.entityId)
        )
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to delete entity' });
        });
      return true;
    }

    return false;
  }
);
