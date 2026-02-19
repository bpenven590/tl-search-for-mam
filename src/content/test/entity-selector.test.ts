import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityChip } from '../entity-chip';
import type { EntityChipData } from '../entity-chip';
import { EntitySelector } from '../entity-selector';
import type { EntityCollection, Entity } from '../../shared/messages';

// -- EntityChip tests --

describe('EntityChip', () => {
  const mockEntity: EntityChipData = { id: 'ent-1', name: 'John Doe' };

  it('renders chip with entity name prefixed by @', () => {
    const chip = new EntityChip(mockEntity, () => {});
    const el = chip.getElement();
    expect(el.textContent).toContain('@John Doe');
  });

  it('renders a remove button with x character', () => {
    const chip = new EntityChip(mockEntity, () => {});
    const el = chip.getElement();
    const btn = el.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('\u00D7');
  });

  it('calls onRemove when x button is clicked', () => {
    const onRemove = vi.fn();
    const chip = new EntityChip(mockEntity, onRemove);
    const el = chip.getElement();
    const btn = el.querySelector('button')!;
    btn.click();
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('returns entity data via getData()', () => {
    const chip = new EntityChip(mockEntity, () => {});
    expect(chip.getData()).toEqual(mockEntity);
  });

  it('has data-entity-chip attribute with entity id', () => {
    const chip = new EntityChip(mockEntity, () => {});
    const el = chip.getElement();
    expect(el.getAttribute('data-entity-chip')).toBe('ent-1');
  });

  it('applies inline styles for pill appearance', () => {
    const chip = new EntityChip(mockEntity, () => {});
    const el = chip.getElement();
    expect(el.style.display).toBe('inline-flex');
    expect(el.style.borderRadius).toBe('999px');
  });
});

// -- EntitySelector tests --

function makeAnchor(): HTMLElement {
  const anchor = document.createElement('input');
  anchor.style.width = '300px';
  document.body.appendChild(anchor);
  // jsdom returns zeros for getBoundingClientRect; set a stub so positioning doesn't error
  anchor.getBoundingClientRect = () => ({
    top: 100, left: 50, bottom: 130, right: 350, width: 300, height: 30, x: 50, y: 100,
    toJSON() { return this; },
  });
  return anchor;
}

function makeCollections(count = 2): EntityCollection[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `col-${i + 1}`,
    name: `Collection ${i + 1}`,
    entityCount: 3,
  }));
}

