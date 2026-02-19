import type {
  EntityCollection,
  Entity,
  EntityCollectionsResponse,
  EntitiesResponse,
  CreateEntityCollectionResponse,
  CreateEntityResponse,
  DeleteEntityResponse,
} from '../shared/messages';

const LIGHT_VARS = `
  :host {
    --color-bg: #ffffff;
    --color-surface: #f5f5f5;
    --color-border: #e0e0e0;
    --color-text-primary: #111111;
    --color-text-secondary: #666666;
  }
`;

const MENU_STYLES = `
  :host {
    display: block;
    font-family: var(--font-system, system-ui, sans-serif);
  }
  .cmd-picker {
    width: 100%;
    pointer-events: auto;
    background: var(--color-bg, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    overflow: hidden;
  }
  .cmd-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-text-primary, #fff);
    transition: background 0.12s;
  }
  .cmd-row:hover { background: var(--color-surface, #222); }
  .cmd-icon { font-size: 16px; flex-shrink: 0; }
  .cmd-label { font-weight: 600; }
  .cmd-desc { font-size: 11px; color: var(--color-text-secondary, #aaa); margin-top: 1px; }
  .browser-panel {
    width: 100%;
    max-height: 420px;
    pointer-events: auto;
    background: var(--color-bg, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .browser-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border, #333);
    background: var(--color-surface, #222);
    flex-shrink: 0;
  }
  .browser-title { flex: 1; font-size: 13px; font-weight: 600; color: var(--color-text-primary, #fff); }
  .browser-body { flex: 1; overflow-y: auto; }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-text-primary, #fff);
    border-bottom: 1px solid var(--color-border, #222);
    transition: background 0.12s;
  }
  .row:hover { background: var(--color-surface, #222); }
  .row-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--color-surface, #333);
    color: var(--color-text-secondary, #aaa);
    flex-shrink: 0;
  }
  .chevron { color: var(--color-text-secondary, #666); flex-shrink: 0; font-size: 12px; }
  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .btn-icon:hover { background: var(--color-border, #333); color: var(--color-text-primary, #fff); }
  .btn-accent {
    background: var(--color-accent, #00DC82);
    color: #000;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }
  .btn-accent:hover { opacity: 0.9; }
  .btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }
  .input-field {
    width: 100%;
    background: var(--color-surface, #222);
    border: 1px solid var(--color-border, #333);
    border-radius: 6px;
    padding: 6px 10px;
    color: var(--color-text-primary, #fff);
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }
  .input-field:focus { border-color: var(--color-accent, #00DC82); }
  .input-field::placeholder { color: var(--color-text-secondary, #666); }
  .error-msg { font-size: 11px; color: #ff5050; padding: 4px 0; }
  .form-section { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .upload-zone {
    border: 1px dashed var(--color-border, #444);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    font-size: 12px;
    transition: border-color 0.15s;
  }
  .upload-zone:hover { border-color: var(--color-accent, #00DC82); }
  .thumb-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; }
  .spinner-sm {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-border, #333);
    border-top-color: var(--color-accent, #00DC82);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status-ready { background: rgba(0,220,130,0.2); color: #00DC82; font-size: 10px; padding: 1px 5px; border-radius: 999px; }
  .status-processing { background: rgba(255,180,0,0.2); color: #ffb400; font-size: 10px; padding: 1px 5px; border-radius: 999px; }
  .empty-msg { text-align: center; padding: 20px 12px; font-size: 12px; color: var(--color-text-secondary, #aaa); }
  .loading-row { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; font-size: 12px; color: var(--color-text-secondary, #aaa); }
  .btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #666);
    font-size: 12px;
    padding: 2px 5px;
    border-radius: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .row:hover .btn-delete { opacity: 1; }
  .btn-delete:hover { color: #ff5050; background: rgba(255,80,80,0.1); }
`;

function sendMsg<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? 'Message send failed'));
        return;
      }
      resolve(response);
    });
  });
}

type BrowserView = 'collections' | 'entities' | 'createCollection' | 'createEntity';

export interface AnchorRect {
  top: number; bottom: number; left: number; right: number; width: number;
}

