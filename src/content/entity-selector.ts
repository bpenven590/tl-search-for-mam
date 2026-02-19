import type { EntityCollection, Entity } from '../shared/messages';

export interface SelectedEntity extends Entity {
  collectionId: string;
}

const SELECTOR_STYLES = `
  :host { display: block; }
  .dropdown {
    width: 100%;
    pointer-events: auto;
    background: var(--color-bg, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    max-height: 280px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: var(--font-system, system-ui, sans-serif);
    color: var(--color-text-primary, #fff);
  }
  .dropdown-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .dropdown-header {
    padding: 8px 12px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary, #aaa);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .section-label {
    padding: 4px 12px 2px;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary, #555);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .collection-row {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    user-select: none;
    pointer-events: auto;
  }
  .collection-row:hover { background: var(--color-surface, #222); }
  .collection-row.expanded { background: var(--color-surface, #222); }
  .collection-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .collection-count {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--color-surface, #222);
    color: var(--color-text-secondary, #aaa);
    flex-shrink: 0;
  }
  .collection-arrow {
    font-size: 10px;
    color: var(--color-text-secondary, #aaa);
    flex-shrink: 0;
    transition: transform 0.15s;
  }
  .collection-arrow.open { transform: rotate(90deg); }
  .entity-list { overflow: hidden; }
  .entity-row {
    padding: 6px 12px 6px 24px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    pointer-events: auto;
    user-select: none;
  }
  .entity-row.flat { padding-left: 12px; }
  .entity-row:hover { background: var(--color-surface, #222); }
  .entity-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-badge {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .status-ready { background: rgba(0,220,130,0.2); color: #00DC82; }
  .status-processing { background: rgba(255,180,0,0.2); color: #ffb400; }
  .loading-row {
    padding: 8px 12px 8px 24px;
    font-size: 11px;
    color: var(--color-text-secondary, #aaa);
  }
  .loading-row.flat { padding-left: 12px; }
  .empty-row {
    padding: 8px 12px;
    font-size: 12px;
    color: var(--color-text-secondary, #aaa);
    text-align: center;
  }
  .back-nav {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 8px;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    background: var(--color-surface, #222);
  }
  .back-nav-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: inherit;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .back-nav-btn:hover { background: var(--color-border, #333); color: var(--color-text-primary, #fff); }
  .back-nav-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-primary, #fff);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .footer-row {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 12px;
    color: var(--color-text-secondary, #aaa);
    background: var(--color-bg, #1a1a1a);
    border-top: 1px solid var(--color-border, #2a2a2a);
    user-select: none;
    pointer-events: auto;
  }
  .footer-row:hover { background: var(--color-surface, #222); color: var(--color-text-primary, #fff); }
  .footer-icon { font-size: 13px; flex-shrink: 0; }
`;

export interface AnchorRect {
  top: number; bottom: number; left: number; right: number; width: number;
}

const LIGHT_VARS = `
  :host {
    --color-bg: #ffffff;
    --color-surface: #f5f5f5;
    --color-border: #e0e0e0;
    --color-text-primary: #111111;
    --color-text-secondary: #666666;
  }
`;

export class EntitySelector {
  private getAnchorRect: () => AnchorRect;
  private onSelect: (entity: SelectedEntity) => void;
  private onDismiss: () => void;
  private onCollectionExpand: ((collectionId: string) => void) | null = null;
  private onLoadAll: (() => void) | null = null;
  private onManage: (() => void) | null = null;
  private light = false;

  // Each show() mounts a host div directly on document.body with position:fixed
  // at the correct viewport coords. Shadow root provides style isolation only.
  private hostEl: HTMLElement | null = null;
  private hostShadow: ShadowRoot | null = null;
  private dropdown: HTMLElement | null = null;
  private outsideClickHandler: ((e: Event) => void) | null = null;
  private escHandler: ((e: KeyboardEvent) => void) | null = null;

  // State
  private collections: EntityCollection[] = [];
  private expandedCollectionId: string | null = null;
  private entitiesByCollection: Map<string, Entity[]> = new Map();
  private loadingCollections: Set<string> = new Set();
  private filterText = '';
  private loadAllTriggered = false;

