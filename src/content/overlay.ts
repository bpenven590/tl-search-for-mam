import type { SearchRequest, SearchResponse, EnrichedResult } from '../shared/messages';
import type { ExtensionSettings } from '../shared/settings';
import { renderResults, renderError, renderLoading } from './results-renderer';

const OVERLAY_ID = 'tl-mam-search-overlay';

const OVERLAY_STYLES = `
  .overlay {
    position: fixed;
    z-index: 2147483647;
    width: 420px;
    max-height: 520px;
    background: var(--color-bg, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-system, system-ui, sans-serif);
    color: var(--color-text-primary, #fff);
    pointer-events: all;
  }
  .overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border, #333);
    background: var(--color-surface, #222);
    flex-shrink: 0;
  }
  .overlay-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary, #aaa);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .overlay-query {
    color: var(--color-text-primary, #fff);
    font-style: italic;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .overlay-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #aaa);
    padding: 2px 6px;
    font-size: 16px;
    line-height: 1;
    border-radius: 4px;
  }
  .overlay-close:hover { background: var(--color-surface, #333); color: var(--color-text-primary, #fff); }
  .overlay-index {
    padding: 8px 14px;
    border-bottom: 1px solid var(--color-border, #333);
    flex-shrink: 0;
  }
  .index-select {
    width: 100%;
    background: var(--color-surface, #222);
    border: 1px solid var(--color-border, #333);
    border-radius: 6px;
    padding: 5px 8px;
    color: var(--color-text-primary, #fff);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
  }
  .results-area { flex: 1; overflow-y: auto; padding: 8px; }
  .video-group { margin-bottom: 12px; }
  .video-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: var(--color-surface, #222);
    border-radius: 6px;
    margin-bottom: 4px;
  }
  .video-thumb { width: 40px; height: 26px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
  .video-name { font-size: 12px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .segments { padding-left: 8px; }
  .segment {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    font-size: 12px;
    transition: background 0.15s;
  }
  .segment:hover { background: var(--color-surface, #222); }
  .rank { color: var(--color-text-secondary, #aaa); min-width: 24px; }
  .time { flex: 1; color: var(--color-text-primary, #fff); font-variant-numeric: tabular-nums; }
  .confidence { font-size: 10px; padding: 2px 6px; border-radius: 999px; font-weight: 600; }
  .confidence--high { background: rgba(0,220,130,0.2); color: #00DC82; }
  .confidence--medium { background: rgba(255,180,0,0.2); color: #ffb400; }
  .confidence--low { background: rgba(255,80,80,0.2); color: #ff5050; }
  .empty-state, .error-state { text-align: center; padding: 24px 16px; color: var(--color-text-secondary, #aaa); font-size: 13px; }
  .error-title { color: #ff5050; font-weight: 600; margin: 0 0 6px; }
  .error-msg { margin: 0; font-size: 12px; }
  .loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 24px; font-size: 13px; color: var(--color-text-secondary, #aaa); }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border, #333); border-top-color: var(--color-accent, #00DC82); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .overlay-footer { padding: 8px 14px; border-top: 1px solid var(--color-border, #333); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
  .result-count { font-size: 11px; color: var(--color-text-secondary, #aaa); }
  .load-more-btn {
    background: transparent;
    border: 1px solid var(--color-border, #333);
    border-radius: 6px;
    padding: 5px 10px;
    color: var(--color-text-secondary, #aaa);
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
  }
  .load-more-btn:hover { border-color: var(--color-accent, #00DC82); color: var(--color-text-primary, #fff); }
`;

export class SearchOverlay {
  private host!: HTMLElement;
  private shadow!: ShadowRoot;
  private overlayEl!: HTMLElement;
  private resultsArea!: HTMLElement;
  private indexSelect: HTMLSelectElement | null = null;
  private countEl!: HTMLElement;
  private allResults: EnrichedResult[] = [];
  private nextPageToken?: string;
  private totalResults = 0;
  private lastQuery = '';
  private lastSettings: ExtensionSettings | null = null;
  private anchorEl: HTMLElement | null = null;

  init(anchorEl?: HTMLElement): void {
    this.anchorEl = anchorEl ?? null;

    // Remove any existing host
    document.getElementById(OVERLAY_ID)?.remove();

    this.host = document.createElement('div');
    this.host.id = OVERLAY_ID;
    this.host.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483646; pointer-events: none;';
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/strand.css');
    this.shadow.appendChild(link);

    const style = document.createElement('style');
    style.textContent = OVERLAY_STYLES;
    this.shadow.appendChild(style);

    this.buildOverlay();
    this.host.style.display = 'none';
  }

