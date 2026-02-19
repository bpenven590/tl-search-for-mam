import type { SearchRequest, SearchResponse, EnrichedResult, EntityCollectionsResponse, EntitiesResponse } from '../shared/messages';
import { loadSettings } from '../shared/settings';
import { createShadowContainer } from './shadow-dom';
import { renderResults, renderError, renderLoading } from './results-renderer';
import { EntityChip } from './entity-chip';
import { EntitySelector } from './entity-selector';
import type { SelectedEntity } from './entity-selector';
import { CommandMenu } from './command-menu';

const PANEL_ID = 'tl-mam-search-panel';
const SESSION_KEY = 'tl_last_results';
const THEME_KEY = 'tl-panel-theme';

interface StoredSession {
  query: string;
  results: EnrichedResult[];
  nextPageToken?: string;
  totalResults: number;
  timestamp: number;
}

const PANEL_STYLES = `
  .panel {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 380px;
    max-height: min(600px, calc(100vh - 48px));
    background: var(--color-bg, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: var(--radius-xl, 16px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    pointer-events: all;
    font-family: var(--font-system, system-ui, sans-serif);
    color: var(--color-text-primary, #fff);
    overflow: hidden;
    opacity: 0.55;
    transition: opacity 0.2s ease;
  }
  .panel:hover { opacity: 1; }
  .panel.collapsed { height: auto; max-height: none; }
  .panel.light {
    --color-bg: #ffffff;
    --color-surface: #f5f5f5;
    --color-border: #e0e0e0;
    --color-text-primary: #111111;
    --color-text-secondary: #666666;
    background: #ffffff;
    color: #111111;
    border-color: #e0e0e0;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border, #333);
    cursor: move;
    background: var(--color-surface, #222);
    flex-shrink: 0;
    gap: 8px;
  }
  .panel.light .panel-header { background: #f5f5f5; border-bottom-color: #e0e0e0; }
  .panel-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary, #fff);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .panel-title .logo { width: 22px; height: 22px; border-radius: 5px; flex-shrink: 0; }
  .panel-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .ctrl-btn {
    background: none;
    border: 1px solid var(--color-border, #444);
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    padding: 2px 5px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.4;
    border-radius: 4px;
    font-family: inherit;
  }
  .ctrl-btn:hover, .ctrl-btn.active { background: var(--color-border, #444); color: var(--color-text-primary, #fff); }
  .panel.light .ctrl-btn { border-color: #ddd; color: #666; }
  .panel.light .ctrl-btn:hover, .panel.light .ctrl-btn.active { background: #e0e0e0; color: #111; }
  .panel-toggle {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    padding: 2px 5px;
    font-size: 15px;
    line-height: 1;
    margin-left: 2px;
  }
  .panel-toggle:hover { color: var(--color-text-primary, #fff); }
  .panel.light .panel-toggle { color: #666; }
  .panel.light .panel-toggle:hover { color: #111; }
  .panel-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .search-area { padding: 12px 16px; border-bottom: 1px solid var(--color-border, #333); flex-shrink: 0; }
  .panel.light .search-area { border-bottom-color: #e0e0e0; }
  .search-row { display: flex; gap: 8px; align-items: center; }
  .search-input-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    background: var(--color-surface, #222);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    overflow: hidden;
  }
  .search-input-wrap:focus-within { border-color: var(--color-accent, #00DC82); }
  .panel.light .search-input-wrap { background: #f5f5f5; border-color: #ddd; }
  .chips-container {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-left: 8px;
    gap: 4px;
  }
  .chips-container:empty { padding: 0; }
  .search-input {
    flex: 1;
    min-width: 60px;
    box-sizing: border-box;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 8px 34px 8px 10px;
    color: var(--color-text-primary, #fff);
    font-size: 13px;
    outline: none;
    font-family: inherit;
    user-select: text;
    -webkit-user-select: text;
  }
  .panel.light .search-input { color: #111; }
  .search-image-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #888);
    padding: 2px;
    display: flex;
    align-items: center;
    border-radius: 3px;
    transition: color 0.15s;
  }
  .search-image-btn:hover { color: var(--color-accent, #00DC82); }
  .image-preview {
    display: none;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 4px 8px 4px 4px;
    background: var(--color-surface, #222);
    border: 1px solid var(--color-accent, #00DC82);
    border-radius: 6px;
  }
  .image-preview.visible { display: flex; }
  .panel.light .image-preview { background: #f5f5f5; }
  .image-preview-thumb { width: 44px; height: 30px; object-fit: cover; border-radius: 3px; flex-shrink: 0; }
  .image-preview-name { flex: 1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-secondary, #aaa); }
  .image-preview-clear { background: none; border: none; cursor: pointer; color: var(--color-text-secondary, #888); font-size: 16px; line-height: 1; padding: 0 2px; flex-shrink: 0; font-family: inherit; }
  .image-preview-clear:hover { color: #ff5050; }
  .search-btn {
    background: var(--color-accent, #00DC82);
    color: #000;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    flex-shrink: 0;
  }
  .search-btn:hover { opacity: 0.9; }
  .search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .index-select {
    width: 100%;
    margin-top: 8px;
    background: var(--color-surface, #222);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    padding: 6px 10px;
    color: var(--color-text-primary, #fff);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
  }
  .panel.light .index-select { background: #f5f5f5; border-color: #ddd; color: #111; }
  .results-area { flex: 1; overflow-y: auto; padding: 6px; }
  .segment {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s;
    margin-bottom: 2px;
  }
  .segment[href] { cursor: pointer; }
  .segment[href]:hover { background: var(--color-surface, #222); }
  .panel.light .segment[href]:hover { background: #f5f5f5; }
  .segment--no-link { opacity: 0.5; cursor: default; }
  .seg-thumb { width: 72px; height: 42px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
  .seg-thumb-placeholder { width: 72px; height: 42px; background: var(--color-surface, #2a2a2a); border-radius: 4px; flex-shrink: 0; }
  .panel.light .seg-thumb-placeholder { background: #e8e8e8; }
  .seg-info { flex: 1; min-width: 0; }
  .seg-filename { font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-primary, #fff); margin-bottom: 2px; }
  .seg-time { font-size: 11px; color: var(--color-text-secondary, #aaa); font-variant-numeric: tabular-nums; }
  .rank { font-size: 11px; color: var(--color-text-secondary, #555); min-width: 28px; text-align: right; flex-shrink: 0; }
  .empty-state, .error-state { text-align: center; padding: 24px 16px; color: var(--color-text-secondary, #aaa); font-size: 13px; }
  .error-title { color: #ff5050; font-weight: 600; margin: 0 0 6px; }
  .error-msg { margin: 0; font-size: 12px; }
  .hint { font-size: 11px; margin-top: 4px; }
  .loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 24px; font-size: 13px; color: var(--color-text-secondary, #aaa); }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border, #333); border-top-color: var(--color-accent, #00DC82); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .load-more-btn {
    width: 100%;
    background: transparent;
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    padding: 8px;
    color: var(--color-text-secondary, #aaa);
    font-size: 12px;
    cursor: pointer;
    margin-top: 4px;
    font-family: inherit;
  }
  .load-more-btn:hover { border-color: var(--color-accent, #00DC82); color: var(--color-text-primary, #fff); }
  .footer { padding: 8px 16px; border-top: 1px solid var(--color-border, #333); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
  .panel.light .footer { border-top-color: #e0e0e0; }
  .result-count { font-size: 11px; color: var(--color-text-secondary, #aaa); }
  .clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    font-size: 11px;
    padding: 2px 6px;
    font-family: inherit;
    border-radius: 4px;
  }
  .clear-btn:hover { color: #ff5050; }
`;

