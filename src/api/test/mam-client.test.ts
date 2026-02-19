import { describe, it, expect } from 'vitest';
import { getResolver } from '../mam-client';

describe('getResolver', () => {
  it('returns iconik resolver for iconik hostname', () => {
    const resolver = getResolver('app.iconik.io');
    expect(resolver).not.toBeNull();
  });

  it('returns null for unknown hostname', () => {
    expect(getResolver('unknown.example.com')).toBeNull();
  });
});
