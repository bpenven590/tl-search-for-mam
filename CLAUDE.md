# CLAUDE.md -- TL Search Extension

## What This Project Is

TwelveLabs Search for MAM is a Chromium browser extension that adds TwelveLabs semantic search (text and image) to MAM/DAM platforms. Users get a floating search panel or can intercept the platform's native search bar. Results deep link directly to assets with timestamps.

Works on any Chromium browser: Chrome, Edge, Brave, Arc.

**Currently supported platforms:**
- Iconik (`app.iconik.io`)

**Planned platforms:**
- Frame.io (`next.frame.io`)
- Mimir, Embrace, others as needed

The extension is platform-agnostic by design. Adding a new MAM means adding one config entry and one lookup resolver. All UI, search logic, and API calls stay the same.

---

## Repo Location

This project lives at `apps/tl-search-for-mam/` inside the `tl-product` monorepo. This ensures Claude Code picks up the Strand design system config from `.claude/` automatically:

- `.claude/rules/frontend.md` activates on `.tsx`, `.jsx`, `.css` files
- `.claude/skills/strand-design/instructions.md` has all tokens
- `.claude/skills/strand-design/examples.md` has UI patterns

The Strand Tailwind preset is imported for the popup. For content script UI injected via Shadow DOM, Strand CSS tokens are bundled as `styles/strand.css` and attached to each shadow root directly.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Manifest V3, Chrome Extensions API |
| UI | Shadow DOM + TwelveLabs Strand CSS tokens |
| Language | TypeScript, bundled with Vite |
| API calls | Background service worker (avoids CORS) |
| Storage | `chrome.storage.local` for settings |
| Testing | Vitest |

---

## Development Rules

1. **All UI injected into MAM pages MUST use Shadow DOM** to isolate from the host page's CSS
2. **All injected UI MUST use TwelveLabs Strand design tokens** for colors, typography, spacing, icons. No raw Tailwind. No custom colors. Dark mode required. Follow `.claude/skills/strand-design/` for tokens and patterns. Popup uses Strand Tailwind preset. Shadow DOM UI uses bundled `strand.css`.
3. **All API calls go through the background service worker** (background.ts), never from content scripts directly
4. **Never hardcode credentials** in source. All secrets come from `chrome.storage.local` entered by user in popup
5. **Never hardcode platform-specific logic outside of platform configs**. All MAM-specific behavior lives in `src/platforms/`
6. **All TwelveLabs API calls go through `src/api/twelvelabs.ts`**
7. **All MAM API calls go through `src/api/mam-client.ts`** which delegates to platform-specific resolvers
8. **Cache video_id to asset_id mappings** in the background worker to avoid repeated lookups
9. **Every module must have co-located tests**
10. **Run `npm test` after every code change**. Do not consider a task done until tests pass.
11. **Manifest V3 only**. No Manifest V2 patterns. No persistent background pages. Service worker only.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 BROWSER EXTENSION                 │
│                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Popup    │  │Content Script│  │ Background  │ │
│  │(Settings) │  │(UI overlay)  │  │  Worker     │ │
│  │           │  │              │  │             │ │
│  │ API keys  │  │ Shadow DOM   │  │ TL Search   │ │
│  │ Index IDs │  │ Strand theme │  │ MAM lookup  │ │
│  │ MAM creds │  │ Floating     │  │ Caching     │ │
│  │ Mode      │  │ panel OR     │  │             │ │
│  │ toggle    │  │ search bar   │  │             │ │
│  │           │  │ intercept    │  │             │ │
│  └──────────┘  └──────────────┘  └────────────┘ │
└──────────────────────────────────────────────────┘
```

### Message Flow

1. User types query in content script overlay
2. Content script sends message to background worker: `{ action: "search", query: "...", indexId: "..." }`
3. Background worker calls TwelveLabs Search API
4. Background worker deduplicates results by `video_id`
5. Background worker calls MAM API to resolve each `video_id` to a MAM `asset_id` (platform-specific)
6. Background worker returns enriched results to content script
7. Content script renders results with deep links

---

## Platform Config System

Every supported MAM is defined in `src/platforms/registry.ts`. Adding a new platform means:
1. Add a config entry to the registry
2. Create a resolver in `src/platforms/{name}/resolver.ts`
3. Add the hostname to `host_permissions` in `manifest.json`
4. Add a content script match pattern in `manifest.json`

### Platform Registry

```typescript
// src/platforms/registry.ts

