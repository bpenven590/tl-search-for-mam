import { describe, it, expect, vi, beforeEach } from 'vitest';

// Panel tests are mostly integration - test the component structure
describe('SearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('can be imported without errors', async () => {
    // Smoke test - panel module loads
    const module = await import('../panel');
    expect(module.SearchPanel).toBeDefined();
  });
});
