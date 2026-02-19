import { describe, it, expect, beforeEach } from 'vitest';
import { renderResults, renderError, renderLoading } from '../results-renderer';
import type { EnrichedResult } from '../../shared/messages';

function makeResult(overrides: Partial<EnrichedResult> = {}): EnrichedResult {
  return {
    rank: 1, start: 7, end: 13.75, score: 0.95,
    videoId: 'vid-123', thumbnailUrl: '', filename: 'video.mp4',
    mamAssetId: 'asset-abc', deepLink: 'https://app.iconik.io/asset/asset-abc#tl_seek=7',
    ...overrides,
  };
}

describe('renderResults', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders empty state when no results', () => {
    renderResults(container, []);
    expect(container.innerHTML).toContain('No results');
  });

  it('renders all segments in global rank order', () => {
    const results = [
      makeResult({ videoId: 'v1', rank: 3 }),
      makeResult({ videoId: 'v2', rank: 1 }),
      makeResult({ videoId: 'v1', rank: 2 }),
    ];
    renderResults(container, results);
    const segments = container.querySelectorAll('.segment');
    expect(segments).toHaveLength(3);
    // Rank badges should appear in ascending order
    const ranks = Array.from(segments).map(s => s.querySelector('.rank')?.textContent);
    expect(ranks).toEqual(['#1', '#2', '#3']);
  });

  it('renders <a> with deep link when deepLink is present', () => {
    renderResults(container, [makeResult()]);
    const link = container.querySelector<HTMLAnchorElement>('a.segment');
    expect(link?.href).toContain('asset-abc');
  });

  it('renders <div> instead of <a> when deepLink is empty', () => {
    renderResults(container, [makeResult({ deepLink: '', mamAssetId: '' })]);
    expect(container.querySelector('a.segment')).toBeNull();
    expect(container.querySelector('div.segment')).not.toBeNull();
  });

  it('renders thumbnail when thumbnailUrl is provided', () => {
    renderResults(container, [makeResult({ thumbnailUrl: 'https://example.com/thumb.jpg' })]);
    const img = container.querySelector<HTMLImageElement>('.seg-thumb');
    expect(img?.src).toContain('thumb.jpg');
  });

  it('renders placeholder when thumbnailUrl is empty', () => {
    renderResults(container, [makeResult({ thumbnailUrl: '' })]);
    expect(container.querySelector('.seg-thumb-placeholder')).not.toBeNull();
  });
});

describe('renderError', () => {
  it('shows error message', () => {
    const container = document.createElement('div');
    renderError(container, 'Connection failed');
    expect(container.innerHTML).toContain('Connection failed');
  });
});

describe('renderLoading', () => {
  it('shows spinner', () => {
    const container = document.createElement('div');
    renderLoading(container);
    expect(container.querySelector('.spinner')).not.toBeNull();
  });
});
