import type { PlatformResolver } from '../platforms/types';
import { iconikResolver } from '../platforms/iconik/resolver';

const resolvers: Record<string, PlatformResolver> = {
  'app.iconik.io': iconikResolver,
};

export function getResolver(hostname: string): PlatformResolver | null {
  return resolvers[hostname] ?? null;
}
