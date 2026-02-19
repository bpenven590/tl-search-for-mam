# TwelveLabs Search for MAM

A Chromium browser extension that adds TwelveLabs semantic video search to MAM/DAM platforms. Search by text or image, tag entities in queries, manage entity collections, and jump directly to the right moment in your assets via deep links with timestamps.

Works on Chrome, Arc, Brave, Edge, Comet, and any Chromium-based browser.

**Supported platforms**
- Iconik (`app.iconik.io`)

---

## Installation

No build step required — the `dist/` folder is ready to load.

1. Clone or download this repo
2. Open `chrome://extensions` (or your browser's equivalent)
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `apps/tl-search-for-mam/dist/` folder

The TwelveLabs icon appears in your toolbar.

---

## Setup

Click the extension icon to open Settings.

### TwelveLabs

| Field | Description |
|-------|-------------|
| API Key | Your TwelveLabs API key (`tlk_...`) |
| Indexes | Add one or more index IDs with a display label |

Use the **Test** button to verify your API key connects.

### Iconik

| Field | Description |
|-------|-------------|
| Enabled | Toggle to activate the panel on `app.iconik.io` |
| App ID | Your Iconik App ID (UUID) |
| Auth Token | Your Iconik Auth Token (`eyJ...`) |
| TL Video ID metadata field | The Iconik metadata field storing the TwelveLabs `video_id` (default: `TL_VIDEO_ID`) |

### Preferences

| Field | Description |
|-------|-------------|
| Theme | Dark or Light — persists across sessions |

### Export / Import

Use **Export Config** to download your full settings as `tl-search-config.json` — useful for backing up or sharing across browsers/machines.

Use **Import Config** to load a previously exported file. The form reloads immediately with the imported values.

Click **Save Settings** when done.

---

## Features

### Text search

Type a query and press **Enter** or click **Search**. Results are ranked by semantic relevance and grouped by video.

### Image search

Click the image icon inside the search bar, select an image file. A thumbnail preview appears. Optionally add a text query to combine both signals, then click **Search**.

### Entity search (`@` mention)

Entities are named subjects — people, talent, on-screen personalities — that TwelveLabs recognizes visually. Once you register an entity with reference images, you can filter any search to only show moments where that person appears.

**How it works:**
1. Create an entity collection (e.g. "Talent", "Athletes", "Executives")
2. Add entities to the collection, each with 1–5 reference face images
3. TwelveLabs processes the images and learns to recognize that person in your videos
4. Tag the entity in a search to scope results to segments where they appear

**Tagging an entity in a query:**

Type `@` in the search bar to open the entity selector:

- Browse collections → click a collection to expand it and see its entities
- Click an entity to tag it — it appears as a chip (`@Name`) in the search bar
- Searches are now scoped to that entity — only segments where the person appears are returned
- Combine with a text query (e.g. `@John speaking on stage`) for compound filtering
- Press **Escape** or click `×` on the chip to remove the entity filter
- The `@` is automatically cleaned up when you dismiss without selecting

**Navigation within the entity selector:**
- `← Collections` header appears when a collection is expanded — click to go back to the full list
- **Manage entities** at the bottom opens the full entity browser
- Once in the entity browser, `← Back to search` returns you to the `@` selector without losing your query

### Manage Entities browser

Accessible via `@` → **Manage entities**, or directly via `⊞` in the search bar. Full CRUD for entity collections and entities.

**Collections view**
- Lists all entity collections with live entity counts
- **New Collection** — opens the create form; on success navigates directly into the new collection
- `←` Back to search (when opened via `@` mention) — returns to the entity selector
- `×` closes the panel entirely

**Entities view (inside a collection)**
- Lists entities with status badges: `ready` (recognized and searchable) or `processing` (images still indexing)
- Filter bar — type to search within the collection by name
- **New Entity** — opens the create form
- Delete button (revealed on hover) — removes the entity immediately
- `←` goes back to collections
- `×` closes the panel

**Create Entity form**
- Name input with inline validation (e.g. flags duplicate names before submitting)
- Upload up to 5 reference images — drag-and-drop or file picker
- Use clear, well-lit face shots for best recognition accuracy
- `←` goes back without saving
- `×` closes the panel

**Create Collection form**
- Name input with inline validation
- `←` goes back without saving
- `×` closes the panel

### Results

- Results grouped by video with filename and timestamp range
- Click any result to navigate to the asset at the exact second
- **Load more** fetches the next page
- **Clear** wipes results and resets the search bar
- Results persist across page navigations within the same tab (30-minute session)

### Panel controls

| Control | Action |
|---------|--------|
| S / M / L / ⛶ | Resize the panel (persisted across sessions) |
| ☼ / ☽ | Toggle light / dark theme (persisted) |
| − | Collapse to header only |
| Drag header | Reposition the panel anywhere on screen |

**Smart viewport clamping** — the panel never overflows the screen:
- Default position (`bottom-right`): grows upward, capped to viewport height
- After dragging: automatically snaps to top or bottom anchor based on where the header lands, so results always expand toward the center of the screen

---

## How it works

```
User query
    ↓
Content script (panel.ts)
    ↓  chrome.runtime.sendMessage
Background service worker
    ↓  POST /v1.3/search
TwelveLabs API  →  video_id + thumbnail + timestamps
    ↓  POST /API/search/v1/search/
Iconik API      →  asset_id + asset title
    ↓
Enriched results with deep links
    ↓  sendResponse
Content script renders results
```

All API calls go through the background service worker to avoid CORS. Resolved `video_id → asset_id` mappings are cached in memory for 30 minutes.

Entity collections and entities are stored and managed via the TwelveLabs API, accessed through the background worker using dedicated message actions (`listEntityCollections`, `listEntities`, `createEntityCollection`, `createEntity`, `deleteEntity`).

---

## Adding a new platform

1. Add an entry to `src/platforms/registry.ts` with hostname, URL pattern, and credential fields
2. Create `src/platforms/{name}/resolver.ts` implementing `PlatformResolver`
3. Add tests at `src/platforms/{name}/resolver.test.ts`
4. Add the hostname to `manifest.json` → `host_permissions` and `content_scripts.matches`
5. Run `npm test`

See `docs/adding-a-platform.md` for a step-by-step guide.

---

## Development

```bash
npm install
npm run dev        # Watch mode — rebuilds on file changes
npm test           # Run all tests (87 tests across 13 files)
npm run test:watch # Tests in watch mode
npm run build      # Production build → dist/
```

After building, click the refresh icon on the extension card in `chrome://extensions`, then hard-refresh the MAM tab (`Cmd+Shift+R`).

### Project structure

```
src/
├── background/     # Service worker — TL search, MAM lookup, entity CRUD, caching
├── content/        # Injected UI — floating panel, entity selector, command menu, results
├── popup/          # Extension popup — settings form, connection test
├── api/            # TwelveLabs and MAM API clients
├── platforms/      # Platform registry + per-platform resolvers (Iconik, Frame.io)
└── shared/         # Types, settings, constants, utils
```

### Tech stack

| Layer | Technology |
|-------|------------|
| Extension | Manifest V3, Chrome Extensions API |
| Language | TypeScript |
| Bundler | Vite (3 entry points: background, content, popup) |
| UI | Shadow DOM + TwelveLabs Strand CSS tokens |
| Testing | Vitest |
| Storage | `chrome.storage.local` |