export class CommandMenu {
  private getAnchorRect: () => AnchorRect;
  private onDismiss: () => void;
  private onBack: (() => void) | null = null;
  // Each show() mounts a fresh host div directly on document.body with
  // position:fixed at viewport coords. The host's own shadow root provides
  // style isolation. No positioning happens inside the shadow.
  private hostEl: HTMLElement | null = null;
  private hostShadow: ShadowRoot | null = null;
  private containerEl: HTMLElement | null = null;
  private escHandler: ((e: KeyboardEvent) => void) | null = null;
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private light = false;

  // Entity browser state
  private currentView: BrowserView = 'collections';
  private collections: EntityCollection[] = [];
  private entities: Entity[] = [];
  private activeCollectionId = '';
  private activeCollectionName = '';
  private nameFilter = '';
  private selectedImages: Array<{ name: string; dataUrl: string }> = [];

  constructor(
    getAnchorRect: HTMLElement | (() => AnchorRect),
    onDismiss: () => void,
    light?: boolean,
    onBack?: () => void,
  ) {
    // Accept either an element (for tests) or a rect-getter function (for production)
    this.getAnchorRect = typeof getAnchorRect === 'function'
      ? getAnchorRect
      : () => {
          const r = getAnchorRect.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width };
        };
    this.onDismiss = onDismiss;
    this.light = light ?? false;
    this.onBack = onBack ?? null;
  }

  /** For tests: returns the shadow root hosting the menu content. */
  getShadow(): ShadowRoot | null {
    return this.hostShadow;
  }

  showCommandPicker(): void {
    this.removeExisting();
    const shadow = this.mountHost(false);

    const picker = document.createElement('div');
    picker.className = 'cmd-picker';
    picker.setAttribute('data-testid', 'cmd-picker');

    const row = document.createElement('div');
    row.className = 'cmd-row';
    row.setAttribute('data-testid', 'cmd-entities');
    row.innerHTML = `
      <span class="cmd-icon">\u229E</span>
      <div>
        <div class="cmd-label">Entities</div>
        <div class="cmd-desc">Browse and manage entity collections</div>
      </div>
    `;
    row.addEventListener('click', () => this.openEntityBrowser());
    picker.appendChild(row);

    this.containerEl = picker;
    shadow.appendChild(picker);
    this.attachDismissListeners();
  }

  /** Opens the entity browser directly, skipping the command picker. */
  showEntityBrowser(): void {
    this.openEntityBrowser();
  }

  dismiss(): void {
    this.removeExisting();
    this.onDismiss();
  }

  isVisible(): boolean {
    return this.hostEl !== null;
  }

  // --- Private: Entity Browser ---

  private openEntityBrowser(): void {
    this.currentView = 'collections';
    this.renderBrowser();
    this.fetchCollections();
  }

  private renderBrowser(): void {
    this.removeExisting();
    const shadow = this.mountHost(true);

    const panel = document.createElement('div');
    panel.className = 'browser-panel';
    panel.setAttribute('data-testid', 'entity-browser');

    this.containerEl = panel;
    shadow.appendChild(panel);
    this.attachDismissListeners();

    this.renderCurrentView();
  }

  private renderCurrentView(): void {
    if (!this.containerEl) return;

    switch (this.currentView) {
      case 'collections':
        this.renderCollectionsView();
        break;
      case 'entities':
        this.renderEntitiesView();
        break;
      case 'createCollection':
        this.renderCreateCollectionForm();
        break;
      case 'createEntity':
        this.renderCreateEntityForm();
        break;
    }
  }

  private renderCollectionsView(): void {
    const panel = this.containerEl!;
    panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'browser-header';

    // Back-to-search button (only when opened from @ mention flow)
    if (this.onBack) {
      const backBtn = document.createElement('button');
      backBtn.className = 'btn-icon';
      backBtn.textContent = '\u2190';
      backBtn.title = 'Back to search';
      backBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.removeExisting();
        this.onBack!();
      });
      header.appendChild(backBtn);
    }

    const title = document.createElement('span');
    title.className = 'browser-title';
    title.textContent = 'Entities';
    header.appendChild(title);

    const newBtn = document.createElement('button');
    newBtn.className = 'btn-accent';
    newBtn.textContent = 'New Collection';
    newBtn.setAttribute('data-testid', 'new-collection-btn');
    newBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.currentView = 'createCollection';
      this.renderCurrentView();
    });
    header.appendChild(newBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-icon';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.dismiss());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'browser-body';
    body.setAttribute('data-testid', 'collections-list');

    if (this.collections.length === 0) {
      body.innerHTML = '<div class="empty-msg">No collections yet</div>';
    } else {
      for (const col of this.collections) {
        const row = document.createElement('div');
        row.className = 'row';
        row.setAttribute('data-testid', `collection-${col.id}`);
        row.innerHTML = `
          <span class="row-name">${this.esc(col.name)}</span>
          <span class="badge">${col.entityCount}</span>
          <span class="chevron">\u203A</span>
        `;
        row.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.activeCollectionId = col.id;
          this.activeCollectionName = col.name;
          this.currentView = 'entities';
          this.nameFilter = '';
          this.renderCurrentView();
          void this.fetchEntities();
        });
        body.appendChild(row);
      }
    }

    panel.appendChild(body);
  }

  private renderEntitiesView(): void {
    const panel = this.containerEl!;
    panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'browser-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-icon';
    backBtn.textContent = '\u2190';
    backBtn.title = 'Back to collections';
    backBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.currentView = 'collections';
      this.renderCurrentView();
      // Restore scroll so the previously active collection is visible.
      const body = this.containerEl?.querySelector<HTMLElement>('.browser-body');
      const activeRow = body?.querySelector<HTMLElement>(
        `[data-testid="collection-${this.activeCollectionId}"]`,
      );
      if (body && activeRow) {
        const bodyTop = body.getBoundingClientRect().top;
        const rowTop = activeRow.getBoundingClientRect().top;
        body.scrollTop = rowTop - bodyTop;
      }
    });
    header.appendChild(backBtn);

    const title = document.createElement('span');
    title.className = 'browser-title';
    title.textContent = this.activeCollectionName;
    header.appendChild(title);

    const newBtn = document.createElement('button');
    newBtn.className = 'btn-accent';
    newBtn.textContent = 'New Entity';
    newBtn.setAttribute('data-testid', 'new-entity-btn');
    newBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.selectedImages = [];
      this.currentView = 'createEntity';
      this.renderCurrentView();
    });
    header.appendChild(newBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-icon';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.dismiss());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Filter input
    const filterWrap = document.createElement('div');
    filterWrap.style.cssText = 'padding: 8px 12px; border-bottom: 1px solid var(--color-border, #333);';

    const filterInput = document.createElement('input');
    filterInput.className = 'input-field';
    filterInput.placeholder = 'Filter by name...';
    filterInput.value = this.nameFilter;
    filterInput.addEventListener('input', () => {
      this.nameFilter = filterInput.value;
      this.renderEntityRows(body);
    });
    filterInput.addEventListener('keydown', (e) => e.stopPropagation());
    filterInput.addEventListener('keyup', (e) => e.stopPropagation());
    filterInput.addEventListener('keypress', (e) => e.stopPropagation());
    filterWrap.appendChild(filterInput);
    panel.appendChild(filterWrap);

    // Body
    const body = document.createElement('div');
    body.className = 'browser-body';
    body.setAttribute('data-testid', 'entities-list');
    panel.appendChild(body);

    this.renderEntityRows(body);
  }

  private renderEntityRows(body: HTMLElement): void {
    body.innerHTML = '';

    const filtered = this.nameFilter
      ? this.entities.filter((e) => e.name.toLowerCase().includes(this.nameFilter.toLowerCase()))
      : this.entities;

    if (filtered.length === 0) {
      body.innerHTML = `<div class="empty-msg">${this.entities.length === 0 ? 'No entities yet' : 'No matches'}</div>`;
      return;
    }

    for (const entity of filtered) {
      const row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('data-testid', `entity-${entity.id}`);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'row-name';
      nameSpan.textContent = entity.name;
      row.appendChild(nameSpan);

      const statusSpan = document.createElement('span');
      statusSpan.className = entity.status === 'ready' ? 'status-ready' : 'status-processing';
      statusSpan.textContent = entity.status;
      row.appendChild(statusSpan);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = '\u2715';
      delBtn.title = 'Delete entity';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteEntity(entity.id);
      });
      row.appendChild(delBtn);

      body.appendChild(row);
    }
  }

  private renderCreateCollectionForm(): void {
    const panel = this.containerEl!;
    panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'browser-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-icon';
    backBtn.textContent = '\u2190';
    backBtn.title = 'Back';
    backBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.currentView = 'collections';
      this.renderCurrentView();
    });
    header.appendChild(backBtn);

    const title = document.createElement('span');
    title.className = 'browser-title';
    title.textContent = 'New Collection';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-icon';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.dismiss());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Form
    const form = document.createElement('div');
    form.className = 'form-section';

    const nameInput = document.createElement('input');
    nameInput.className = 'input-field';
    nameInput.placeholder = 'Collection name';
    nameInput.setAttribute('data-testid', 'collection-name-input');
    nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    nameInput.addEventListener('keyup', (e) => e.stopPropagation());
    nameInput.addEventListener('keypress', (e) => e.stopPropagation());
    form.appendChild(nameInput);

    const errorEl = document.createElement('div');
    errorEl.className = 'error-msg';
    errorEl.style.display = 'none';
    errorEl.setAttribute('data-testid', 'collection-error');
    form.appendChild(errorEl);

    const createBtn = document.createElement('button');
    createBtn.className = 'btn-accent';
    createBtn.textContent = 'Create';
    createBtn.setAttribute('data-testid', 'create-collection-btn');
    createBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) return;

      createBtn.disabled = true;
      createBtn.innerHTML = '<span class="spinner-sm"></span> Creating...';
      errorEl.style.display = 'none';

      try {
        const resp = await sendMsg<CreateEntityCollectionResponse>({
          action: 'createEntityCollection',
          name,
        });
        if (resp.success && resp.collection) {
          this.collections.push(resp.collection);
          // Navigate directly into the new collection so the user can add entities immediately
          this.activeCollectionId = resp.collection.id;
          this.activeCollectionName = resp.collection.name;
          this.entities = [];
          this.nameFilter = '';
          this.currentView = 'entities';
          this.renderCurrentView();
          void this.fetchEntities();
        } else {
          errorEl.textContent = resp.error ?? 'Failed to create collection';
          errorEl.style.display = '';
          createBtn.disabled = false;
          createBtn.textContent = 'Create';
        }
      } catch (err) {
        errorEl.textContent = err instanceof Error ? err.message : 'Failed to create collection';
        errorEl.style.display = '';
        createBtn.disabled = false;
        createBtn.textContent = 'Create';
      }
    });
    form.appendChild(createBtn);

    panel.appendChild(form);
  }

  private renderCreateEntityForm(): void {
    const panel = this.containerEl!;
    panel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'browser-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-icon';
    backBtn.textContent = '\u2190';
    backBtn.title = 'Back';
    backBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.currentView = 'entities';
      this.renderCurrentView();
    });
    header.appendChild(backBtn);

    const title = document.createElement('span');
    title.className = 'browser-title';
    title.textContent = 'Create Entity';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-icon';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.dismiss());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Form
    const form = document.createElement('div');
    form.className = 'form-section';

    const nameInput = document.createElement('input');
    nameInput.className = 'input-field';
    nameInput.placeholder = 'Entity name';
    nameInput.setAttribute('data-testid', 'entity-name-input');
    nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    nameInput.addEventListener('keyup', (e) => e.stopPropagation());
    nameInput.addEventListener('keypress', (e) => e.stopPropagation());
    form.appendChild(nameInput);

    // Image upload zone
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';

    const uploadZone = document.createElement('div');
    uploadZone.className = 'upload-zone';
    uploadZone.setAttribute('data-testid', 'upload-zone');
    uploadZone.textContent = 'Drop images here or click to browse (up to 5)';
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = 'var(--color-accent, #00DC82)';
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.style.borderColor = '';
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '';
      const files = e.dataTransfer?.files;
      if (files) this.processImageFiles(Array.from(files), thumbRow);
    });

    form.appendChild(uploadZone);
    form.appendChild(fileInput);

    const thumbRow = document.createElement('div');
    thumbRow.className = 'thumb-row';
    thumbRow.setAttribute('data-testid', 'thumb-row');
    form.appendChild(thumbRow);

    fileInput.addEventListener('change', () => {
      const files = fileInput.files;
      if (files) this.processImageFiles(Array.from(files), thumbRow);
    });

    const errorEl = document.createElement('div');
    errorEl.className = 'error-msg';
    errorEl.style.display = 'none';
    errorEl.setAttribute('data-testid', 'entity-error');
    form.appendChild(errorEl);

    const createBtn = document.createElement('button');
    createBtn.className = 'btn-accent';
    createBtn.textContent = 'Create';
    createBtn.setAttribute('data-testid', 'create-entity-btn');
    createBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) return;

      createBtn.disabled = true;
      createBtn.innerHTML = '<span class="spinner-sm"></span> Creating...';
      errorEl.style.display = 'none';

      try {
        const resp = await sendMsg<CreateEntityResponse>({
          action: 'createEntity',
          collectionId: this.activeCollectionId,
          name,
          imageDataUrls: this.selectedImages.map((img) => img.dataUrl),
        });
        if (resp.success) {
          // Re-fetch entities and go back to the list
          this.currentView = 'entities';
          this.renderCurrentView();
          this.fetchEntities();
        } else {
          const msg = resp.error ?? 'Failed to create entity';
          errorEl.textContent = msg.includes('already exists')
            ? 'An entity with this name already exists in this collection.'
            : msg;
          errorEl.style.display = '';
          createBtn.disabled = false;
          createBtn.textContent = 'Create';
        }
      } catch (err) {
        errorEl.textContent = err instanceof Error ? err.message : 'Failed to create entity';
        errorEl.style.display = '';
        createBtn.disabled = false;
        createBtn.textContent = 'Create';
      }
    });
    form.appendChild(createBtn);

    panel.appendChild(form);
  }

  // --- Data fetching ---

  private async fetchCollections(): Promise<void> {
    const body = this.containerEl?.querySelector<HTMLElement>('.browser-body');
    if (body) body.innerHTML = '<div class="loading-row"><span class="spinner-sm"></span> Loading...</div>';

    try {
      const resp = await sendMsg<EntityCollectionsResponse>({ action: 'listEntityCollections' });
      if (resp.success && resp.collections) {
        this.collections = resp.collections;
      } else {
        this.collections = [];
      }
    } catch {
      this.collections = [];
    }

    if (this.currentView === 'collections') {
      this.renderCollectionsView();
    }

    // Fetch actual entity counts in parallel (API often returns 0 for entity_count)
    void this.refreshEntityCounts();
  }

  /** Fetches entity counts for all collections in parallel and patches badges directly in the DOM. */
  private refreshEntityCounts(): void {
    for (const col of this.collections) {
      void (async () => {
        try {
          const resp = await sendMsg<EntitiesResponse>({
            action: 'listEntities',
            collectionId: col.id,
          });
          if (resp.success && resp.entities) {
            col.entityCount = resp.entities.length;
            // Patch the badge element directly — no full re-render needed
            const badge = this.containerEl?.querySelector<HTMLElement>(
              `[data-testid="collection-${col.id}"] .badge`,
            );
            if (badge) badge.textContent = String(col.entityCount);
          }
        } catch { /* ignore */ }
      })();
    }
  }

  private async fetchEntities(): Promise<void> {
    const body = this.containerEl?.querySelector<HTMLElement>('.browser-body');
    if (body) body.innerHTML = '<div class="loading-row"><span class="spinner-sm"></span> Loading...</div>';

    try {
      const resp = await sendMsg<EntitiesResponse>({
        action: 'listEntities',
        collectionId: this.activeCollectionId,
      });
      if (resp.success && resp.entities) {
        this.entities = resp.entities;
      } else {
        this.entities = [];
      }
    } catch {
      this.entities = [];
    }

    // Update the stored collection count with the real entity count
    const col = this.collections.find((c) => c.id === this.activeCollectionId);
    if (col) col.entityCount = this.entities.length;

    if (this.currentView === 'entities') {
      this.renderEntitiesView();
    }
  }

  private async deleteEntity(entityId: string): Promise<void> {
    try {
      const resp = await sendMsg<DeleteEntityResponse>({
        action: 'deleteEntity',
        collectionId: this.activeCollectionId,
        entityId,
      });
      if (resp.success) {
        this.entities = this.entities.filter((e) => e.id !== entityId);
        // Update collection count
        const col = this.collections.find((c) => c.id === this.activeCollectionId);
        if (col) col.entityCount = this.entities.length;
        const body = this.containerEl?.querySelector<HTMLElement>('[data-testid="entities-list"]');
        if (body) this.renderEntityRows(body);
      }
    } catch {
      // Silently fail - entity might already be deleted
    }
  }

  // --- Image processing ---

  private processImageFiles(files: File[], thumbRow: HTMLElement): void {
    const remaining = 5 - this.selectedImages.length;
    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.selectedImages.push({ name: file.name, dataUrl: reader.result });
          this.renderThumbnails(thumbRow);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  private renderThumbnails(thumbRow: HTMLElement): void {
    thumbRow.innerHTML = '';
    for (const img of this.selectedImages) {
      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = img.dataUrl;
      thumb.alt = img.name;
      thumb.title = img.name;
      thumbRow.appendChild(thumb);
    }
  }

  // --- Mounting & dismiss ---

  /**
   * Creates a host div on document.body with position:fixed at the correct
   * viewport coordinates, attaches a shadow root to it for style isolation,
   * and injects the shared stylesheet. The shadow content uses no extra
   * positioning — it just flows naturally inside the host.
   */
  private mountHost(isBrowser: boolean): ShadowRoot {
    const rect = this.getAnchorRect();
    const maxHeight = isBrowser ? 420 : 200;
    const elWidth = isBrowser ? 340 : 260;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Anchor the host's BOTTOM edge just above the anchor (panel top) so the
    // menu grows upward. Using `bottom` means the menu stays flush against the
    // panel regardless of how many rows are rendered.
    let positionCss: string;
    if (spaceBelow >= maxHeight + 8) {
      // Enough room below the anchor — show below
      positionCss = `top:${rect.bottom + 6}px`;
    } else {
      // Anchor bottom of menu to top of panel with a small gap
      const distFromBottom = window.innerHeight - rect.top + 6;
      positionCss = `bottom:${distFromBottom}px;max-height:${Math.min(maxHeight, rect.top - 16)}px`;
    }

    // Right-align to the panel's right edge (the anchor is this.panel)
    let left = rect.right - elWidth;
    left = Math.max(8, left);

    const hostEl = document.createElement('div');
    hostEl.style.cssText = [
      'position:fixed',
      positionCss,
      `left:${left}px`,
      `width:${elWidth}px`,
      'z-index:2147483648',
      'pointer-events:auto',
    ].join(';');

    document.body.appendChild(hostEl);

    const shadow = hostEl.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = MENU_STYLES;
    shadow.appendChild(styleEl);

    if (this.light) {
      const lightEl = document.createElement('style');
      lightEl.textContent = LIGHT_VARS;
      shadow.appendChild(lightEl);
    }

    this.hostEl = hostEl;
    this.hostShadow = shadow;

    return shadow;
  }

  private attachDismissListeners(): void {
    this.detachDismissListeners();

    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.dismiss();
      }
    };

    this.clickOutsideHandler = (e: MouseEvent) => {
      const path = e.composedPath();
      if (this.hostEl && !path.includes(this.hostEl as EventTarget)) {
        this.dismiss();
      }
    };

    document.addEventListener('keydown', this.escHandler, true);
    setTimeout(() => {
      if (this.clickOutsideHandler) {
        document.addEventListener('mousedown', this.clickOutsideHandler, true);
      }
    }, 0);
  }

  private detachDismissListeners(): void {
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler, true);
      this.escHandler = null;
    }
    if (this.clickOutsideHandler) {
      document.removeEventListener('mousedown', this.clickOutsideHandler, true);
      this.clickOutsideHandler = null;
    }
  }

  private removeExisting(): void {
    this.detachDismissListeners();
    if (this.hostEl) {
      this.hostEl.remove();
      this.hostEl = null;
    }
    this.hostShadow = null;
    this.containerEl = null;
  }

  private esc(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
