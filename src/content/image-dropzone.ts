export interface ImageDropzoneOptions {
  onImageUrl: (url: string) => void;
}

export function createImageDropzone(options: ImageDropzoneOptions): HTMLElement {
  const zone = document.createElement('div');
  zone.className = 'image-dropzone';
  zone.innerHTML = `
    <span class="dropzone-hint">Drop image or paste URL</span>
    <input class="dropzone-url" type="text" placeholder="https://example.com/image.jpg" />
  `;

  const input = zone.querySelector<HTMLInputElement>('.dropzone-url')!;

  // Paste URL in input
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && input.value.trim()) {
      options.onImageUrl(input.value.trim());
      input.value = '';
    }
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());
  input.addEventListener('keypress', (e) => e.stopPropagation());

  // Drag and drop files
  zone.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    zone.classList.remove('dragover');

    const url = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
    if (url?.startsWith('http')) {
      options.onImageUrl(url);
      return;
    }

    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          options.onImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  });

  return zone;
}
