# StudyCast — frontend

React + Vite + TypeScript. Проект Vite создаётся в задаче FE-001; сейчас здесь только структура папок.

| Папка | Назначение |
|---|---|
| `src/components/ui` | Button, StatusPill, Modal, Toast, Skeleton, EmptyState |
| `src/components` | RecordCard, SearchField, SegmentRow, Player, Transcript |
| `src/pages` | Library, Import, Record, Devices, Pair, Settings, NotFound |
| `src/services` | StorageService, TranscriptionService, SubtitleService, SearchService, ExportService, SyncService, ApiClient |
| `src/stores` | Zustand stores |
| `src/workers` | `asr.worker.ts` — распознавание речи (transformers.js) |
| `src/types` | Record, Segment, Bookmark, AudioBlob |
| `src/lib` | утилиты (форматирование времени, нормализация текста) |
| `src/styles` | дизайн-токены и глобальные стили |
| `tests/e2e` | Playwright |