export interface PlatformConfig {
  name: string;
  hostname: string;
  assetUrlPattern: string;               // {asset_id} and {start} are interpolated
  requiresCredentials: boolean;           // does lookup need MAM API creds?
  credentialFields: CredentialField[];    // what to show in popup settings
  searchBarSelector?: string;             // CSS selector for native search input (null = not supported yet)
}

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  "app.iconik.io": {
    name: "Iconik",
    hostname: "app.iconik.io",
    assetUrlPattern: "https://app.iconik.io/asset/{asset_id}?t={start}",
    requiresCredentials: true,
    credentialFields: [
      { key: "iconik_app_id", label: "App ID", type: "text", placeholder: "uuid" },
      { key: "iconik_auth_token", label: "Auth Token", type: "password", placeholder: "eyJ..." },
    ],
    searchBarSelector: null, // TBD: inspect Iconik DOM
  },
  "next.frame.io": {
    name: "Frame.io",
    hostname: "next.frame.io",
    assetUrlPattern: "https://next.frame.io/player/{asset_id}",
    requiresCredentials: false,  // asset_id comes from TL user_metadata directly
    credentialFields: [],
    searchBarSelector: null,
  },
};
```

### Platform Resolvers

Each platform has a resolver that takes TwelveLabs search results and returns MAM asset IDs.

```typescript
// src/platforms/iconik/resolver.ts

export interface ResolvedResult {
  tlVideoId: string;
  mamAssetId: string;
  deepLink: string;
}

// Iconik resolver: queries Iconik search API to find asset by TL_VIDEO_ID metadata
// POST https://app.iconik.io/API/search/v1/search/
// Body: { "query": "metadata.{videoIdField}:{video_id}" }
// Response: { "objects": [{ "id": "iconik-asset-uuid", ... }] }
// Asset ID at: response.objects[0].id
```

```typescript
// src/platforms/frameio/resolver.ts

// Frame.io resolver: reads asset_id directly from TL search result user_metadata.frame_id
// No MAM API call needed
```

---

## TwelveLabs API Reference

Base URL: `https://api.twelvelabs.io/v1.3`
Auth: `x-api-key: {api_key}` header.

### Text Search
```
POST /v1.3/search
Content-Type: multipart/form-data
x-api-key: {api_key}

index_id={index_id}
query_text={query}
search_options=visual
search_options=audio
include_user_metadata=true
page_limit=20
```

### Image Search
```
POST /v1.3/search
Content-Type: multipart/form-data
x-api-key: {api_key}

index_id={index_id}
query_media_type=image
query_media_url={image_url}
search_options=visual
include_user_metadata=true
page_limit=20
```

### Search Response Shape
```json
{
  "data": [
    {
      "rank": 1,
      "start": 7,
      "end": 13.75,
      "score": 0.95,
      "confidence": "high",
      "video_id": "69673f085859cae89d9e48be",
      "thumbnail_url": "https://prod-tl-emc-destination.s3...",
      "user_metadata": {
        "frame_id": "uuid",
        "filename": "video.mp4"
      }
    }
  ],
  "page_info": {
    "total_results": 42,
    "page_expired_at": "...",
    "next_page_token": "..."
  }
}
```

Key fields per segment: `rank`, `start`, `end`, `confidence`, `video_id`, `thumbnail_url`, `user_metadata`

---

## Iconik API Reference (for asset lookup)

### Search by metadata field
```
POST https://app.iconik.io/API/search/v1/search/
Headers:
  App-ID: {app_id}
  Auth-Token: {auth_token}
  Accept: application/json
  Content-Type: application/json
Body:
{
  "query": "metadata.TL_VIDEO_ID:{tl_video_id}"
}

Response:
{
  "objects": [
    {
      "id": "6fb8e922-f115-11f0-aa5a-2647c7bcfef7",
      "title": "soccer_highlights.mp4",
      ...
    }
  ]
}
```

