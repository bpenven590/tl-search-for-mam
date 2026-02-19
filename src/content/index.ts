import { loadSettings } from '../shared/settings';
import { getPlatformConfig } from '../platforms/registry';
import { SearchPanel } from './panel';

// --- Timestamp seeking via #tl_seek= hash ---
// Runs unconditionally so seeking works even if the panel is disabled/unconfigured.

function handleTlSeek(): void {
  const match = window.location.hash.match(/tl_seek=([\d.]+)/);
  if (!match) return;

  const seekTo = parseFloat(match[1]);
  if (isNaN(seekTo)) return;

  // Clean the hash immediately so it doesn't linger in the URL
  history.replaceState(null, '', window.location.pathname + window.location.search);

  const deadline = Date.now() + 10_000;
  const poll = setInterval(() => {
    const video = document.querySelector('video');
    if (video && video.readyState >= 2) {
      clearInterval(poll);
      video.currentTime = seekTo;
      return;
    }
    if (Date.now() >= deadline) {
      clearInterval(poll);
      console.debug('[TL Search] gave up waiting for video readyState >= 2');
    }
  }, 200);
}

handleTlSeek();
window.addEventListener('hashchange', handleTlSeek);

// --- Search panel ---

async function main(): Promise<void> {
  const hostname = window.location.hostname;
  const config = getPlatformConfig(hostname);

  if (!config) {
    console.debug('[TL Search] No platform config for', hostname);
    return;
  }

  const settings = await loadSettings();

  const platformSettings = settings.platforms[hostname];
  if (!platformSettings?.enabled) {
    console.debug('[TL Search] Platform disabled for', hostname);
    return;
  }

  const panel = new SearchPanel();
  await panel.init();
  panel.show();
}

main().catch(console.error);
