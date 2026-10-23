/**
 * Нарезка аудио на фрагменты для распознавания (FE-020).
 * Граница ставится в самом тихом месте последних секунд окна, чтобы не резать фразу посередине:
 * Whisper плохо распознаёт оборванное на краю фрагмента предложение и часто его пропускает.
 * Результат детерминирован — после перезагрузки страницы границы совпадают и распознавание продолжается с того же фрагмента.
 */

export interface ChunkBounds {
  start: number;
  end: number;
}

export function splitOnPauses(samples: Float32Array, sampleRate: number, maxSeconds = 30, searchSeconds = 10): ChunkBounds[] {
  const max = Math.floor(maxSeconds * sampleRate);
  const search = Math.floor(searchSeconds * sampleRate);
  const frame = Math.floor(sampleRate / 10); // окно 100 мс
  const chunks: ChunkBounds[] = [];
  let start = 0;

  while (start < samples.length) {
    if (samples.length - start <= max) {
      chunks.push({ start, end: samples.length });
      break;
    }
    let bestEnd = start + max;
    let bestEnergy = Infinity;
    for (let pos = start + max - search; pos + frame <= start + max; pos += frame) {
      let energy = 0;
      for (let i = pos; i < pos + frame; i++) energy += samples[i] * samples[i];
      if (energy < bestEnergy) {
        bestEnergy = energy;
        bestEnd = pos + (frame >> 1);
      }
    }
    chunks.push({ start, end: bestEnd });
    start = bestEnd;
  }
  return chunks.length > 0 ? chunks : [{ start: 0, end: 0 }];
}
