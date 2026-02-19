// Injected at document_start — runs before any page scripts register event listeners.
//
// Problem: SPAs like Iconik register keyboard shortcuts at document/window level with
// { capture: true }. These fire BEFORE the keydown event reaches our Shadow DOM input,
// calling e.preventDefault() on keys like space, 's', 'f', arrows, etc.
// Our bubble-phase stopPropagation() can't undo a preventDefault from capture phase.
//
// Fix: register our own window capture listener NOW (before Iconik's scripts load),
// so ours fires first. When our panel input is focused we call stopImmediatePropagation()
// — but NOT preventDefault() — so characters are still inserted but Iconik's handlers
// never see the event.

const PANEL_ID = 'tl-mam-search-panel';

function isPanelInputFocused(): boolean {
  const host = document.getElementById(PANEL_ID) as HTMLElement & { shadowRoot: ShadowRoot | null };
  if (!host || !host.shadowRoot) return false;
  const active = host.shadowRoot.activeElement;
  return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
}

function guard(e: Event): void {
  if (isPanelInputFocused()) {
    // Let Enter propagate so our input's keydown handler can fire performSearch().
    // All other keys are stopped so Iconik's shortcuts (space=play, f=fullscreen, etc.)
    // don't fire while typing in our input.
    if ((e as KeyboardEvent).key === 'Enter') return;
    e.stopImmediatePropagation();
  }
}

window.addEventListener('keydown', guard, true);
window.addEventListener('keyup', guard, true);
window.addEventListener('keypress', guard, true);
