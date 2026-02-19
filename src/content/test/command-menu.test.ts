import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandMenu } from '../command-menu';

function createAnchor(): HTMLInputElement {
  const anchor = document.createElement('input');
  anchor.style.cssText = 'position: fixed; top: 50px; left: 50px; width: 200px; height: 30px;';
  document.body.appendChild(anchor);
  // getBoundingClientRect is not real in jsdom, so we mock it
  anchor.getBoundingClientRect = () => ({
    top: 50, left: 50, bottom: 80, right: 250, width: 200, height: 30, x: 50, y: 50,
    toJSON() { return this; },
  });
  return anchor;
}

/** Fire a mousedown event (navigation handlers use mousedown, not click). */
function mousedown(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

function mockSendMessage(response: Record<string, unknown>): void {
  (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (_msg: unknown, cb: (resp: unknown) => void) => {
      cb(response);
    }
  );
}

describe('CommandMenu', () => {
  let anchor: HTMLInputElement;
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    anchor = createAnchor();
    onDismiss = vi.fn();
  });

  afterEach(() => {
    anchor.remove();
  });

  describe('Command Picker', () => {
    it('showCommandPicker() creates the picker element in shadow DOM', () => {
      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();

      const picker = menu.getShadow()!.querySelector('[data-testid="cmd-picker"]');
      expect(picker).not.toBeNull();
      expect(picker?.textContent).toContain('Entities');
      expect(menu.isVisible()).toBe(true);
    });

    it('dismiss() removes the picker and calls onDismiss', () => {
      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();
      expect(menu.getShadow()!.querySelector('[data-testid="cmd-picker"]')).not.toBeNull();

      menu.dismiss();
      expect(menu.getShadow()).toBeNull();
      expect(onDismiss).toHaveBeenCalledOnce();
      expect(menu.isVisible()).toBe(false);
    });

    it('clicking Entities row opens the entity browser', () => {
      mockSendMessage({ success: true, collections: [] });

      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();

      const entitiesRow = menu.getShadow()!.querySelector<HTMLElement>('[data-testid="cmd-entities"]');
      expect(entitiesRow).not.toBeNull();
      entitiesRow!.click();

      // Picker should be replaced by entity browser
      expect(menu.getShadow()!.querySelector('[data-testid="cmd-picker"]')).toBeNull();
      expect(menu.getShadow()!.querySelector('[data-testid="entity-browser"]')).not.toBeNull();
    });
  });

  describe('Entity Browser - Collections View', () => {
    it('renders collections when shown', async () => {
      const collections = [
        { id: 'col-1', name: 'Athletes', entityCount: 5 },
        { id: 'col-2', name: 'Products', entityCount: 12 },
      ];
      mockSendMessage({ success: true, collections });

      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();
      menu.getShadow()!.querySelector<HTMLElement>('[data-testid="cmd-entities"]')!.click();

      // Wait for async fetch
      await vi.waitFor(() => {
        const row1 = menu.getShadow()!.querySelector('[data-testid="collection-col-1"]');
        expect(row1).not.toBeNull();
        expect(row1?.textContent).toContain('Athletes');
        expect(row1?.textContent).toContain('5');
      });

      const row2 = menu.getShadow()!.querySelector('[data-testid="collection-col-2"]');
      expect(row2).not.toBeNull();
      expect(row2?.textContent).toContain('Products');
    });

    it('shows empty message when no collections', async () => {
      mockSendMessage({ success: true, collections: [] });

      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();
      menu.getShadow()!.querySelector<HTMLElement>('[data-testid="cmd-entities"]')!.click();

      await vi.waitFor(() => {
        const list = menu.getShadow()!.querySelector('[data-testid="collections-list"]');
        expect(list?.textContent).toContain('No collections yet');
      });
    });

    it('clicking a collection navigates to entities view', async () => {
      mockSendMessage({ success: true, collections: [{ id: 'col-1', name: 'Athletes', entityCount: 3 }] });

      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();
      menu.getShadow()!.querySelector<HTMLElement>('[data-testid="cmd-entities"]')!.click();

      // Wait for collections to load
      await vi.waitFor(() => {
        expect(menu.getShadow()!.querySelector('[data-testid="collection-col-1"]')).not.toBeNull();
      });

      // Mock entities response for the next call
      mockSendMessage({ success: true, entities: [{ id: 'e-1', name: 'John', status: 'ready', assetCount: 2 }] });
      mousedown(menu.getShadow()!.querySelector<HTMLElement>('[data-testid="collection-col-1"]')!);

      await vi.waitFor(() => {
        const list = menu.getShadow()!.querySelector('[data-testid="entities-list"]');
        expect(list).not.toBeNull();
      });
    });
  });

  describe('Entity Browser - Create Entity Form', () => {
    it('shows error state when creation fails with duplicate name', async () => {
      // First: load collections
      mockSendMessage({ success: true, collections: [{ id: 'col-1', name: 'Athletes', entityCount: 0 }] });
      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();
      menu.getShadow()!.querySelector<HTMLElement>('[data-testid="cmd-entities"]')!.click();

      await vi.waitFor(() => {
        expect(menu.getShadow()!.querySelector('[data-testid="collection-col-1"]')).not.toBeNull();
      });

      // Navigate to entities
      mockSendMessage({ success: true, entities: [] });
      mousedown(menu.getShadow()!.querySelector<HTMLElement>('[data-testid="collection-col-1"]')!);

      await vi.waitFor(() => {
        expect(menu.getShadow()!.querySelector('[data-testid="new-entity-btn"]')).not.toBeNull();
      });

      // Click "New Entity"
      mousedown(menu.getShadow()!.querySelector<HTMLElement>('[data-testid="new-entity-btn"]')!);

      await vi.waitFor(() => {
        expect(menu.getShadow()!.querySelector('[data-testid="entity-name-input"]')).not.toBeNull();
      });

      // Fill in name
      const nameInput = menu.getShadow()!.querySelector<HTMLInputElement>('[data-testid="entity-name-input"]')!;
      nameInput.value = 'Duplicate Person';

      // Mock the error response
      mockSendMessage({ success: false, error: 'Entity already exists' });

      // Click create
      menu.getShadow()!.querySelector<HTMLElement>('[data-testid="create-entity-btn"]')!.click();

      await vi.waitFor(() => {
        const errorEl = menu.getShadow()!.querySelector<HTMLElement>('[data-testid="entity-error"]');
        expect(errorEl?.style.display).not.toBe('none');
        expect(errorEl?.textContent).toContain('already exists');
      });
    });
  });

  describe('Entity Browser - Create Collection Form', () => {
    it('New Collection button shows create form', async () => {
      mockSendMessage({ success: true, collections: [] });

      const menu = new CommandMenu(anchor, onDismiss);
      menu.showCommandPicker();
      menu.getShadow()!.querySelector<HTMLElement>('[data-testid="cmd-entities"]')!.click();

      await vi.waitFor(() => {
        expect(menu.getShadow()!.querySelector('[data-testid="new-collection-btn"]')).not.toBeNull();
      });

      mousedown(menu.getShadow()!.querySelector<HTMLElement>('[data-testid="new-collection-btn"]')!);

      await vi.waitFor(() => {
        expect(menu.getShadow()!.querySelector('[data-testid="collection-name-input"]')).not.toBeNull();
        expect(menu.getShadow()!.querySelector('[data-testid="create-collection-btn"]')).not.toBeNull();
      });
    });
  });
});
