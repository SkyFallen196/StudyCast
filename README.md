# StudyCast

StudyCast — поиск по собственным аудиозаписям лекций.

Студент открывает запись занятия с телефона, приложение расшифровывает её прямо в браузере и показывает текст с таймкодами рядом с плеером. По тексту можно искать, переходить к нужному моменту аудио, ставить закладки с заметками и выгружать конспект в Markdown или SRT. Аудиофайл не покидает устройство: сервер хранит только текст расшифровок и нужен, чтобы открыть тот же конспект на втором устройстве по одноразовому коду. Регистрации нет.

> Статус: неделя 4 — начальная структура репозитория и HTML-структура главной страницы. Разработка приложения начинается с задачи FE-001.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React + Vite + TypeScript, React Router, Tailwind CSS, Zustand |
| Распознавание речи | transformers.js (onnxruntime-web), Whisper tiny/base, WebGPU или WASM, Web Worker |
| Локальное хранилище | IndexedDB (Dexie), Cache Storage |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic, пакетный менеджер uv |
| База данных | PostgreSQL |
| Тесты | Vitest, Testing Library, Playwright, pytest |
| Инфраструктура | Docker Compose: frontend (nginx), backend, postgres |

## Структура репозитория

```
StudyCast/
├── frontend/              # React-приложение (создаётся в FE-001)
│   ├── public/
│   ├── src/
│   │   ├── components/    # переиспользуемые компоненты (ui/ — Button, Modal, …)
│   │   ├── pages/         # Library, Import, Record, Devices, Pair, Settings, NotFound
│   │   ├── services/      # Storage, Transcription, Subtitle, Search, Export, Sync
│   │   ├── stores/        # Zustand stores
│   │   ├── workers/       # Web Worker распознавания речи
│   │   ├── types/         # модели данных
│   │   ├── lib/           # утилиты
│   │   └── styles/        # дизайн-токены и глобальные стили
│   └── tests/e2e/         # Playwright
├── src/studycast/         # backend (FastAPI), пакет uv
│   ├── api/               # маршруты REST API
│   ├── db/                # модели SQLAlchemy и миграции
│   ├── schemas/           # Pydantic-схемы
│   └── services/          # сопряжение устройств, синхронизация
├── tests/                 # тесты backend (pytest)
├── tempPage/              # HTML-структура главной страницы (ЛР4)
├── pyproject.toml         # проект uv
└── uv.lock
```

## Запуск

Главная страница (временная HTML-структура): открыть `tempPage/index.html` в браузере.

Backend (пока только заготовка пакета):

```bash
uv sync
uv run studycast
```

Frontend появится после задачи FE-001 (`cd frontend && npm install && npm run dev`). Запуск всего проекта через `docker compose up` — задача FE-043.

## Соглашение о коммитах

[Conventional Commits](https://www.conventionalcommits.org/ru/) с номером задачи из backlog:

```
feat(FE-011): create library screen
fix(FE-027): fix search match counter
test(FE-041): add main scenario e2e test
docs(FE-043): update setup instructions
chore: update frontend dependencies
```
