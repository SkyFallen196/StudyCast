/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  worker: { format: 'es' },
  // transformers.js импортируется только из воркера. Без предварительной сборки Vite находит его
  // при первом распознавании и перезагружает страницу, прерывая обработку.
  optimizeDeps: { include: ['@huggingface/transformers'] },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
