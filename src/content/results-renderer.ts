import type { EnrichedResult } from '../shared/messages';
import { formatTime } from '../shared/utils';

export function renderResults(container: HTMLElement, results: EnrichedResult[]): void {
  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No results found</p>
        <p class="hint">Try different search terms or check your index configuration</p>
      </div>
    `;
    return;
  }

  // Global rank order — rank 1 always first regardless of which video it belongs to
  const sorted = [...results].sort((a, b) => a.rank - b.rank);

  for (const seg of sorted) {
    const hasLink = !!seg.deepLink;

    // Use <a> only when we have a valid deep link — empty href="" would navigate to
    // the current page (Iconik search) which is the bug we're fixing
    const el = document.createElement(hasLink ? 'a' : 'div') as HTMLAnchorElement;
    el.className = 'segment' + (hasLink ? '' : ' segment--no-link');

    if (hasLink) {
      el.href = seg.deepLink;
    }

    const thumb = seg.thumbnailUrl
      ? `<img class="seg-thumb" src="${escapeHtml(seg.thumbnailUrl)}" alt="" loading="lazy" />`
      : `<div class="seg-thumb-placeholder"></div>`;

    el.innerHTML = `
      ${thumb}
      <div class="seg-info">
        <div class="seg-filename">${escapeHtml(seg.filename)}</div>
        <div class="seg-time">${formatTime(seg.start)} – ${formatTime(seg.end)}</div>
      </div>
      <span class="rank">#${seg.rank}</span>
    `;

    container.appendChild(el);
  }
}

export function renderError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div class="error-state">
      <p class="error-title">Search failed</p>
      <p class="error-msg">${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderLoading(container: HTMLElement): void {
  container.innerHTML = `<div class="loading"><div class="spinner"></div><span>Searching...</span></div>`;
}

function escapeHtml(str: string | null | undefined): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
