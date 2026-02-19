import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content/keyboard-guard.ts'),
      name: 'TLSearchGuard',
      formats: ['iife'],
      fileName: () => 'keyboard-guard.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
  },
})
