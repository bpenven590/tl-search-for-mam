import { SettingsForm } from './settings-form';

async function main(): Promise<void> {
  const root = document.getElementById('popup-root');
  if (!root) return;

  const form = new SettingsForm(root);
  await form.init();
}

main().catch(console.error);