  private buildOverlay(): void {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'overlay';

    // Header
    const header = document.createElement('div');
    header.className = 'overlay-header';
    header.innerHTML = `
      <div class="overlay-title">
        TwelveLabs Search &mdash; <span class="overlay-query"></span>
      </div>
    `;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'overlay-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    // Results
    this.resultsArea = document.createElement('div');
    this.resultsArea.className = 'results-area';

    // Footer
    const footer = document.createElement('div');
    footer.className = 'overlay-footer';
    this.countEl = document.createElement('span');
    this.countEl.className = 'result-count';
    footer.appendChild(this.countEl);

    this.overlayEl.appendChild(header);
    this.overlayEl.appendChild(this.resultsArea);
    this.overlayEl.appendChild(footer);
    this.shadow.appendChild(this.overlayEl);
  }

  async search(query: string, settings: ExtensionSettings, pageToken?: string): Promise<void> {
    this.lastQuery = query;
    this.lastSettings = settings;

    if (!pageToken) {
      this.allResults = [];
      this.position();
      this.show();

      // Update query label
      const queryEl = this.shadow.querySelector<HTMLElement>('.overlay-query');
      if (queryEl) queryEl.textContent = `"${query}"`;

      // Rebuild index selector if needed
      this.rebuildIndexSelector(settings.tl_indexes);
    }

    const indexId = this.indexSelect?.value
      ?? settings.tl_indexes.find((i) => i.default)?.id
      ?? settings.tl_indexes[0]?.id;

    if (!indexId) {
      renderError(this.resultsArea, 'No index configured. Open extension settings to add a TwelveLabs index.');
      return;
    }

    renderLoading(this.resultsArea);

    const request: SearchRequest = {
      action: 'search',
      query,
      indexId,
      searchType: 'text',
      pageToken,
    };

    chrome.runtime.sendMessage(request, (response: SearchResponse) => {
      if (!response || !response.success) {
        renderError(this.resultsArea, response?.error ?? 'Search failed');
        return;
      }

      this.allResults = [...this.allResults, ...(response.results ?? [])];
      this.nextPageToken = response.pageInfo?.nextPageToken;
      this.totalResults = response.pageInfo?.totalResults ?? 0;

      renderResults(this.resultsArea, this.allResults);

      if (this.nextPageToken) {
        const loadMore = document.createElement('button');
        loadMore.className = 'load-more-btn';
        loadMore.textContent = `Load more (${this.totalResults - this.allResults.length} remaining)`;
        loadMore.addEventListener('click', () =>
          this.search(this.lastQuery, this.lastSettings!, this.nextPageToken)
        );
        this.resultsArea.appendChild(loadMore);
      }

      this.countEl.textContent = `${this.allResults.length} of ${this.totalResults} results`;
    });
  }

  private rebuildIndexSelector(indexes: Array<{ id: string; label: string; default: boolean }>): void {
    // Remove existing
    this.shadow.querySelector('.overlay-index')?.remove();
    this.indexSelect = null;

    if (indexes.length <= 1) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'overlay-index';
    const sel = document.createElement('select');
    sel.className = 'index-select';
    for (const idx of indexes) {
      const opt = document.createElement('option');
      opt.value = idx.id;
      opt.textContent = idx.label;
      if (idx.default) opt.selected = true;
      sel.appendChild(opt);
    }
    wrapper.appendChild(sel);
    this.indexSelect = sel;

    // Insert before results area
    this.overlayEl.insertBefore(wrapper, this.resultsArea);
  }

  private position(): void {
    if (!this.anchorEl) {
      // Default: top-right corner below any toolbar
      this.overlayEl.style.top = '60px';
      this.overlayEl.style.right = '16px';
      this.overlayEl.style.left = 'auto';
      return;
    }

    const rect = this.anchorEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const overlayHeight = 520;

    if (spaceBelow >= overlayHeight || spaceBelow >= 200) {
      // Position below anchor
      this.overlayEl.style.top = `${rect.bottom + 6}px`;
    } else {
      // Position above anchor
      this.overlayEl.style.top = `${rect.top - overlayHeight - 6}px`;
    }

    // Align left edge with anchor, but keep on-screen
    let left = rect.left;
    const overlayWidth = 420;
    if (left + overlayWidth > window.innerWidth - 16) {
      left = window.innerWidth - overlayWidth - 16;
    }
    this.overlayEl.style.left = `${Math.max(8, left)}px`;
    this.overlayEl.style.right = 'auto';
  }

  show(): void {
    this.host.style.display = '';
  }

  hide(): void {
    this.host.style.display = 'none';
  }
}
