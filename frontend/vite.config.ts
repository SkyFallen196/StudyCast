/// <reference types="vitest" />
import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Политика безопасности контента для production-сборки. GitHub Pages не позволяет задавать HTTP-заголовки,
 * поэтому CSP добавляется через <meta>. В режиме разработки не используется: Vite и React Refresh вставляют inline-скрипты.
 * - скрипты и воркер — только со своего домена; 'wasm-unsafe-eval' нужен onnxruntime для компиляции WebAssembly;
 * - сеть — свой домен и Hugging Face (файлы модели распознавания, CDN *.hf.co);
 * - аудио и выгрузка файлов идут через blob: URL; 'unsafe-inline' в стилях нужен для style="" (позиция таймлайна).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function productionSecurity(): Plugin {
  let outDir = 'dist';
  return {
    name: 'studycast-production-security',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html
        .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`)
        .replace('<meta name="viewport"', '<meta name="referrer" content="no-referrer">\n    <meta name="viewport"');
    },
    // GitHub Pages отдаёт 404.html на любой неизвестный путь — так прямые ссылки на /records/… открывают приложение
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  // На GitHub Pages сайт лежит в подпапке /StudyCast/ — путь передаётся при сборке через BASE_PATH
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), productionSecurity()],
  server: { port: 5173 },
  worker: { format: 'es' },
  // transformers.js импортируется только из воркера. Без предварительной сборки Vite находит его
  // при первом распознавании и перезагружает страницу, прерывая обработку.
  optimizeDeps: { include: ['@huggingface/transformers'] },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