Asset ID at `response.objects[0].id`.
The metadata field name (`TL_VIDEO_ID`) is configurable per platform in extension settings.

### Deep Link
```
https://app.iconik.io/asset/{asset_id}?t={start_seconds}
```
Timestamp parameter confirmed working. Player jumps to that second.

---

## Extension Settings Schema

Stored in `chrome.storage.local`:

```typescript
interface ExtensionSettings {
  // TwelveLabs
  tl_api_key: string;
  tl_indexes: Array<{
    id: string;
    label: string;
    default: boolean;
  }>;
  
  // Per-platform credentials
  platforms: {
    [hostname: string]: {
      enabled: boolean;
      credentials: Record<string, string>;
      videoIdField: string;   // metadata field name in MAM that stores TL video_id
    };
  };

  // UI preferences
  mode: "floating" | "intercept";
  hotkey: string;             // default: "Ctrl+Shift+F" (Mac: "Cmd+Shift+F")
  search_options: string[];   // ["visual", "audio"]
  theme: "dark" | "light" | "auto";
  page_limit: number;         // default: 20
}
```

Default settings:
```json
{
  "tl_api_key": "",
  "tl_indexes": [],
  "platforms": {
    "app.iconik.io": {
      "enabled": true,
      "credentials": {},
      "videoIdField": "TL_VIDEO_ID"
    }
  },
  "mode": "floating",
  "hotkey": "Ctrl+Shift+F",
  "search_options": ["visual", "audio"],
  "theme": "dark",
  "page_limit": 20
}
```

---

## UI Components (Strand Design System)

All injected UI uses Shadow DOM. Strand CSS tokens are bundled into the extension as `strand.css` and attached to each shadow root.

### Floating Search Panel
- Fixed position, bottom-right default, draggable
- Collapse/expand toggle (hotkey or click TL icon)
- Dark/light mode via Strand tokens
- Components inside:
  - **Search input**: text field with placeholder "Search videos..."
  - **Image drop zone**: drag image file or paste URL, small area below search input
  - **Index selector**: dropdown, only shows if multiple indexes configured
  - **Results list**: grouped by video
    - Video header: filename + asset thumbnail (from TL `thumbnail_url`)
    - Segments: time range badge, confidence badge, rank number
    - Click segment: opens `{assetUrl}?t={start}` in current tab (or new tab, configurable)
  - **Loading state**: Strand spinner
  - **Empty state**: "No results" with suggestions
  - **Error state**: invalid API key, network error, MAM lookup failed
  - **Pagination**: "Load more" button if `next_page_token` exists

### Search Bar Intercept Mode
- Detects MAM's native search input via `searchBarSelector` from platform config
- Injects a small TL toggle icon next to it
- When ON: keystrokes route to TwelveLabs search, results appear in dropdown below search bar
- When OFF: native search works normally
- Graceful degradation: if selector not found, fall back to floating panel with console warning
- **Risk**: MAM vendors can change their DOM. This mode is best-effort.

### Popup (Extension Icon Click)
- Settings form, one section per concern:
  - TwelveLabs: API key, add/remove indexes
  - Platform credentials: auto-detected based on which platforms are in registry, show fields from `credentialFields`
  - Preferences: mode toggle, theme toggle, hotkey
- Connection test button: validates TL API key + MAM credentials
- Status indicator per platform: connected / not connected / error

---

## Manifest V3

```json
{
  "manifest_version": 3,
  "name": "TwelveLabs Search for MAM",
  "version": "1.0.0",
  "description": "Semantic video search for your MAM, powered by TwelveLabs. Works with Iconik, Frame.io, and more.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.twelvelabs.io/*",
    "https://app.iconik.io/*",
    "https://next.frame.io/*"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://app.iconik.io/*",
        "https://next.frame.io/*"
      ],
      "js": ["dist/content.js"],
      "css": ["dist/strand.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/tl-16.png",
      "48": "icons/tl-48.png",
      "128": "icons/tl-128.png"
    }
  },
  "icons": {
    "16": "icons/tl-16.png",
    "48": "icons/tl-48.png",
    "128": "icons/tl-128.png"
  }
}
```

