export function createShadowContainer(id: string): { host: HTMLElement; shadow: ShadowRoot } {
  const host = document.createElement('div');
  host.id = id;
  host.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject Strand CSS tokens
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('styles/strand.css');
  shadow.appendChild(link);

  // Base styles for shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    :host { all: initial; }
  `;
  shadow.appendChild(style);

  return { host, shadow };
}