  constructor(
    anchorEl: HTMLElement | (() => AnchorRect),
    onSelect: (entity: SelectedEntity) => void,
    onDismiss: () => void,
    onCollectionExpand?: (collectionId: string) => void,
    onLoadAll?: () => void,
    onManage?: () => void,
    light?: boolean,
  ) {
    // Accept either an element (for tests) or a rect-getter function (for production)
    this.getAnchorRect = typeof anchorEl === 'function'
      ? anchorEl
      : () => {
          const r = anchorEl.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width };
        };
    this.onSelect = onSelect;
    this.onDismiss = onDismiss;
    this.onCollectionExpand = onCollectionExpand ?? null;
    this.onLoadAll = onLoadAll ?? null;
    this.onManage = onManage ?? null;
    this.light = light ?? false;
  }

  /** For tests: returns the shadow root hosting the dropdown content. */
  getShadow(): ShadowRoot | null {
    return this.hostShadow;
  }

  show(collections: EntityCollection[], filterText?: string): void {
    this.collections = collections;
    this.filterText = filterText ?? '';
    this.expandedCollectionId = null;
    this.entitiesByCollection.clear();
    this.loadingCollections.clear();
    this.loadAllTriggered = false;
    this.render();
  }

  showEntities(collectionId: string, entities: Entity[], filterText?: string): void {
    this.entitiesByCollection.set(collectionId, entities);
    this.loadingCollections.delete(collectionId);
    if (filterText !== undefined) this.filterText = filterText;
    this.renderBody();
  }

  filter(text: string): void {
    const wasEmpty = this.filterText === '';
    this.filterText = text;

    // When filter becomes active, trigger loading of all collection entities for search
    if (text && wasEmpty && !this.loadAllTriggered && this.onLoadAll) {
      this.loadAllTriggered = true;
      this.onLoadAll();
    }

    this.renderBody();
  }

  dismiss(): void {
    if (this.hostEl) {
      this.hostEl.remove();
      this.hostEl = null;
    }
    this.hostShadow = null;
    this.dropdown = null;
    this.removeGlobalListeners();
  }

  isVisible(): boolean {
    return this.hostEl !== null;
  }

  private render(): void {
    this.dismiss();

    const rect = this.getAnchorRect();
    const dropdownMaxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Anchor the host's BOTTOM edge just above the anchor (panel top) so the
    // menu grows upward and stays flush against the panel.
    let positionCss: string;
    if (spaceBelow >= dropdownMaxHeight + 8) {
      positionCss = `top:${rect.bottom + 4}px`;
    } else {
      const distFromBottom = window.innerHeight - rect.top + 4;
      positionCss = `bottom:${distFromBottom}px;max-height:${Math.min(dropdownMaxHeight, rect.top - 16)}px`;
    }

    // Span the full width of the anchor (panel), left-aligned to panel's left edge
    const hostEl = document.createElement('div');
    hostEl.style.cssText = [
      'position:fixed',
      positionCss,
      `left:${rect.left}px`,
      `width:${rect.width}px`,
      'z-index:2147483648',
      'pointer-events:auto',
    ].join(';');

    document.body.appendChild(hostEl);

    const shadow = hostEl.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = SELECTOR_STYLES;
    shadow.appendChild(styleEl);

    if (this.light) {
      const lightEl = document.createElement('style');
      lightEl.textContent = LIGHT_VARS;
      shadow.appendChild(lightEl);
    }

    this.hostEl = hostEl;
    this.hostShadow = shadow;

    // Create the dropdown container (no position needed — flows inside host)
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'dropdown';
    this.dropdown.setAttribute('data-entity-selector', '');
    shadow.appendChild(this.dropdown);

    this.renderBody();
    this.addGlobalListeners();
  }

  private renderBody(): void {
    if (!this.dropdown) return;
    this.dropdown.innerHTML = '';

    // When a collection is expanded, show a pinned back-nav above the scroll zone
    if (this.expandedCollectionId) {
      const expandedCollection = this.collections.find(c => c.id === this.expandedCollectionId);
      const backNav = document.createElement('div');
      backNav.className = 'back-nav';

      const backBtn = document.createElement('button');
      backBtn.className = 'back-nav-btn';
      backBtn.textContent = '\u2190 Collections';
      backBtn.title = 'Back to collections';
      backBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.expandedCollectionId = null;
        this.renderBody();
      });
      backNav.appendChild(backBtn);

      const colName = document.createElement('span');
      colName.className = 'back-nav-title';
      colName.textContent = expandedCollection?.name ?? '';
      backNav.appendChild(colName);

      this.dropdown.appendChild(backNav);
    }

    // Scrollable zone — all content except back-nav and footer goes here
    const scrollEl = document.createElement('div');
    scrollEl.className = 'dropdown-scroll';
    this.dropdown.appendChild(scrollEl);

    // Show section header only when not in an expanded collection view
    if (!this.expandedCollectionId) {
      const header = document.createElement('div');
      header.className = 'dropdown-header';
      header.textContent = 'Entity Collections';
      scrollEl.appendChild(header);
    }

    if (this.collections.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-row';
      empty.textContent = 'No collections found';
      scrollEl.appendChild(empty);
      this.renderFooter();
      return;
    }

    // When filter is active and no collection expanded: show flat entity search
    if (this.filterText && !this.expandedCollectionId) {
      this.renderFlatSearch(scrollEl);
      this.renderFooter();
      return;
    }

    for (const collection of this.collections) {
      const isExpanded = this.expandedCollectionId === collection.id;

      // Collection row
      const row = document.createElement('div');
      row.className = 'collection-row' + (isExpanded ? ' expanded' : '');

      const arrow = document.createElement('span');
      arrow.className = 'collection-arrow' + (isExpanded ? ' open' : '');
      arrow.textContent = '\u25B8'; // ▸
      row.appendChild(arrow);

      const name = document.createElement('span');
      name.className = 'collection-name';
      name.textContent = collection.name;
      row.appendChild(name);

      // Show actual loaded entity count if available, API count if > 0, else '—'
      const loadedEntities = this.entitiesByCollection.get(collection.id);
      const countText = loadedEntities !== undefined
        ? String(loadedEntities.length)
        : this.loadingCollections.has(collection.id)
          ? '…'
          : collection.entityCount > 0
            ? String(collection.entityCount)
            : '—';

      const count = document.createElement('span');
      count.className = 'collection-count';
      count.textContent = countText;
      row.appendChild(count);

      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (this.expandedCollectionId === collection.id) {
          // Collapse
          this.expandedCollectionId = null;
          this.renderBody();
        } else {
          // Expand
          this.expandedCollectionId = collection.id;
          if (!this.entitiesByCollection.has(collection.id)) {
            this.loadingCollections.add(collection.id);
            this.onCollectionExpand?.(collection.id);
          }
          this.renderBody();
        }
      });

      scrollEl.appendChild(row);

      // Entity list (if expanded)
      if (isExpanded) {
        const entityList = document.createElement('div');
        entityList.className = 'entity-list';

        if (this.loadingCollections.has(collection.id)) {
          const loadingRow = document.createElement('div');
          loadingRow.className = 'loading-row';
          loadingRow.textContent = 'Loading entities...';
          entityList.appendChild(loadingRow);
        } else {
          const entities = this.entitiesByCollection.get(collection.id) ?? [];
          const filtered = this.filterText
            ? entities.filter(e =>
                e.name.toLowerCase().includes(this.filterText.toLowerCase()),
              )
            : entities;

          if (filtered.length === 0) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'empty-row';
            emptyRow.textContent = entities.length === 0
              ? 'No entities in this collection'
              : 'No matching entities';
            entityList.appendChild(emptyRow);
          } else {
            for (const entity of filtered) {
              entityList.appendChild(this.buildEntityRow(entity, collection.id, false));
            }
          }
        }

        scrollEl.appendChild(entityList);
      }
    }

    this.renderFooter();
    this.scrollToExpanded();
  }

  /**
   * After every renderBody() call, scroll .dropdown-scroll so the expanded
   * collection row is visible. Uses getBoundingClientRect() so it works
   * correctly across shadow DOM boundaries (offsetTop is unreliable there).
   */
  private scrollToExpanded(): void {
    if (!this.expandedCollectionId) return;
    const scrollZone = this.dropdown?.querySelector<HTMLElement>('.dropdown-scroll');
    const expandedRow = scrollZone?.querySelector<HTMLElement>('.collection-row.expanded');
    if (!scrollZone || !expandedRow) return;
    // getBoundingClientRect() forces a synchronous layout reflow and gives
    // accurate positions even immediately after DOM mutation.
    const zoneTop = scrollZone.getBoundingClientRect().top;
    const rowTop = expandedRow.getBoundingClientRect().top;
    const offset = rowTop - zoneTop; // natural offset when scrollTop is 0
    if (offset > 0) scrollZone.scrollTop = offset;
  }

  /** Appends a "Manage entities" footer row if an onManage callback is provided. */
  private renderFooter(): void {
    if (!this.onManage || !this.dropdown) return;

    const row = document.createElement('div');
    row.className = 'footer-row';
    row.innerHTML = '<span class="footer-icon">\u229E</span><span>Manage entities</span>';
    row.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.dismiss(); // remove dropdown from DOM
      this.onManage?.(); // panel handles state cleanup and opens browser
    });
    this.dropdown.appendChild(row);
  }

  /** Renders a flat entity list across all loaded collections, filtered by filterText. */
  private renderFlatSearch(container: HTMLElement): void {
    const lowerFilter = this.filterText.toLowerCase();
    let totalMatches = 0;
    let hasUnloaded = false;

    for (const collection of this.collections) {
      if (this.loadingCollections.has(collection.id)) {
        hasUnloaded = true;
        continue;
      }
      if (!this.entitiesByCollection.has(collection.id)) {
        hasUnloaded = true;
        continue;
      }

      const entities = this.entitiesByCollection.get(collection.id)!;
      const matched = entities.filter(e => e.name.toLowerCase().includes(lowerFilter));
      if (matched.length === 0) continue;

      totalMatches += matched.length;

      const sectionLabel = document.createElement('div');
      sectionLabel.className = 'section-label';
      sectionLabel.textContent = collection.name;
      container.appendChild(sectionLabel);

      for (const entity of matched) {
        container.appendChild(this.buildEntityRow(entity, collection.id, true));
      }
    }

    if (hasUnloaded) {
      const loadingRow = document.createElement('div');
      loadingRow.className = 'loading-row flat';
      loadingRow.textContent = 'Searching more collections…';
      container.appendChild(loadingRow);
    } else if (totalMatches === 0) {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'empty-row';
      emptyRow.textContent = 'No matching entities';
      container.appendChild(emptyRow);
    }
  }

  /** Builds a single entity row element. Uses mousedown to avoid focus-steal issues. */
  private buildEntityRow(entity: Entity, collectionId: string, flat: boolean): HTMLElement {
    const eRow = document.createElement('div');
    eRow.className = 'entity-row' + (flat ? ' flat' : '');

    const eName = document.createElement('span');
    eName.className = 'entity-name';
    eName.textContent = entity.name;
    eRow.appendChild(eName);

    const statusBadge = document.createElement('span');
    const statusClass = entity.status === 'ready'
      ? 'status-ready'
      : entity.status === 'processing'
        ? 'status-processing'
        : '';
    statusBadge.className = `status-badge ${statusClass}`;
    statusBadge.textContent = entity.status;
    eRow.appendChild(statusBadge);

    // mousedown + preventDefault keeps focus on the search input while selecting
    eRow.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.onSelect({
        ...entity,
        collectionId,
      });
      this.dismiss();
    });

    return eRow;
  }

  private addGlobalListeners(): void {
    // Click outside to dismiss
    this.outsideClickHandler = (e: Event) => {
      const path = e.composedPath();
      if (
        this.hostEl &&
        !path.includes(this.hostEl as EventTarget)
      ) {
        this.onDismiss();
        this.dismiss();
      }
    };
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler!);
    }, 0);

    // Escape to dismiss
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.onDismiss();
        this.dismiss();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }

  private removeGlobalListeners(): void {
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
  }
}
