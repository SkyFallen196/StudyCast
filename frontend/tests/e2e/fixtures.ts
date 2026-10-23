import { expect, type Page } from '@playwright/test';

/** Тестовые данные и общие шаги. Аудио генерируется в памяти — в репозитории нет бинарных файлов. */

/** WAV-файл с тишиной: браузер читает из него длительность, а текст берётся из субтитров. */
export function silentWav(seconds: number, sampleRate = 8000): Buffer {
  const samples = seconds * sampleRate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // размер блока fmt
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // моно
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

/** Фрагмент лекции: «Тейлор» встречается в трёх фразах (в том числе с заглавной и строчной), «ещё» — с буквой «ё». */
export const LECTURE_SRT = `1
00:00:00,000 --> 00:00:05,000
Итак, сегодня мы переходим к рядам Тейлора.

2
00:00:05,000 --> 00:00:12,000
Напомню, степенной ряд можно почленно дифференцировать.

3
00:00:12,000 --> 00:00:20,000
Такой ряд называется рядом тейлора этой функции.

4
00:00:20,000 --> 00:00:26,000
Если центр равен нулю, ряд называют рядом Маклорена.

5
00:00:26,000 --> 00:00:34,000
Важный момент: ряд ТЕЙЛОРА может сходиться не к самой функции.

6
00:00:34,000 --> 00:00:40,000
Это ещё один пример для экзамена.
`;

export const LECTURE_VTT = `WEBVTT

00:00.000 --> 00:04.000
Вторая лекция: ряды Фурье.

00:04.000 --> 00:09.000
Тригонометрический многочлен.
`;

export const audioFile = (name = 'lecture.wav', seconds = 45) => ({ name, mimeType: 'audio/wav', buffer: silentWav(seconds) });
export const textFile = (name: string, content: string, mimeType = 'text/plain') => ({ name, mimeType, buffer: Buffer.from(content, 'utf-8') });

/** Импорт записи с готовыми субтитрами; возвращает на экран записи. */
export async function importWithSubtitles(page: Page, title: string, subtitles = textFile('lecture.srt', LECTURE_SRT)) {
  await page.goto('/import');
  await page.locator('#audio-file').setInputFiles(audioFile());
  await expect(page.locator('.file-summary')).toBeVisible();
  await page.getByLabel('Название записи').fill(title);
  await page.getByRole('radio', { name: /Загрузить субтитры/ }).check();
  await page.locator('#subtitle-file').setInputFiles(subtitles);
  await page.getByRole('button', { name: 'Импортировать' }).click();
  await page.waitForURL(/\/records\//);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}
