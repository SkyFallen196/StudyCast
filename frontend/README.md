# StudyCast — frontend

React 18 + Vite + TypeScript. Первая версия MVP (ЛР6): работает полностью в браузере, без сервера.

## Запуск

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # unit-тесты Vitest: субтитры, поиск, экспорт, время
npm run build      # проверка типов и production-сборка в dist/
```

Нужен Node.js 20+. При первом распознавании браузер скачивает модель Whisper tiny с Hugging Face: ~115 МБ в режиме WebGPU (Chrome, Edge) или ~40 МБ в режиме WASM, дальше она берётся из кэша.

## Структура

| Папка | Назначение |
|---|---|
| `src/pages` | Library, Import, Record, Devices и Settings (заглушки), NotFound |
| `src/components` | Layout, RecordCard, Player, Transcript, SearchBar, BookmarksPanel, ExportDialog, ConfirmDialog, TranscriptionStatus |
| `src/services` | `db.ts` — схема IndexedDB (Dexie), `storage.ts` — StorageService, `transcription.ts` — TranscriptionService |
| `src/workers` | `asr.worker.ts` — распознавание речи (transformers.js) в Web Worker |
| `src/lib` | парсер SRT/VTT, поиск, экспорт Markdown/SRT, проверки аудиофайла, форматирование времени |
| `src/types` | LectureRecord, Segment, Bookmark, AudioBlob |
| `src/styles` | `global.css` — токены и общие компоненты (из ЛР5), `record.css` — экран записи |

Компоненты не обращаются к IndexedDB напрямую — только через `services/storage.ts` (ТЗ 7.3).
