import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

// Plugin to copy logo file from src/logo/ — filename has spaces so we use copyFileSync directly.
function copyLogos() {
  return {
    name: 'copy-logos',
    closeBundle() {
      mkdirSync('dist/icons', { recursive: true })
      copyFileSync('src/logo/Logo in Master Gradient.png', 'dist/icons/tl-logo.png')
      copyFileSync('src/logo/tl-icon-16.png', 'dist/icons/tl-icon-16.png')
      copyFileSync('src/logo/tl-icon-48.png', 'dist/icons/tl-icon-48.png')
      copyFileSync('src/logo/tl-icon-128.png', 'dist/icons/tl-icon-128.png')
    },
  }
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // background + popup as ES modules (background has "type":"module" in manifest,
        // popup is loaded via <script type="module"> in popup.html)
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.ts'),
        // content.js is built separately via vite.content.config.ts as an IIFE
        // because Chrome content scripts cannot use ES module import syntax
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'popup.html', dest: '.' },
        { src: 'styles/*', dest: 'styles' },
      ],
    }),
    copyLogos(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
})