---

## Message Protocol (Content Script <-> Background Worker)

```typescript
// Content script -> Background worker
type SearchRequest = {
  action: "search";
  query: string;
  indexId: string;
  searchType: "text" | "image";
  imageUrl?: string;         // for image search
  pageToken?: string;        // for pagination
};

type ResolveRequest = {
  action: "resolve";
  videoIds: string[];        // deduplicated TL video_ids
  platform: string;          // hostname
};

type ValidateRequest = {
  action: "validate";
  tlApiKey: string;
  platformCredentials?: Record<string, string>;
  platform?: string;
};

// Background worker -> Content script
type SearchResponse = {
  success: boolean;
  results?: EnrichedResult[];
  pageInfo?: { nextPageToken?: string; totalResults: number };
  error?: string;
};

type EnrichedResult = {
  rank: number;
  start: number;
  end: number;
  confidence: string;
  score: number;
  videoId: string;
  thumbnailUrl: string;
  filename: string;
  mamAssetId: string;        // resolved from MAM API
  deepLink: string;          // full URL with timestamp
};
```

---

## Caching Strategy

Background worker maintains an in-memory cache:

```typescript
// video_id -> { mamAssetId, resolvedAt }
const assetIdCache = new Map<string, { mamAssetId: string; resolvedAt: number }>();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
```

On search:
1. TwelveLabs returns segments with `video_id` values
2. Deduplicate video_ids
3. Check cache for each video_id
4. Only call MAM API for uncached video_ids
5. Update cache with new resolutions
6. Return enriched results

Cache clears when service worker restarts (Manifest V3 behavior, this is fine).

---

## Project Structure

```
tl-product/
└── apps/
    └── tl-search-for-mam/
        ├── CLAUDE.md                          <- THIS FILE
        ├── manifest.json
        ├── popup.html
        ├── vite.config.ts
        ├── tsconfig.json
        ├── package.json
├── src/
│   ├── background/
│   │   ├── index.ts                   <- Service worker entry
│   │   ├── search-handler.ts          <- Handles search requests
│   │   ├── resolver-handler.ts        <- Handles MAM asset resolution
│   │   ├── cache.ts                   <- video_id -> asset_id cache
│   │   ├── test/
│   │   │   ├── search-handler.test.ts
│   │   │   ├── resolver-handler.test.ts
│   │   │   └── cache.test.ts
│   ├── content/
│   │   ├── index.ts                   <- Content script entry
│   │   ├── panel.ts                   <- Floating search panel
│   │   ├── intercept.ts               <- Search bar intercept mode
│   │   ├── results-renderer.ts        <- Renders search results
│   │   ├── image-dropzone.ts          <- Image drag/paste for image search
│   │   ├── shadow-dom.ts              <- Shadow DOM setup + Strand injection
│   │   ├── test/
│   │   │   ├── panel.test.ts
│   │   │   ├── results-renderer.test.ts
│   │   │   └── intercept.test.ts
│   ├── popup/
│   │   ├── index.ts                   <- Popup entry
│   │   ├── settings-form.ts           <- Settings UI
│   │   ├── connection-test.ts         <- Validate credentials
│   │   ├── test/
│   │   │   └── settings-form.test.ts
│   ├── api/
│   │   ├── twelvelabs.ts              <- TwelveLabs API wrapper
│   │   ├── mam-client.ts              <- Delegates to platform resolver
│   │   ├── test/
│   │   │   ├── twelvelabs.test.ts
│   │   │   └── mam-client.test.ts
│   ├── platforms/
│   │   ├── registry.ts                <- Platform config registry
│   │   ├── types.ts                   <- Shared platform types
│   │   ├── iconik/
│   │   │   ├── resolver.ts            <- Iconik: POST /API/search/v1/search/
│   │   │   └── resolver.test.ts
│   │   ├── frameio/
│   │   │   ├── resolver.ts            <- Frame.io: read user_metadata.frame_id
│   │   │   └── resolver.test.ts
│   ├── shared/
│   │   ├── messages.ts                <- Message type definitions
│   │   ├── settings.ts                <- Settings read/write from chrome.storage
│   │   ├── constants.ts               <- Defaults, URLs
│   │   └── utils.ts                   <- Time formatting, deduplication
├── styles/
│   └── strand.css                     <- Bundled Strand tokens for shadow DOM
├── icons/
│   ├── tl-16.png
│   ├── tl-48.png
│   └── tl-128.png
├── docs/
│   ├── iconik-workflow-reference.json <- Iconik N8N workflow for reference
│   └── adding-a-platform.md          <- Guide for adding new MAM support
└── tests/
    └── e2e/
        └── search-flow.test.ts        <- Full flow: search -> resolve -> deep link
```

