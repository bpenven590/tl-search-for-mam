import type { PlatformConfig } from '../platforms/types';

const FALLBACK_SELECTORS = [
  'input[type="search"]',
  'input[placeholder*="earch"]',
  'input[aria-label*="earch"]',
];

export class SearchIntercept {
  private config: PlatformConfig;
  private onSearch: (query: string) => void;

  private searchBar: HTMLInputElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private observer: MutationObserver | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private isEnabled = false;

  constructor(config: PlatformConfig, onSearch: (query: string) => void) {
    this.config = config;
    this.onSearch = onSearch;
  }

  init(): void {
    if (!this.attach()) {
      // Iconik is an SPA — the search bar may render after initial page load
      this.observer = new MutationObserver(() => {
        if (this.attach()) {
          this.observer?.disconnect();
          this.observer = null;
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  getSearchBar(): HTMLInputElement | null {
    return this.searchBar;
  }

  private findSearchBar(): HTMLInputElement | null {
    const selectors =
      this.config.searchBarSelectors.length > 0
        ? this.config.searchBarSelectors
        : FALLBACK_SELECTORS;

    for (const sel of selectors) {
      try {
        const el = document.querySelector<HTMLInputElement>(sel);
        // Only return if visible in the DOM
        if (el && el.offsetParent !== null) return el;
      } catch {
        // Invalid selector — skip
      }
    }
    return null;
  }

  private attach(): boolean {
    const bar = this.findSearchBar();
    if (!bar || this.toggleBtn) return !!this.toggleBtn; // already attached
    this.searchBar = bar;
    this.injectToggle(bar);
    return true;
  }

  private injectToggle(bar: HTMLInputElement): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Enable TwelveLabs Search';
    this.applyToggleStyle(btn, false);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    // Insert immediately after the search bar
    bar.parentElement?.insertBefore(btn, bar.nextSibling);
    this.toggleBtn = btn;
  }

  private applyToggleStyle(btn: HTMLButtonElement, enabled: boolean): void {
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
      padding: 5px 12px;
      border-radius: 20px;
      border: 1.5px solid ${enabled ? '#00DC82' : 'rgba(0,220,130,0.5)'};
      background: ${enabled ? '#00DC82' : 'transparent'};
      color: ${enabled ? '#000' : '#00DC82'};
      font-size: 12px;
      font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      white-space: nowrap;
      vertical-align: middle;
      transition: all 0.2s;
      line-height: 1;
      outline: none;
    `;
  }

  private toggle(): void {
    this.isEnabled = !this.isEnabled;

    if (this.toggleBtn) {
      this.toggleBtn.textContent = this.isEnabled
        ? '✓ TwelveLabs Search ON'
        : 'Enable TwelveLabs Search';
      this.applyToggleStyle(this.toggleBtn, this.isEnabled);
    }

    if (this.isEnabled) {
      this.keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          const query = this.searchBar?.value.trim() ?? '';
          if (query) this.onSearch(query);
        }
      };
      this.searchBar?.addEventListener('keydown', this.keyHandler);
    } else {
      if (this.keyHandler) {
        this.searchBar?.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
      }
    }
  }
}
