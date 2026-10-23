import type { SegmentDraft } from '../types';

/** Сообщения между основным потоком и asr.worker.ts. */

export type WorkerRequest =
  | { type: 'load'; device: 'webgpu' | 'wasm' }
  | { type: 'transcribe'; id: number; device: 'webgpu' | 'wasm'; audio: Float32Array; sampleRate: number; offset: number };

export type WorkerResponse =
  | { type: 'model-progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; segments: SegmentDraft[] }
  | { type: 'error'; id?: number; message: string };
