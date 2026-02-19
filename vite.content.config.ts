// Separate Vite build for the content script.
// Chrome content scripts are injected as classic scripts (not ES modules),
// so content.js must be a self-contained IIFE with all dependencies inlined.
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'TLSearchContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe the dist/ from the main build
    minify: false,
    sourcemap: false,
  },
})
