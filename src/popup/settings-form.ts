import type { ExtensionSettings } from '../shared/settings';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../shared/settings';
import { PLATFORMS } from '../platforms/registry';
import { testTLConnection } from './connection-test';

const POPUP_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    background: var(--color-bg, #111);
    color: var(--color-text-primary, #fff);
    width: 380px;
    min-height: 400px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    background: var(--color-surface, #1a1a1a);
  }
  .header-logo {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    flex-shrink: 0;
    object-fit: contain;
  }
  .header-title { font-size: 14px; font-weight: 600; }
  .header-sub { font-size: 11px; color: var(--color-text-secondary, #888); margin-top: 1px; }
  .section {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
  }
  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
  }
  .field { margin-bottom: 10px; }
  .field:last-child { margin-bottom: 0; }
  .field label {
    display: block;
    font-size: 12px;
    color: var(--color-text-secondary, #aaa);
    margin-bottom: 4px;
  }
  .field input, .field select {
    width: 100%;
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 6px;
    padding: 7px 10px;
    color: var(--color-text-primary, #fff);
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }
  .field input:focus, .field select:focus {
    border-color: var(--color-accent, #00DC82);
  }
  .row { display: flex; gap: 8px; }
  .row .field { flex: 1; }
  .btn {
    padding: 7px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.85; }
  .btn-primary { background: var(--color-accent, #00DC82); color: #000; }
  .btn-secondary { background: var(--color-surface, #2a2a2a); color: var(--color-text-primary, #fff); border: 1px solid var(--color-border, #333); }
  .btn-sm { padding: 4px 10px; font-size: 11px; }
  .btn-danger { background: rgba(255,80,80,0.15); color: #ff5050; border: 1px solid rgba(255,80,80,0.3); }
  .index-list { margin-bottom: 8px; }
  .index-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: var(--color-surface, #1a1a1a);
    border-radius: 6px;
    margin-bottom: 4px;
    border: 1px solid var(--color-border, #2a2a2a);
  }
  .index-label { flex: 1; font-size: 12px; }
  .index-id { font-size: 10px; color: var(--color-text-secondary, #666); font-family: monospace; }
  .add-index { display: flex; gap: 6px; }
  .add-index input { flex: 1; }
  .status-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .status-dot.connected { background: #00DC82; }
  .status-dot.disconnected { background: #ff5050; }
  .status-dot.untested { background: #888; }
  .status-text { font-size: 11px; color: var(--color-text-secondary, #aaa); }
  .platform-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .platform-name { font-size: 12px; font-weight: 600; }
  .toggle-switch {
    position: relative;
    width: 32px;
    height: 18px;
    cursor: pointer;
  }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-track {
    position: absolute;
    inset: 0;
    background: var(--color-border, #333);
    border-radius: 999px;
    transition: background 0.2s;
  }
  .toggle-track::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
  }
  input:checked + .toggle-track { background: var(--color-accent, #00DC82); }
  input:checked + .toggle-track::after { transform: translateX(14px); }
  .footer {
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-surface, #1a1a1a);
  }
  .save-status { font-size: 11px; color: var(--color-accent, #00DC82); opacity: 0; transition: opacity 0.3s; }
  .save-status.visible { opacity: 1; }
  .import-export {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .import-status { font-size: 11px; flex: 1; opacity: 0; transition: opacity 0.3s; }
  .import-status.visible { opacity: 1; }
  .import-status.ok { color: var(--color-accent, #00DC82); }
  .import-status.err { color: #ff5050; }
`;

export class SettingsForm {
  private container: HTMLElement;
  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
  private connectionStatus: 'untested' | 'connected' | 'disconnected' = 'untested';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    this.settings = await loadSettings();
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const styleEl = document.createElement('style');
    styleEl.textContent = POPUP_STYLES;
    this.container.appendChild(styleEl);

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <img class="header-logo" src="icons/tl-logo.png" alt="TwelveLabs" />
      <div>
        <div class="header-title">TwelveLabs Search for MAM</div>
        <div class="header-sub">Configure your semantic video search</div>
      </div>
    `;
    this.container.appendChild(header);

    // TwelveLabs section
    this.container.appendChild(this.buildTLSection());

    // Platform sections
    for (const [hostname, platformConfig] of Object.entries(PLATFORMS)) {
      this.container.appendChild(this.buildPlatformSection(hostname, platformConfig));
    }

    // Preferences
    this.container.appendChild(this.buildPreferencesSection());

    // Export / Import
    this.container.appendChild(this.buildImportExportSection());

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';

    const saveStatus = document.createElement('span');
    saveStatus.className = 'save-status';
    saveStatus.id = 'save-status';
    saveStatus.textContent = 'Saved!';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Settings';
    saveBtn.addEventListener('click', () => this.save(saveStatus));

    footer.appendChild(saveStatus);
    footer.appendChild(saveBtn);
    this.container.appendChild(footer);
  }

  private buildTLSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<div class="section-title">TwelveLabs</div>`;

    const apiKeyField = document.createElement('div');
    apiKeyField.className = 'field';
    apiKeyField.innerHTML = `<label>API Key</label>`;

    const apiKeyRow = document.createElement('div');
    apiKeyRow.className = 'row';

    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.placeholder = 'tlk_...';
    apiKeyInput.value = this.settings.tl_api_key;
    apiKeyInput.id = 'tl-api-key';

    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn-secondary btn-sm';
    testBtn.textContent = 'Test';
    testBtn.style.alignSelf = 'flex-end';
    testBtn.style.height = '31px';
    testBtn.addEventListener('click', async () => {
      testBtn.textContent = '...';
      testBtn.disabled = true;
      const result = await testTLConnection(apiKeyInput.value);
      testBtn.textContent = 'Test';
      testBtn.disabled = false;
      this.connectionStatus = result.tl ? 'connected' : 'disconnected';
      this.updateStatusDot();
    });

    apiKeyRow.appendChild(apiKeyInput);
    apiKeyRow.appendChild(testBtn);
    apiKeyField.appendChild(apiKeyRow);
    section.appendChild(apiKeyField);

    // Status
    const statusRow = document.createElement('div');
    statusRow.className = 'status-row';
    statusRow.innerHTML = `
      <div class="status-dot untested" id="tl-status-dot"></div>
      <span class="status-text" id="tl-status-text">Not tested</span>
    `;
    section.appendChild(statusRow);

    // Index management
    const indexSection = document.createElement('div');
    indexSection.className = 'field';
    indexSection.style.marginTop = '12px';
    indexSection.innerHTML = `<label>Indexes</label>`;

    const indexList = document.createElement('div');
    indexList.className = 'index-list';
    indexList.id = 'index-list';
    this.renderIndexList(indexList);
    indexSection.appendChild(indexList);

    const addRow = document.createElement('div');
    addRow.className = 'add-index';

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.placeholder = 'Index ID';
    idInput.id = 'new-index-id';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Label';
    labelInput.id = 'new-index-label';
    labelInput.style.maxWidth = '120px';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-sm';
    addBtn.textContent = '+ Add';
    addBtn.style.whiteSpace = 'nowrap';
    addBtn.addEventListener('click', () => {
      const id = idInput.value.trim();
      const label = labelInput.value.trim() || id;
      if (!id) return;
      this.settings.tl_indexes.push({ id, label, default: this.settings.tl_indexes.length === 0 });
      idInput.value = '';
      labelInput.value = '';
      this.renderIndexList(indexList);
    });

    addRow.appendChild(idInput);
    addRow.appendChild(labelInput);
    addRow.appendChild(addBtn);
    indexSection.appendChild(addRow);
    section.appendChild(indexSection);

    return section;
  }

  private renderIndexList(container: HTMLElement): void {
    container.innerHTML = '';
    for (let i = 0; i < this.settings.tl_indexes.length; i++) {
      const idx = this.settings.tl_indexes[i];
      const item = document.createElement('div');
      item.className = 'index-item';
      item.innerHTML = `
        <div>
          <div class="index-label">${idx.label}</div>
          <div class="index-id">${idx.id}</div>
        </div>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-secondary btn-sm btn-danger';
      removeBtn.textContent = '\u2715';
      removeBtn.addEventListener('click', () => {
        this.settings.tl_indexes.splice(i, 1);
        this.renderIndexList(container);
      });

      item.appendChild(removeBtn);
      container.appendChild(item);
    }

    if (this.settings.tl_indexes.length === 0) {
      container.innerHTML = '<div style="font-size:11px;color:#666;padding:4px 0">No indexes added yet</div>';
    }
  }

  private updateStatusDot(): void {
    const dot = document.getElementById('tl-status-dot');
    const text = document.getElementById('tl-status-text');
    if (dot) {
      dot.className = `status-dot ${this.connectionStatus}`;
    }
    if (text) {
      text.textContent = this.connectionStatus === 'connected'
        ? 'Connected'
        : this.connectionStatus === 'disconnected'
        ? 'Connection failed'
        : 'Not tested';
    }
  }

  private buildPlatformSection(hostname: string, config: { name: string; requiresCredentials: boolean; credentialFields: Array<{ key: string; label: string; type: string; placeholder: string }> }): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';

    const platformSettings = this.settings.platforms[hostname] ?? {
      enabled: false,
      credentials: {},
      videoIdField: 'TL_VIDEO_ID',
    };

    const headerEl = document.createElement('div');
    headerEl.className = 'platform-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'platform-name';
    nameEl.textContent = config.name;

    const toggle = document.createElement('label');
    toggle.className = 'toggle-switch';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = platformSettings.enabled;
    toggleInput.id = `platform-${hostname}-enabled`;
    const toggleTrack = document.createElement('div');
    toggleTrack.className = 'toggle-track';
    toggle.appendChild(toggleInput);
    toggle.appendChild(toggleTrack);

    headerEl.appendChild(nameEl);
    headerEl.appendChild(toggle);
    section.appendChild(headerEl);

    if (config.requiresCredentials) {
      for (const field of config.credentialFields) {
        const fieldEl = document.createElement('div');
        fieldEl.className = 'field';

        const label = document.createElement('label');
        label.textContent = field.label;

        const input = document.createElement('input');
        input.type = field.type;
        input.placeholder = field.placeholder;
        input.value = platformSettings.credentials[field.key] ?? '';
        input.id = `platform-${hostname}-${field.key}`;

        fieldEl.appendChild(label);
        fieldEl.appendChild(input);
        section.appendChild(fieldEl);
      }

      // Video ID field name
      const vidField = document.createElement('div');
      vidField.className = 'field';
      const vidLabel = document.createElement('label');
      vidLabel.textContent = 'TL Video ID metadata field name';
      const vidInput = document.createElement('input');
      vidInput.type = 'text';
      vidInput.placeholder = 'TL_VIDEO_ID';
      vidInput.value = platformSettings.videoIdField || 'TL_VIDEO_ID';
      vidInput.id = `platform-${hostname}-videoIdField`;
      vidField.appendChild(vidLabel);
      vidField.appendChild(vidInput);
      section.appendChild(vidField);
    }

    return section;
  }

  private buildPreferencesSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<div class="section-title">Preferences</div>`;

    const themeField = document.createElement('div');
    themeField.className = 'field';
    themeField.innerHTML = `<label>Theme</label>`;
    const themeSelect = document.createElement('select');
    themeSelect.id = 'pref-theme';
    themeSelect.innerHTML = `
      <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
      <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
      <option value="auto" ${this.settings.theme === 'auto' ? 'selected' : ''}>Auto</option>
    `;
    themeField.appendChild(themeSelect);
    section.appendChild(themeField);

    return section;
  }

  private buildImportExportSection(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'import-export';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary btn-sm';
    exportBtn.textContent = 'Export Config';
    exportBtn.addEventListener('click', () => this.exportConfig());

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary btn-sm';
    importBtn.textContent = 'Import Config';
    importBtn.addEventListener('click', () => fileInput.click());

    const status = document.createElement('span');
    status.className = 'import-status';

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      this.importConfig(file, status);
      fileInput.value = '';
    });

    row.appendChild(exportBtn);
    row.appendChild(importBtn);
    row.appendChild(fileInput);
    row.appendChild(status);
    return row;
  }

  private exportConfig(): void {
    const data = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tl-search-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private importConfig(file: File, statusEl: HTMLElement): void {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<ExtensionSettings>;
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid config file');

        const merged: ExtensionSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          platforms: {
            ...DEFAULT_SETTINGS.platforms,
            ...(parsed.platforms ?? {}),
          },
        };

        await saveSettings(merged);
        this.settings = merged;

        statusEl.textContent = 'Config imported!';
        statusEl.className = 'import-status ok visible';
        setTimeout(() => {
          statusEl.classList.remove('visible');
          this.render(); // Re-render form with new values
        }, 1200);
      } catch {
        statusEl.textContent = 'Invalid config file';
        statusEl.className = 'import-status err visible';
        setTimeout(() => statusEl.classList.remove('visible'), 2500);
      }
    };
    reader.readAsText(file);
  }

  private collectSettings(): ExtensionSettings {
    const apiKey = (document.getElementById('tl-api-key') as HTMLInputElement)?.value ?? '';
    const theme = (document.getElementById('pref-theme') as HTMLSelectElement)?.value as 'dark' | 'light' | 'auto';

    const platforms: ExtensionSettings['platforms'] = {};
    for (const [hostname, config] of Object.entries(PLATFORMS)) {
      const enabled = (document.getElementById(`platform-${hostname}-enabled`) as HTMLInputElement)?.checked ?? false;
      const videoIdField = (document.getElementById(`platform-${hostname}-videoIdField`) as HTMLInputElement)?.value ?? 'TL_VIDEO_ID';

      const credentials: Record<string, string> = {};
      for (const field of config.credentialFields) {
        const val = (document.getElementById(`platform-${hostname}-${field.key}`) as HTMLInputElement)?.value ?? '';
        credentials[field.key] = val;
      }

      platforms[hostname] = { enabled, credentials, videoIdField };
    }

    return {
      ...this.settings,
      tl_api_key: apiKey,
      theme,
      platforms,
    };
  }

  private async save(statusEl: HTMLElement): Promise<void> {
    const updated = this.collectSettings();
    await saveSettings(updated);
    this.settings = updated;
    statusEl.classList.add('visible');
    setTimeout(() => statusEl.classList.remove('visible'), 2000);
  }
}