// Inline SVG for the image search button
const IMAGE_ICON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`;

export class SearchPanel {
  private shadow!: ShadowRoot;
  private host!: HTMLElement;
  private panel!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private imageFileInput!: HTMLInputElement;
  private imageBtn!: HTMLButtonElement;
  private imagePreview!: HTMLElement;
  private imagePreviewThumb!: HTMLImageElement;
  private imagePreviewName!: HTMLElement;
  private indexSelect!: HTMLSelectElement;
  private resultsArea!: HTMLElement;
  private searchBtn!: HTMLButtonElement;
  private themeBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private collapsed = false;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panelStartX = 0;
  private panelStartY = 0;
  private allResults: EnrichedResult[] = [];
  private nextPageToken?: string;
  private totalResults = 0;
  private currentSearchType: 'text' | 'image' = 'text';
  private currentImageUrl?: string;
  private isLightTheme = false;
  private selectedEntity: { id: string; name: string } | null = null;
  private entityChip: EntityChip | null = null;
  private entitySelector: EntitySelector | null = null;
  private commandMenu: CommandMenu | null = null;
  private atMentionActive = false;
  private atMentionCollections: EntityCollectionsResponse['collections'] = [];
  private requestedCollectionIds = new Set<string>();
  private chipsContainer!: HTMLElement;

  async init(): Promise<void> {
    const { host, shadow } = createShadowContainer(PANEL_ID);
    this.host = host;
    this.shadow = shadow;

    const style = document.createElement('style');
    style.textContent = PANEL_STYLES;
    shadow.appendChild(style);

    const settings = await loadSettings();
    this.buildPanel(settings.tl_indexes, settings.search_options);
    this.setupDrag();
    this.restoreResults();
  }

  private sizes = [
    { key: 'S', width: '320px', maxHeight: 'min(480px, calc(100vh - 48px))' },
    { key: 'M', width: '440px', maxHeight: 'min(600px, calc(100vh - 48px))' },
    { key: 'L', width: '600px', maxHeight: 'min(82vh, calc(100vh - 48px))' },
    { key: '⛶', width: '100vw', maxHeight: '100vh' },
  ];
  private currentSize = 1; // default M

  private buildPanel(indexes: Array<{ id: string; label: string; default: boolean }>, _searchOptions: string[]): void {
    // Restore persisted size
    const savedSize = parseInt(localStorage.getItem('tl-panel-size') ?? '1', 10);
    this.currentSize = isNaN(savedSize) ? 1 : Math.min(savedSize, this.sizes.length - 1);

    // Restore persisted theme
    this.isLightTheme = localStorage.getItem(THEME_KEY) === 'light';

    this.panel = document.createElement('div');
    this.panel.className = 'panel' + (this.isLightTheme ? ' light' : '');
    this.applySize();

    // Header
    const logoUrl = chrome.runtime.getURL('icons/tl-logo.png');
    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = `<img class="logo" src="${logoUrl}" alt="" /> TwelveLabs Search`;
    header.appendChild(title);

    // Controls: size buttons + theme toggle + collapse
    const controls = document.createElement('div');
    controls.className = 'panel-controls';

    this.sizes.forEach(({ key }, i) => {
      const btn = document.createElement('button');
      btn.className = 'ctrl-btn' + (i === this.currentSize ? ' active' : '');
      btn.textContent = key;
      btn.title = key === '⛶' ? 'Full screen' : `Size ${key}`;
      btn.addEventListener('click', () => {
        this.currentSize = i;
        localStorage.setItem('tl-panel-size', String(i));
        controls.querySelectorAll<HTMLButtonElement>('.ctrl-btn:not(.theme-btn)').forEach((b, j) => {
          b.classList.toggle('active', j === i);
        });
        this.applySize();
      });
      controls.appendChild(btn);
    });

    // Theme toggle: shows ☼ (sun) in dark mode → click to go light; ☽ (moon) in light mode → click to go dark
    this.themeBtn = document.createElement('button');
    this.themeBtn.className = 'ctrl-btn theme-btn';
    this.themeBtn.textContent = this.isLightTheme ? '\u263D' : '\u263C'; // ☽ or ☼
    this.themeBtn.title = this.isLightTheme ? 'Switch to dark mode' : 'Switch to light mode';
    this.themeBtn.addEventListener('click', () => this.toggleTheme());
    controls.appendChild(this.themeBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'panel-toggle';
    toggleBtn.textContent = '\u2212';
    toggleBtn.title = 'Collapse panel';
    toggleBtn.addEventListener('click', () => this.toggleCollapse());
    controls.appendChild(toggleBtn);

    header.appendChild(controls);

    // Search area
    const searchArea = document.createElement('div');
    searchArea.className = 'search-area';

    const searchRow = document.createElement('div');
    searchRow.className = 'search-row';

    // Search input wrapper (for absolutely-positioned image button)
    const inputWrap = document.createElement('div');
    inputWrap.className = 'search-input-wrap';

    this.searchInput = document.createElement('input');
    this.searchInput.className = 'search-input';
    this.searchInput.placeholder = 'Search videos...';
    this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.performSearch();
      if (e.key === 'Escape') {
        if (this.commandMenu?.isVisible()) this.commandMenu.dismiss();
        if (this.atMentionActive) this.cancelAtMention();
      }
      if (e.key === 'Backspace' && this.searchInput.value === '' && this.selectedEntity) {
        this.removeEntityChip();
      }
    });
    this.searchInput.addEventListener('keyup', (e) => e.stopPropagation());
    this.searchInput.addEventListener('keypress', (e) => e.stopPropagation());
    this.searchInput.addEventListener('input', () => {
      const val = this.searchInput.value;
      // "@" entity mention — trigger when "@" first appears
      if (!this.atMentionActive && !this.selectedEntity && val.includes('@')) {
        void this.startAtMention(val);
        return;
      }
      // Update filter while typing in "@" mention mode
      if (this.atMentionActive) {
        const atIdx = val.lastIndexOf('@');
        if (atIdx >= 0) {
          this.entitySelector?.filter(val.slice(atIdx + 1));
        } else {
          this.cancelAtMention();
        }
      }
    });

    // Image icon button (inside the input wrapper, right side)
    this.imageBtn = document.createElement('button');
    this.imageBtn.className = 'search-image-btn';
    this.imageBtn.innerHTML = IMAGE_ICON_SVG;
    this.imageBtn.title = 'Search by image';
    this.imageBtn.type = 'button';

    // Hidden file input
    this.imageFileInput = document.createElement('input');
    this.imageFileInput.type = 'file';
    this.imageFileInput.accept = 'image/*';
    this.imageFileInput.style.display = 'none';

    this.imageBtn.addEventListener('click', () => {
      if (this.currentImageUrl) {
        // Clear the current image
        this.currentSearchType = 'text';
        this.currentImageUrl = undefined;
        this.imageBtn.classList.remove('has-image');
        this.imageBtn.title = 'Search by image';
        this.imageFileInput.value = '';
      } else {
        this.imageFileInput.click();
      }
    });

    this.imageFileInput.addEventListener('change', () => {
      const file = this.imageFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.currentSearchType = 'image';
          this.currentImageUrl = reader.result;
          this.imagePreviewThumb.src = reader.result;
          this.imagePreviewName.textContent = file.name;
          this.imagePreview.classList.add('visible');
          this.imageBtn.title = 'Clear image';
        }
      };
      reader.readAsDataURL(file);
    });

    this.chipsContainer = document.createElement('div');
    this.chipsContainer.className = 'chips-container';
    inputWrap.appendChild(this.chipsContainer);
    inputWrap.appendChild(this.searchInput);
    inputWrap.appendChild(this.imageBtn);
    inputWrap.appendChild(this.imageFileInput);

    this.searchBtn = document.createElement('button');
    this.searchBtn.className = 'search-btn';
    this.searchBtn.textContent = 'Search';
    this.searchBtn.addEventListener('click', () => this.performSearch());

    searchRow.appendChild(inputWrap);
    searchRow.appendChild(this.searchBtn);
    searchArea.appendChild(searchRow);

    // Image preview chip (hidden until an image is selected)
    this.imagePreview = document.createElement('div');
    this.imagePreview.className = 'image-preview';

    this.imagePreviewThumb = document.createElement('img');
    this.imagePreviewThumb.className = 'image-preview-thumb';
    this.imagePreviewThumb.alt = '';

    this.imagePreviewName = document.createElement('span');
    this.imagePreviewName.className = 'image-preview-name';

    const previewClear = document.createElement('button');
    previewClear.className = 'image-preview-clear';
    previewClear.textContent = '\u00D7'; // ×
    previewClear.title = 'Remove image';
    previewClear.type = 'button';
    previewClear.addEventListener('click', () => this.resetImageState());

    this.imagePreview.appendChild(this.imagePreviewThumb);
    this.imagePreview.appendChild(this.imagePreviewName);
    this.imagePreview.appendChild(previewClear);
    searchArea.appendChild(this.imagePreview);

    // Index selector (only if multiple indexes)
    if (indexes.length > 1) {
      this.indexSelect = document.createElement('select');
      this.indexSelect.className = 'index-select';
      for (const idx of indexes) {
        const opt = document.createElement('option');
        opt.value = idx.id;
        opt.textContent = idx.label;
        if (idx.default) opt.selected = true;
        this.indexSelect.appendChild(opt);
      }
      searchArea.appendChild(this.indexSelect);
    }

    // Results
    this.resultsArea = document.createElement('div');
    this.resultsArea.className = 'results-area';

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = '<span class="result-count"></span>';

    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'clear-btn';
    this.clearBtn.textContent = 'Clear';
    this.clearBtn.title = 'Clear results';
    this.clearBtn.style.display = 'none';
    this.clearBtn.addEventListener('click', () => this.clearResults());
    footer.appendChild(this.clearBtn);

    this.panel.appendChild(header);
    this.panel.appendChild(searchArea);
    this.panel.appendChild(this.resultsArea);
    this.panel.appendChild(footer);

    this.shadow.appendChild(this.panel);
  }

  private toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    this.panel.classList.toggle('light', this.isLightTheme);
    this.themeBtn.textContent = this.isLightTheme ? '\u263D' : '\u263C';
    this.themeBtn.title = this.isLightTheme ? 'Switch to dark mode' : 'Switch to light mode';
    localStorage.setItem(THEME_KEY, this.isLightTheme ? 'light' : 'dark');
  }

  private resetImageState(): void {
    this.currentSearchType = 'text';
    this.currentImageUrl = undefined;
    this.imageBtn.title = 'Search by image';
    this.imageFileInput.value = '';
    this.imagePreview.classList.remove('visible');
    this.imagePreviewThumb.src = '';
    this.imagePreviewName.textContent = '';
  }

  private async performSearch(pageToken?: string): Promise<void> {
    let settings;
    try {
      settings = await loadSettings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isInvalidated = msg.includes('Extension context invalidated') || msg.includes('Extension context');
      renderError(this.resultsArea, isInvalidated
        ? 'Extension was updated. Please refresh the page.'
        : `Settings error: ${msg}`);
      this.resetImageState();
      return;
    }

    const indexId = this.indexSelect?.value ?? settings.tl_indexes.find((i) => i.default)?.id ?? settings.tl_indexes[0]?.id;
    if (!indexId) {
      renderError(this.resultsArea, 'No index configured. Open extension settings to add a TwelveLabs index.');
      return;
    }

    const rawQuery = this.searchInput.value.trim();
    const query = this.selectedEntity
      ? `<@${this.selectedEntity.id}>${rawQuery}`
      : rawQuery;
    if (!rawQuery && !this.selectedEntity && this.currentSearchType === 'text') {
      this.searchInput.focus();
      return;
    }

    if (!pageToken) {
      this.allResults = [];
    }

    this.searchBtn.disabled = true;
    renderLoading(this.resultsArea);

    const request: SearchRequest = {
      action: 'search',
      query,
      indexId,
      searchType: this.currentSearchType,
      imageUrl: this.currentImageUrl,
      pageToken,
    };

    try {
      chrome.runtime.sendMessage(request, (response: SearchResponse) => {
        this.searchBtn.disabled = false;
        this.resetImageState();

        // chrome.runtime.lastError must be checked when using callbacks
        if (chrome.runtime.lastError) {
          renderError(this.resultsArea, 'Extension was updated. Please refresh the page.');
          return;
        }

        if (!response || !response.success) {
          renderError(this.resultsArea, response?.error ?? 'Search failed');
          return;
        }

        this.allResults = [...this.allResults, ...(response.results ?? [])];
        this.nextPageToken = response.pageInfo?.nextPageToken;
        this.totalResults = response.pageInfo?.totalResults ?? 0;

        this.renderResultsUI();
        this.saveResults();
      });
    } catch (err) {
      this.searchBtn.disabled = false;
      this.resetImageState();
      renderError(this.resultsArea, 'Extension was updated. Please refresh the page.');
    }
  }

  private renderResultsUI(): void {
    renderResults(this.resultsArea, this.allResults);

    if (this.nextPageToken) {
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'load-more-btn';
      loadMoreBtn.textContent = `Load more (${this.totalResults - this.allResults.length} remaining)`;
      loadMoreBtn.addEventListener('click', () => this.performSearch(this.nextPageToken));
      this.resultsArea.appendChild(loadMoreBtn);
    }

    const countEl = this.panel.querySelector<HTMLElement>('.result-count');
    if (countEl) {
      countEl.textContent = this.allResults.length > 0
        ? `${this.allResults.length} of ${this.totalResults} results`
        : '';
    }

    this.clearBtn.style.display = this.allResults.length > 0 ? '' : 'none';
  }

  private clearResults(): void {
    this.allResults = [];
    this.nextPageToken = undefined;
    this.totalResults = 0;
    this.searchInput.value = '';
    this.resultsArea.innerHTML = '';
    this.removeEntityChip();

    const countEl = this.panel.querySelector<HTMLElement>('.result-count');
    if (countEl) countEl.textContent = '';
    this.clearBtn.style.display = 'none';

    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }

    this.searchInput.focus();
  }

  private saveResults(): void {
    try {
      const session: StoredSession = {
        query: this.searchInput.value.trim(),
        results: this.allResults,
        nextPageToken: this.nextPageToken,
        totalResults: this.totalResults,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // quota exceeded or private browsing restriction — silently ignore
    }
  }

  private restoreResults(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved: StoredSession = JSON.parse(raw);
      if (Date.now() - saved.timestamp > 30 * 60 * 1000) return;
      if (saved.results.length === 0) return;

      this.allResults = saved.results;
      this.nextPageToken = saved.nextPageToken;
      this.totalResults = saved.totalResults;
      this.searchInput.value = saved.query;

      this.renderResultsUI();
    } catch {
      // corrupt data — ignore
    }
  }

  /**
   * Recomputes and applies max-height based on the panel's current vertical anchor.
   * - top-anchored (grows down): available = viewport - top - 24px bottom margin
   * - bottom-anchored (grows up): available = viewport - bottom - 24px top margin
   * - default CSS position (no inline style): falls back to CSS min() in sizeMaxHeight
   */
  private syncMaxHeight(): void {
    const { key, maxHeight: sizeMax } = this.sizes[this.currentSize];
    if (key === '⛶') return;

    const topStr = this.panel.style.top;
    const bottomStr = this.panel.style.bottom;
    const hasTop = topStr && topStr !== 'auto';
    const hasBottom = bottomStr && bottomStr !== 'auto';

    let anchor: number;
    if (hasTop) {
      anchor = Math.max(0, parseFloat(topStr) || 0);
    } else if (hasBottom) {
      anchor = Math.max(0, parseFloat(bottomStr) || 0);
    } else {
      // Default: bottom: 24px from CSS — sizeMax already handles this via min()
      this.panel.style.maxHeight = sizeMax;
      return;
    }

    const available = Math.max(150, window.innerHeight - anchor - 24);
    this.panel.style.maxHeight = `min(${sizeMax}, ${available}px)`;
  }

  /**
   * After a drag ends, snaps the vertical anchor to whichever edge gives the panel
   * the most room to grow without overflowing the viewport:
   * - header in top half  → top anchor, panel grows downward
   * - header in bottom half → bottom anchor, panel grows upward
   */
  private snapAnchorAfterDrag(): void {
    const { key } = this.sizes[this.currentSize];
    if (key === '⛶') return;

    const rect = this.panel.getBoundingClientRect();

    if (rect.top > window.innerHeight / 2) {
      // Header in bottom half → anchor from bottom edge, panel grows upward
      // Use rect.bottom so the panel's visual bottom stays exactly where it was
      const bottom = Math.max(0, window.innerHeight - rect.bottom);
      this.panel.style.bottom = `${bottom}px`;
      this.panel.style.top = 'auto';
    } else {
      // Header in top half → anchor from top edge, panel grows downward
      this.panel.style.top = `${Math.max(0, rect.top)}px`;
      this.panel.style.bottom = 'auto';
    }

    this.syncMaxHeight();
  }

  private applySize(): void {
    const { key, width } = this.sizes[this.currentSize];
    const isFullscreen = key === '⛶';
    this.panel.style.width = width;
    if (isFullscreen) {
      this.panel.style.maxHeight = '100vh';
      this.panel.style.top = '0';
      this.panel.style.left = '0';
      this.panel.style.right = 'auto';
      this.panel.style.bottom = 'auto';
      this.panel.style.borderRadius = '0';
    } else {
      if (this.panel.style.borderRadius === '0px' || this.panel.style.borderRadius === '0') {
        // Coming back from fullscreen — reset to default position
        this.panel.style.top = 'auto';
        this.panel.style.left = 'auto';
        this.panel.style.right = '24px';
        this.panel.style.bottom = '24px';
        this.panel.style.borderRadius = 'var(--radius-xl, 16px)';
      }
      this.syncMaxHeight();
    }
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    const searchArea = this.panel.querySelector<HTMLElement>('.search-area');
    const resultsArea = this.panel.querySelector<HTMLElement>('.results-area');
    const footer = this.panel.querySelector<HTMLElement>('.footer');
    const btn = this.panel.querySelector<HTMLButtonElement>('.panel-toggle');

    if (searchArea) searchArea.style.display = this.collapsed ? 'none' : '';
    if (resultsArea) resultsArea.style.display = this.collapsed ? 'none' : '';
    if (footer) footer.style.display = this.collapsed ? 'none' : '';
    if (btn) btn.textContent = this.collapsed ? '+' : '\u2212';
    this.panel.classList.toggle('collapsed', this.collapsed);
  }

  private setupDrag(): void {
    const header = this.panel.querySelector<HTMLElement>('.panel-header')!;

    header.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      const rect = this.panel.getBoundingClientRect();
      this.panelStartX = rect.left;
      this.panelStartY = rect.top;
      this.panel.style.right = 'auto';
      this.panel.style.bottom = 'auto';
      this.panel.style.left = `${this.panelStartX}px`;
      this.panel.style.top = `${this.panelStartY}px`;
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.panel.style.left = `${this.panelStartX + dx}px`;
      this.panel.style.top = `${this.panelStartY + dy}px`;
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        // Snap to the best vertical anchor and recompute max-height
        this.snapAnchorAfterDrag();
      }
      this.isDragging = false;
    });
  }

  show(): void {
    this.host.style.display = '';
  }

  hide(): void {
    this.host.style.display = 'none';
  }

  toggle(): void {
    if (this.host.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  // --- Entity & Command Menu methods ---

  private getPanelRect() {
    // getBoundingClientRect returns zeros for shadow DOM children in extensions.
    // Derive the panel's viewport position from its CSS style properties instead.
    const style = this.panel.style;
    const panelWidth = parseFloat(style.width) || 380;
    // offsetHeight works for shadow DOM elements (layout engine, not composited coords)
    const panelHeight = this.panel.offsetHeight || this.panel.scrollHeight || 150;

    let left: number, top: number;
    const hasLeft = style.left && style.left !== '' && style.left !== 'auto';
    if (hasLeft) {
      left = parseFloat(style.left);
      top = parseFloat(style.top);
    } else {
      const right = parseFloat(style.right) || 24;
      const bottom = parseFloat(style.bottom) || 24;
      left = window.innerWidth - right - panelWidth;
      top = window.innerHeight - bottom - panelHeight;
    }
    return { top, bottom: top + panelHeight, left, right: left + panelWidth, width: panelWidth };
  }

  private openEntityBrowser(fromAtMention = false): void {
    this.commandMenu = new CommandMenu(
      () => this.getPanelRect(),
      () => { this.commandMenu = null; },
      this.isLightTheme,
      fromAtMention ? () => this.returnToAtMention() : undefined,
    );
    this.commandMenu.showEntityBrowser();
  }

  /** Called when the user clicks ← Back in the entity browser after arriving via @ mention. */
  private returnToAtMention(): void {
    this.commandMenu = null;
    // Put @ back in the input and re-open the entity selector
    this.searchInput.value = this.searchInput.value + '@';
    void this.startAtMention(this.searchInput.value);
    this.searchInput.focus();
  }

  private async startAtMention(inputValue: string): Promise<void> {
    this.atMentionActive = true;
    this.atMentionCollections = [];
    this.requestedCollectionIds = new Set();
    try {
      const resp = await this.sendMsg<EntityCollectionsResponse>({ action: 'listEntityCollections' });
      if (resp.success && resp.collections) this.atMentionCollections = resp.collections;
    } catch { /* ignore — show empty dropdown */ }

    if (!this.atMentionActive) return; // cancelled while fetching

    const atIdx = inputValue.lastIndexOf('@');
    const filterText = atIdx >= 0 ? inputValue.slice(atIdx + 1) : '';

    this.entitySelector = new EntitySelector(
      () => this.getPanelRect(),
      (entity) => this.onEntitySelected(entity),
      () => this.cancelAtMention(),
      (collectionId) => void this.loadEntitiesForCollection(collectionId),
      () => this.loadAllEntities(),
      () => { this.cancelAtMention(); this.openEntityBrowser(true); },
      this.isLightTheme,
    );
    this.entitySelector.show(this.atMentionCollections, filterText);
  }

  private cancelAtMention(): void {
    // Strip "@" and any filter text typed after it from the search input
    const val = this.searchInput.value;
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0) {
      this.searchInput.value = val.slice(0, atIdx);
    }

    this.atMentionActive = false;
    this.entitySelector?.dismiss();
    this.entitySelector = null;
    this.atMentionCollections = [];
    this.requestedCollectionIds = new Set();
  }

  /** Loads entities for all collections in parallel (triggered when search filter is active). */
  private loadAllEntities(): void {
    for (const collection of this.atMentionCollections) {
      void this.loadEntitiesForCollection(collection.id);
    }
  }

  private async loadEntitiesForCollection(collectionId: string): Promise<void> {
    // Deduplicate: skip if already requested for this session
    if (this.requestedCollectionIds.has(collectionId)) return;
    this.requestedCollectionIds.add(collectionId);
    try {
      const resp = await this.sendMsg<EntitiesResponse>({ action: 'listEntities', collectionId });
      const entities = (resp.success && resp.entities) ? resp.entities : [];
      const val = this.searchInput.value;
      const atIdx = val.lastIndexOf('@');
      const filterText = atIdx >= 0 ? val.slice(atIdx + 1) : '';
      this.entitySelector?.showEntities(collectionId, entities, filterText);
    } catch {
      this.entitySelector?.showEntities(collectionId, []);
    }
  }

  private onEntitySelected(entity: SelectedEntity): void {
    // Remove "@..." text from input
    const val = this.searchInput.value;
    const atIdx = val.lastIndexOf('@');
    this.searchInput.value = atIdx >= 0 ? val.slice(0, atIdx) : val;

    // Create and insert chip
    this.selectedEntity = { id: entity.id, name: entity.name };
    this.entityChip = new EntityChip(this.selectedEntity, () => this.removeEntityChip());
    this.chipsContainer.appendChild(this.entityChip.getElement());

    this.atMentionActive = false;
    this.entitySelector?.dismiss();
    this.entitySelector = null;

    this.searchInput.focus();
  }

  private removeEntityChip(): void {
    if (this.entityChip) {
      this.entityChip.getElement().remove();
      this.entityChip = null;
    }
    this.selectedEntity = null;
  }

  private sendMsg<T>(message: Record<string, unknown>): Promise<T> {
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
}
