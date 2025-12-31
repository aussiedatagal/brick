/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const base = process.env.NODE_ENV === 'production' ? '/brick/' : '/';

// Plugin to replace BASE_URL placeholder in HTML and manifest.json
const htmlBasePlugin = (): Plugin => {
  return {
    name: 'html-base-url',
    transformIndexHtml(html) {
      return html.replace(/__BASE_URL__/g, base);
    },
    writeBundle() {
      // Transform manifest.json after it's copied to dist
      const manifestPath = join(process.cwd(), 'dist', 'manifest.json');
      try {
        const manifestContent = readFileSync(manifestPath, 'utf-8');
        const transformed = manifestContent.replace(/__BASE_URL__/g, base);
        writeFileSync(manifestPath, transformed);
      } catch (error) {
        // Manifest might not exist, that's okay
        console.warn('Could not transform manifest.json:', error);
      }
    },
  };
};

export default defineConfig({
  plugins: [react(), htmlBasePlugin()],
  base,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});

