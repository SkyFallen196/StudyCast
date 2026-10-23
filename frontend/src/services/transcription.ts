import { useSyncExternalStore } from 'react';
import { appendChunkSegments, getAudio, getRecord, updateRecord } from './storage';
import { hasWebGPU } from '../lib/audio';
import { splitOnPauses } from '../lib/chunks';
import type { SegmentDraft } from '../types';
import type { WorkerRequest, WorkerResponse } from '../workers/asr.protocol';

/**
 * TranscriptionService (FE-020, FE-021): декодирует аудио, режет на фрагменты до 30 секунд по паузам
 * и по одному отправляет их в Web Worker. После каждого фрагмента текст и прогресс сохраняются
 * в IndexedDB — при закрытии вкладки распознанная часть не теряется, а работа продолжается с того же фрагмента.
 */

export const SAMPLE_RATE = 16_000;
export const CHUNK_SECONDS = 30;

export type JobState =
  | { phase: 'decoding' }
  | { phase: 'loading-model'; loaded: number; total: number }
  | { phase: 'transcribing'; chunk: number; total: number }
  | { phase: 'error'; message: string };

const jobs = new Map<string, JobState>();
const listeners = new Set<() => void>();
const cancelled = new Set<string>();
const queue: string[] = [];
let running: string | null = null;

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, { resolve: (s: SegmentDraft[]) => void; reject: (e: Error) => void }>();
let modelProgressHandler: ((loaded: number, total: number) => void) | null = null;

function setJob(recordId: string, state: JobState | null) {
  if (state) jobs.set(recordId, state);
  else jobs.delete(recordId);
  listeners.forEach((l) => l());
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/asr.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (message.type === 'model-progress') modelProgressHandler?.(message.loaded, message.total);
    else if (message.type === 'result') {
      pending.get(message.id)?.resolve(message.segments);
      pending.delete(message.id);
    } else if (message.type === 'error' && message.id !== undefined) {
      pending.get(message.id)?.reject(new Error(message.message));
      pending.delete(message.id);
    }
  };
  worker.onerror = (event) => {
    pending.forEach((p) => p.reject(new Error(event.message || 'Сбой обработчика распознавания')));
    pending.clear();
    worker = null;
  };
  return worker;
}

function transcribeChunk(audio: Float32Array, offset: number, device: 'webgpu' | 'wasm'): Promise<SegmentDraft[]> {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const request: WorkerRequest = { type: 'transcribe', id, device, audio, sampleRate: SAMPLE_RATE, offset };
    getWorker().postMessage(request, [audio.buffer]);
  });
}

/** Декодирование в моно 16 кГц — формат, который ожидает Whisper. */
async function decodeAudio(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
    }
    return mono;
  } finally {
    context.close();
  }
}

function humanError(error: unknown): string {
  const text = (error as Error)?.message ?? String(error);
  if (/fetch|network|load model|Failed to/i.test(text)) {
    return `Не удалось загрузить модель распознавания. Проверьте подключение к сети и повторите. (${text})`;
  }
  if (/decode|EncodingError/i.test(text)) return 'Браузер не смог декодировать аудиофайл.';
  return `Ошибка распознавания: ${text}`;
}

async function run(recordId: string) {
  const record = await getRecord(recordId);
  const blob = await getAudio(recordId);
  if (!record || !blob) return;

  try {
    setJob(recordId, { phase: 'decoding' });
    const samples = await decodeAudio(blob);
    const chunks = splitOnPauses(samples, SAMPLE_RATE, CHUNK_SECONDS);
    const total = chunks.length;
    const device = (await hasWebGPU()) ? 'webgpu' : 'wasm';
    await updateRecord(recordId, { status: 'transcribing', totalChunks: total, error: undefined });

    let modelReady = false;
    modelProgressHandler = (loaded, totalBytes) => {
      if (!modelReady) setJob(recordId, { phase: 'loading-model', loaded, total: totalBytes });
    };

    for (let i = record.processedChunks; i < total; i++) {
      if (cancelled.has(recordId)) return;
      if (modelReady) setJob(recordId, { phase: 'transcribing', chunk: i, total });
      const { start, end } = chunks[i];
      const segments = await transcribeChunk(samples.slice(start, end), start / SAMPLE_RATE, device);
      modelReady = true;
      if (cancelled.has(recordId)) return;
      await appendChunkSegments(recordId, segments, i + 1);
      setJob(recordId, { phase: 'transcribing', chunk: i + 1, total });
    }

    await updateRecord(recordId, { status: 'ready', processedChunks: total });
    setJob(recordId, null);
  } catch (error) {
    const message = humanError(error);
    if (!cancelled.has(recordId)) {
      await updateRecord(recordId, { status: 'error', error: message });
      setJob(recordId, { phase: 'error', message });
    }
  } finally {
    modelProgressHandler = null;
  }
}

async function drain() {
  if (running) return;
  while (queue.length > 0) {
    running = queue.shift()!;
    await run(running);
    cancelled.delete(running);
    running = null;
  }
}

/** Ставит запись в очередь распознавания. Повторный вызов для той же записи ничего не делает. */
export function startTranscription(recordId: string) {
  if (running === recordId || queue.includes(recordId)) return;
  cancelled.delete(recordId);
  setJob(recordId, { phase: 'decoding' });
  queue.push(recordId);
  void drain();
}

/** Останавливает распознавание (при удалении записи). Текущий фрагмент дорабатывается, но не сохраняется. */
export function cancelTranscription(recordId: string) {
  const index = queue.indexOf(recordId);
  if (index !== -1) queue.splice(index, 1);
  if (running === recordId) cancelled.add(recordId);
  setJob(recordId, null);
}

export function isActive(recordId: string) {
  return running === recordId || queue.includes(recordId);
}

export function useTranscriptionJob(recordId: string | undefined): JobState | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (recordId ? jobs.get(recordId) ?? null : null),
  );
}