---

## Build & Dev

```bash
# From tl-product root
cd apps/tl-search-for-mam

# Install
npm install

# Dev (watches + rebuilds)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select apps/tl-search-for-mam/dist/
# 5. After code changes: click refresh icon on the extension card
```

### Vite Config

Vite bundles three entry points:
- `src/background/index.ts` -> `dist/background.js`
- `src/content/index.ts` -> `dist/content.js`
- `src/popup/index.ts` -> `dist/popup.js`

Plus copies `manifest.json`, `popup.html`, `styles/`, and `icons/` to `dist/`.

---

## Testing Strategy

### Unit Tests (run after every change)
```bash
npm test
```
- Mock `chrome.storage.local` with a simple in-memory implementation
- Mock `chrome.runtime.sendMessage` / `onMessage`
- Mock `fetch` for API calls using `vi.fn()`
- Test each module independently

### Key Test Cases

**TwelveLabs API (`api/twelvelabs.test.ts`)**
- Text search: valid query returns results
- Image search: valid URL returns results
- Invalid API key returns error
- Network error handled gracefully
- Pagination token passed correctly

**Platform Resolvers (`platforms/iconik/resolver.test.ts`)**
- Valid video_id resolves to asset_id
- Unknown video_id returns null (not found in MAM)
- Multiple video_ids resolved in batch (deduplicated)
- MAM API error handled gracefully
- Cache hit skips API call

**Results Renderer (`content/results-renderer.test.ts`)**
- Results grouped by video_id
- Segments sorted by rank within each video
- Deep link constructed correctly with timestamp
- Empty results shows empty state
- Error results shows error state

**Settings (`popup/settings-form.test.ts`)**
- Save and load settings from chrome.storage
- Validate TL API key format
- Platform credentials show/hide based on enabled platforms

---

## Constants

```typescript
// TwelveLabs
export const TL_API_BASE = "https://api.twelvelabs.io/v1.3";
export const TL_SEARCH_ENDPOINT = "/search";

// Defaults
export const DEFAULT_PAGE_LIMIT = 20;
export const DEFAULT_SEARCH_OPTIONS = ["visual", "audio"];
export const DEFAULT_HOTKEY = "Ctrl+Shift+F";
export const DEFAULT_THEME = "dark";
export const DEFAULT_MODE = "floating";

// Cache
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Iconik defaults
export const ICONIK_DEFAULT_VIDEO_ID_FIELD = "TL_VIDEO_ID";
export const ICONIK_SEARCH_API = "https://app.iconik.io/API/search/v1/search/";
```

---

## Adding a New Platform (step by step)

1. Add entry to `src/platforms/registry.ts` with hostname, URL pattern, credential fields
2. Create `src/platforms/{name}/resolver.ts` implementing the `PlatformResolver` interface
3. Create `src/platforms/{name}/resolver.test.ts` with tests
4. Add hostname to `manifest.json` `host_permissions` and `content_scripts.matches`
5. Run `npm test` to verify nothing broke
6. Update popup settings UI to show the new platform's credential fields (automatic if registry is used correctly)
7. Document the platform's lookup method in `docs/adding-a-platform.md`

---

## Build Order for Claude Code

