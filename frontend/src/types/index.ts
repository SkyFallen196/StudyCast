/** Модели данных по ТЗ, раздел 7.1. Сущности сервера (Library, Device, PairingCode) — в следующей версии. */

export type RecordSource = 'asr' | 'subtitles';

/**
 * queued — файл импортирован, распознавание ещё не запускалось;
 * transcribing — идёт распознавание; ready — текст получен; error — распознавание прервано ошибкой.
 */
export type RecordStatus = 'queued' | 'transcribing' | 'ready' | 'error';

export interface LectureRecord {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Длительность в секундах. */
  duration: number;
  language: string;
  source: RecordSource;
  status: RecordStatus;
  /** Сколько 30-секундных фрагментов уже распознано — для прогресса и возобновления. */
  processedChunks: number;
  totalChunks: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Segment {
  id: string;
  recordId: string;
  index: number;
  /** Начало и конец фразы в секундах. */
  start: number;
  end: number;
  text: string;
  edited: boolean;
}

export interface Bookmark {
  id: string;
  recordId: string;
  segmentId: string;
  time: number;
  note: string;
  createdAt: number;
}

/** Аудиофайл хранится только в браузере и никуда не передаётся. */
export interface AudioBlob {
  recordId: string;
  blob: Blob;
  mimeType: string;
}

/** Фраза без привязки к записи — результат разбора субтитров или распознавания. */
export interface SegmentDraft {
  start: number;
  end: number;
  text: string;
}
