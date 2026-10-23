/// <reference lib="webworker" />
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { WorkerRequest, WorkerResponse } from './asr.protocol';

/**
 * Распознавание речи в отдельном потоке (FE-018): интерфейс и плеер не блокируются.
 * Модель скачивается с Hugging Face один раз и дальше берётся из Cache Storage браузера.
 */

const MODEL = 'onnx-community/whisper-tiny';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function post(message: WorkerResponse) {
  ctx.postMessage(message);
}

function load(device: 'webgpu' | 'wasm') {
  if (asr) return asr;
  const files = new Map<string, { loaded: number; total: number }>();
  // Приведение типа: перегрузки pipeline() слишком сложны для компилятора TypeScript (TS2590)
  const createPipeline = pipeline as unknown as (task: string, model: string, options: object) => Promise<AutomaticSpeechRecognitionPipeline>;
  asr = createPipeline('automatic-speech-recognition', MODEL, {
    device,
    dtype: device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
    progress_callback: (info: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (info.status !== 'progress' || !info.file || !info.total) return;
      files.set(info.file, { loaded: info.loaded ?? 0, total: info.total });
      let loaded = 0;
      let total = 0;
      files.forEach((f) => {
        loaded += f.loaded;
        total += f.total;
      });
      post({ type: 'model-progress', loaded, total });
    },
  });
  asr.catch(() => {
    asr = null; // следующая попытка начнёт загрузку заново
  });
  return asr;
}

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'load') {
      await load(message.device);
      post({ type: 'ready' });
      return;
    }

    const model = await load(message.device);
    const chunkDuration = message.audio.length / message.sampleRate;
    const output = await model(message.audio, {
      language: 'russian',
      task: 'transcribe',
      return_timestamps: true,
      chunk_length_s: 30,
    });
    const result = Array.isArray(output) ? output[0] : output;
    const chunks = result.chunks ?? [{ text: result.text, timestamp: [0, chunkDuration] as [number, number | null] }];

    const segments = chunks
      .map((chunk) => {
        const [start, end] = chunk.timestamp;
        return {
          start: message.offset + Math.min(start ?? 0, chunkDuration),
          end: message.offset + Math.min(end ?? chunkDuration, chunkDuration),
          text: chunk.text.trim(),
        };
      })
      .filter((s) => s.text !== '');

    post({ type: 'result', id: message.id, segments });
  } catch (error) {
    post({ type: 'error', id: message.type === 'transcribe' ? message.id : undefined, message: (error as Error).message ?? String(error) });
  }
};
