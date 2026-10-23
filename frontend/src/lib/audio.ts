/** Проверки аудиофайла по ТЗ 9.7 и чтение длительности. */

export const MAX_FILE_SIZE = 200 * 1024 * 1024;
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg'];
export const SUBTITLE_EXTENSIONS = ['srt', 'vtt'];

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Текст ошибки или null, если файл подходит. */
export function validateAudioFile(file: File): string | null {
  if (!AUDIO_EXTENSIONS.includes(extensionOf(file.name))) {
    return 'Формат не поддерживается. Выберите файл MP3, M4A, WAV или OGG.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Файл больше 200 МБ. Сожмите запись или разделите её на части.';
  }
  if (file.size === 0) {
    return 'Файл пустой.';
  }
  return null;
}

export function validateSubtitleFile(file: File): string | null {
  if (!SUBTITLE_EXTENSIONS.includes(extensionOf(file.name))) {
    return 'Нужен файл субтитров SRT или VTT.';
  }
  return null;
}

/** Длительность через <audio>: браузер читает только заголовок файла, это быстро. */
export function readDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const { duration } = audio;
      URL.revokeObjectURL(url);
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error('Не удалось определить длительность записи.'));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Браузер не может воспроизвести этот файл. Возможно, он повреждён.'));
    };
    audio.src = url;
  });
}

let gpuCheck: Promise<boolean> | null = null;

/** Есть ли WebGPU-адаптер (FE-019). Без него Whisper работает на WASM заметно медленнее. */
export function hasWebGPU(): Promise<boolean> {
  gpuCheck ??= (async () => {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) return false;
    try {
      return (await gpu.requestAdapter()) !== null;
    } catch {
      return false;
    }
  })();
  return gpuCheck;
}