1. **Scaffold**: project structure, Vite config, manifest.json, TypeScript config, package.json
2. **Shared**: types, messages, constants, settings read/write, platform registry
3. **Background worker**: service worker, TwelveLabs search handler, cache
4. **Iconik resolver**: POST to Iconik search API, extract asset_id
5. **Content script**: Shadow DOM setup, floating panel with hardcoded results
6. **Wire it up**: content script sends search to background, background returns enriched results, content renders
7. **Popup**: settings form, save/load, connection test
8. **Image search**: drop zone in panel, image URL handling
9. **Search bar intercept mode**: detect Iconik search input, inject toggle
10. **Frame.io resolver**: read from user_metadata (second platform)
11. **Polish**: loading states, error states, pagination, keyboard shortcuts

Each step must include tests. Run `npm test` after every step.

## Video Seek

Iconik has no URL-based timestamp parameter. Use `#tl_seek={seconds}` hash fragment in the deep link URL. Content script detects the hash on page load and hashchange, finds the `<video>` element in the DOM (poll every 200ms until readyState >= 2), sets `video.currentTime = seconds`, then cleans up the hash via `history.replaceState`. Give up after 10 seconds.

Deep link format: `https://app.iconik.io/asset/{asset_id}#tl_seek=7`

Add `src/content/seek.ts` for this logic.

---

## Updates

### 2026-02-18: Entity Search & Entity Management

#### Overview

Users can create, browse, and search entities directly from the extension. Entities are people (or objects) that TwelveLabs can identify in videos via reference images. The extension provides entity management UI and entity-aware search.

#### UX Interactions

**"/" command menu (Entity Management)**