function makeEntities(count = 3): Entity[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ent-${i + 1}`,
    name: `Entity ${i + 1}`,
    status: i === 0 ? 'processing' : 'ready',
    assetCount: 5,
  }));
}

/** Fire a mousedown event on an element (entity/collection row interaction method). */
function mousedown(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

describe('EntitySelector', () => {
  let anchor: HTMLElement;
  let onSelect: ReturnType<typeof vi.fn>;
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    anchor = makeAnchor();
    onSelect = vi.fn();
    onDismiss = vi.fn();
  });

  function shadow(selector: EntitySelector): ShadowRoot {
    return selector.getShadow()!;
  }

  it('show() creates a dropdown element in the shadow DOM', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections());
    const dropdown = shadow(selector).querySelector('[data-entity-selector]');
    expect(dropdown).not.toBeNull();
    expect(selector.isVisible()).toBe(true);
  });

  it('dismiss() removes dropdown from shadow root', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections());
    expect(shadow(selector).querySelector('[data-entity-selector]')).not.toBeNull();
    selector.dismiss();
    expect(selector.getShadow()).toBeNull();
    expect(selector.isVisible()).toBe(false);
  });

  it('renders collection rows with names and counts', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    const collections = makeCollections(2);
    selector.show(collections);
    const rows = shadow(selector).querySelectorAll('.collection-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.collection-name')?.textContent).toBe('Collection 1');
    expect(rows[0].querySelector('.collection-count')?.textContent).toBe('3');
  });

  it('shows empty message when no collections', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show([]);
    const empty = shadow(selector).querySelector('.empty-row');
    expect(empty?.textContent).toContain('No collections found');
  });

  it('clicking a collection row expands it and shows loading', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    const row = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(row);

    const loadingRow = shadow(selector).querySelector('.loading-row');
    expect(loadingRow?.textContent).toContain('Loading');
  });

  it('showEntities() populates entity rows for a collection', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    // Expand collection
    const row = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(row);

    // Load entities
    const entities = makeEntities(3);
    selector.showEntities('col-1', entities);

    const entityRows = shadow(selector).querySelectorAll('.entity-row');
    expect(entityRows).toHaveLength(3);
    expect(entityRows[0].querySelector('.entity-name')?.textContent).toBe('Entity 1');
  });

  it('entity rows show correct status badges', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    const row = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(row);

    selector.showEntities('col-1', makeEntities(2));

    const badges = shadow(selector).querySelectorAll('.status-badge');
    expect(badges[0].classList.contains('status-processing')).toBe(true);
    expect(badges[1].classList.contains('status-ready')).toBe(true);
  });

  it('clicking an entity calls onSelect with entity + collectionId, then dismisses', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    const colRow = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(colRow);

    const entities = makeEntities(1);
    selector.showEntities('col-1', entities);

    const entityRow = shadow(selector).querySelector('.entity-row') as HTMLElement;
    mousedown(entityRow);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith({
      ...entities[0],
      collectionId: 'col-1',
    });
    expect(selector.isVisible()).toBe(false);
  });

  it('filter() filters entity list within an expanded collection', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    // Expand collection first (mousedown)
    const colRow = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(colRow);

    const entities = [
      { id: 'e1', name: 'Alice Smith', status: 'ready', assetCount: 1 },
      { id: 'e2', name: 'Bob Jones', status: 'ready', assetCount: 2 },
      { id: 'e3', name: 'Alice Wong', status: 'processing', assetCount: 3 },
    ] satisfies Entity[];

    selector.showEntities('col-1', entities);
    // Collection is expanded so all 3 entities are visible
    expect(shadow(selector).querySelectorAll('.entity-row')).toHaveLength(3);

    // Filter within expanded collection
    selector.filter('alice');
    expect(shadow(selector).querySelectorAll('.entity-row')).toHaveLength(2);

    selector.filter('jones');
    expect(shadow(selector).querySelectorAll('.entity-row')).toHaveLength(1);
    expect(shadow(selector).querySelector('.entity-name')?.textContent).toBe('Bob Jones');
  });

  it('filter() in flat search mode shows entities matching filter across collections', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    const entities = [
      { id: 'e1', name: 'Alice Smith', status: 'ready', assetCount: 1 },
      { id: 'e2', name: 'Bob Jones', status: 'ready', assetCount: 2 },
      { id: 'e3', name: 'Alice Wong', status: 'processing', assetCount: 3 },
    ] satisfies Entity[];

    // Pre-populate entities (simulating background load), without expanding collection
    selector.showEntities('col-1', entities);

    // Filter without expanding — activates flat search mode
    selector.filter('alice');
    const entityRows = shadow(selector).querySelectorAll('.entity-row');
    expect(entityRows).toHaveLength(2);
    expect(entityRows[0].querySelector('.entity-name')?.textContent).toBe('Alice Smith');

    selector.filter('jones');
    expect(shadow(selector).querySelectorAll('.entity-row')).toHaveLength(1);
  });

  it('filter() shows "No matching entities" when nothing matches', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    const colRow = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(colRow);

    selector.showEntities('col-1', makeEntities(2));
    selector.filter('zzzzzzz');

    const empty = shadow(selector).querySelector('.empty-row');
    expect(empty?.textContent).toContain('No matching entities');
  });

  it('clicking a collection again collapses it', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections(1));

    const row = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(row); // expand
    selector.showEntities('col-1', makeEntities(2));
    expect(shadow(selector).querySelectorAll('.entity-row')).toHaveLength(2);

    // Re-query row after re-render
    const row2 = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(row2); // collapse
    expect(shadow(selector).querySelectorAll('.entity-row')).toHaveLength(0);
  });

  it('isVisible() returns false before show()', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    expect(selector.isVisible()).toBe(false);
  });

  it('dismiss on Escape key', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    selector.show(makeCollections());

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(selector.isVisible()).toBe(false);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('onLoadAll callback is triggered when filter becomes non-empty', () => {
    const onLoadAll = vi.fn();
    const selector = new EntitySelector(anchor, onSelect, onDismiss, undefined, onLoadAll);
    selector.show(makeCollections(1));

    // No callback before filter
    expect(onLoadAll).not.toHaveBeenCalled();

    selector.filter('alice');
    expect(onLoadAll).toHaveBeenCalledOnce();

    // Not called again on subsequent filter updates
    selector.filter('bob');
    expect(onLoadAll).toHaveBeenCalledOnce();
  });

  it('collection count badge updates to actual count after entities load', () => {
    const selector = new EntitySelector(anchor, onSelect, onDismiss);
    const collections = makeCollections(1); // entityCount: 3
    selector.show(collections);

    // Before loading: shows API count (3 > 0)
    const countBefore = shadow(selector).querySelector('.collection-count');
    expect(countBefore?.textContent).toBe('3');

    // Expand and load entities
    const row = shadow(selector).querySelector('.collection-row') as HTMLElement;
    mousedown(row);
    selector.showEntities('col-1', makeEntities(2)); // 2 actual entities

    // After loading: shows actual count (2)
    const countAfter = shadow(selector).querySelector('.collection-count');
    expect(countAfter?.textContent).toBe('2');
  });
});