Typing "/" in the search input opens a command menu (like Claude's slash commands). One option: `Entities`. Selecting it opens the entity browser:

- Top level: list of entity collections (fetched from TL API)
- Click a collection: shows entities inside it, with search/filter by name
- Each entity shows: name, status badge (ready/processing), number of reference images
- Actions per entity: view images, delete
- "Create Entity" button inside a collection:
  - Name input
  - Image upload zone (drag/drop or file picker, up to 5 images)
  - Images are uploaded as TL assets first (POST /v1.3/assets), then entity is created with those asset_ids
- "Create Collection" button at top level:
  - Name input, creates via TL API

**"@" entity mention in search (Entity Search)**

Typing "@" in the search input triggers an entity selector dropdown:

- Shows all entity collections, click to expand and see entities inside
- Search/filter by entity name as you type after "@"
- Selecting an entity inserts `@EntityName` as a visual tag/chip in the search input
- User can then add optional text query after the entity tag
- On search: the query is built as `<@{entity_id}>{optional_text}` and sent to TwelveLabs search API

**Search modes:**
- Entity only: `<@entity_id>` (just the entity, no text)
- Entity + text: `<@entity_id> playing soccer` (entity in specific context)
- Regular text: no @ prefix, works as before

**Error handling:**
- If entity name already exists when creating, TwelveLabs returns an error. Show a friendly message: "An entity with this name already exists in this collection."
- If entity status is "processing", show badge but still allow selection for search (TL API handles it)

#### UX Details

- The "/" and "@" menus must be sleek, not intrusive. Appear inline with the search input, dismiss on Escape or click outside.
- Use Strand design tokens for all styling. Subtle animations on open/close.
- Entity chips in the search bar should have a distinct visual (Strand badge style, removable with x).
- The entity browser (from "/") should feel like a mini file explorer: clean, compact, scrollable.

#### TwelveLabs Entity API Reference

**List entity collections**
```
GET /v1.3/entity-collections
x-api-key: {api_key}
Query: page, page_limit

Response:
{
  "data": [
    {
      "_id": "69672e5d57fd0da405462c4e",
      "name": "Soccer Players",
      "entity_count": 12,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "page_info": { ... }
}
```

**Create entity collection**
```
POST /v1.3/entity-collections
x-api-key: {api_key}
Content-Type: application/json

{
  "name": "Soccer Players"
}

Response (201):
{
  "_id": "collection_id",
  "name": "Soccer Players"
}
```

**List entities in a collection**
```
GET /v1.3/entity-collections/{collection_id}/entities
x-api-key: {api_key}
Query: page, page_limit, name (filter), sort_by (created_at|updated_at|name), sort_option (asc|desc)

Response:
{
  "data": [
    {
      "_id": "6967359757fd0da405462f8a",
      "name": "Andriy Pyatov",
      "status": "ready",
      "asset_ids": ["asset1", "asset2"],
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "page_info": { ... }
}
```

**Create entity (single)**
```
POST /v1.3/entity-collections/{collection_id}/entities
x-api-key: {api_key}
Content-Type: application/json

{
  "name": "Andriy Pyatov",
  "asset_ids": ["asset_id_1", "asset_id_2"]
}

Response (201):
{
  "_id": "entity_id",
  "name": "Andriy Pyatov",
  "status": "processing",
  "asset_ids": ["asset_id_1", "asset_id_2"]
}
```

- Requires at least 1 asset_id, max 5 reference images recommended
- If entity name already exists in collection, API returns error. Handle gracefully.
- Status starts as "processing", becomes "ready" when usable for search.

**Upload image as TL asset (for entity reference images)**
```
POST /v1.3/assets
Content-Type: multipart/form-data
x-api-key: {api_key}

method=url
url={image_url}

# OR for local file:
method=direct
file=@image.jpg

Response (201):
{
  "_id": "asset_id",
  "status": "ready",
  "filename": "image.jpg",
  "file_type": "image/jpeg"
}
```

Wait for status "ready" before using asset_id in entity creation.

**Entity search query format**
```
POST /v1.3/search
Content-Type: multipart/form-data
x-api-key: {api_key}

index_id={index_id}
query_text=<@{entity_id}>{optional_text_query}
search_options=visual
include_user_metadata=true
page_limit=50
```

Examples:
- Entity only: `query_text=<@6967359757fd0da405462f8a>`
- Entity + text: `query_text=<@6967359757fd0da405462f8a> playing soccer`
- The `<@` and `>` markers are required around the entity_id.
- Requires Marengo 3.0 enabled on the index.

#### New Files

```
src/content/
  command-menu.ts              <- "/" command handler, entity browser UI
  entity-selector.ts           <- "@" entity mention dropdown
  entity-chip.ts               <- Visual tag/chip component for selected entity in search bar

src/api/
  twelvelabs-entities.ts       <- Entity collections + entities CRUD

src/content/test/
  command-menu.test.ts
  entity-selector.test.ts
```

#### New Message Types

```typescript
// Content -> Background
type ListEntityCollectionsRequest = {
  action: "listEntityCollections";
};

type ListEntitiesRequest = {
  action: "listEntities";
  collectionId: string;
  nameFilter?: string;
};

type CreateEntityCollectionRequest = {
  action: "createEntityCollection";
  name: string;
};

type CreateEntityRequest = {
  action: "createEntity";
  collectionId: string;
  name: string;
  imageFiles?: File[];       // local files
  imageUrls?: string[];      // or URLs
};

type UploadAssetRequest = {
  action: "uploadAsset";
  method: "direct" | "url";
  file?: File;
  url?: string;
};

// Background -> Content
type EntityCollectionsResponse = {
  success: boolean;
  collections?: Array<{ id: string; name: string; entityCount: number }>;
  error?: string;
};

type EntitiesResponse = {
  success: boolean;
  entities?: Array<{ id: string; name: string; status: string; assetCount: number }>;
  error?: string;
};

type CreateEntityResponse = {
  success: boolean;
  entity?: { id: string; name: string; status: string };
  error?: string;  // includes "already exists" friendly message
};
```

#### Entity Creation Flow (step by step)

1. User opens "/" menu, navigates to a collection, clicks "Create Entity"
2. User enters name + drops/selects up to 5 images
3. For each image:
   - If local file: `POST /v1.3/assets` with `method=direct`, `file=@image`
   - If URL: `POST /v1.3/assets` with `method=url`, `url={url}`
   - Wait for each asset status to be "ready"
4. Collect all asset_ids
5. `POST /v1.3/entity-collections/{collection_id}/entities` with `name` and `asset_ids`
6. If success: show entity in list with "processing" badge
7. If error (name exists): show friendly error, don't close the form
8. Entity becomes searchable via "@" once status is "ready"

#### Settings Addition

Add to extension settings:
```typescript
// In ExtensionSettings
entity_collections: Array<{
  id: string;
  label: string;
}>;
// These can be auto-discovered from TL API and cached.
// User can also manually add collection IDs in popup settings.
```