import { describe, expect, it } from 'vitest';
import { parseSubtitles, SubtitleParseError } from './subtitles';
import { findMatches, includesText } from './search';
import { formatSrtTime, formatTime } from './time';
import { fileNameFor, toMarkdown, toSrt } from './export';
import { splitOnPauses } from './chunks';
import type { Bookmark, LectureRecord, Segment } from '../types';

describe('parseSubtitles', () => {
  it('разбирает SRT с CRLF, BOM и тегами', () => {
    const srt = '﻿1\r\n00:00:01,500 --> 00:00:04,000\r\nИтак, <i>сегодня</i>\r\nряды Тейлора\r\n\r\n2\r\n00:01:05,000 --> 00:01:09,250\r\nВторая фраза\r\n';
    expect(parseSubtitles(srt)).toEqual([
      { start: 1.5, end: 4, text: 'Итак, сегодня ряды Тейлора' },
      { start: 65, end: 69.25, text: 'Вторая фраза' },
    ]);
  });

  it('разбирает VTT с заголовком, NOTE и короткими таймкодами', () => {
    const vtt = 'WEBVTT\n\nNOTE комментарий\n\nintro\n00:02.000 --> 00:05.000 align:start\n<v Лектор>Первая фраза\n\n01:00:00.000 --> 01:00:03.000\nПоследняя';
    expect(parseSubtitles(vtt)).toEqual([
      { start: 2, end: 5, text: 'Первая фраза' },
      { start: 3600, end: 3603, text: 'Последняя' },
    ]);
  });

  it('бросает понятную ошибку для файла без фраз', () => {
    expect(() => parseSubtitles('просто текст')).toThrow(SubtitleParseError);
  });
});

describe('search', () => {
  const texts = ['Ряд Тейлора и ещё раз тейлор', 'Маклорен', 'Ёлка и елка'];

  it('ищет без учёта регистра и возвращает все вхождения', () => {
    expect(findMatches(texts, 'ТЕЙЛОР')).toEqual([
      { segment: 0, start: 4, end: 10 },
      { segment: 0, start: 22, end: 28 },
    ]);
  });

  it('считает «ё» и «е» одной буквой', () => {
    expect(findMatches(texts, 'елка')).toHaveLength(2);
    expect(findMatches(texts, 'ещё')).toHaveLength(1);
    expect(includesText('Ещё раз', 'еще')).toBe(true);
  });

  it('пустой запрос не даёт совпадений', () => {
    expect(findMatches(texts, '   ')).toEqual([]);
    expect(includesText('текст', '')).toBe(false);
  });
});

describe('time', () => {
  it('форматирует время плеера и SRT', () => {
    expect(formatTime(75.4)).toBe('01:15');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatSrtTime(75.4)).toBe('00:01:15,400');
  });
});

describe('export', () => {
  const record: LectureRecord = {
    id: 'r', title: 'Лекция 7: ряды?', fileName: 'a.m4a', fileSize: 1, mimeType: 'audio/mp4', duration: 892,
    language: 'ru', source: 'asr', status: 'ready', processedChunks: 1, totalChunks: 1, createdAt: 0, updatedAt: 0,
  };
  const segments: Segment[] = [
    { id: 'r:0', recordId: 'r', index: 0, start: 0, end: 4, text: 'Первая фраза', edited: false },
    { id: 'r:1', recordId: 'r', index: 1, start: 245, end: 250, text: 'Важный момент', edited: false },
  ];
  const bookmarks: Bookmark[] = [{ id: 'b', recordId: 'r', segmentId: 'r:1', time: 245, note: 'На экзамен', createdAt: 0 }];

  it('Markdown содержит закладку с таймкодом, фразой и заметкой', () => {
    const md = toMarkdown(record, segments, bookmarks, false);
    expect(md).toContain('### 04:05');
    expect(md).toContain('> Важный момент');
    expect(md).toContain('На экзамен');
    expect(md).not.toContain('## Транскрипт');
    expect(toMarkdown(record, segments, bookmarks, true)).toContain('**00:00** Первая фраза');
  });

  it('SRT нумерует фразы и форматирует таймкоды', () => {
    expect(toSrt(segments)).toBe('1\n00:00:00,000 --> 00:00:04,000\nПервая фраза\n\n2\n00:04:05,000 --> 00:04:10,000\nВажный момент\n');
  });

  it('убирает из имени файла недопустимые символы', () => {
    expect(fileNameFor('Лекция 7: ряды?', 'md')).toBe('Лекция 7 ряды.md');
  });
});

describe('splitOnPauses', () => {
  const rate = 100;

  it('ставит границу в тишине и покрывает всё аудио без пропусков', () => {
    const samples = new Float32Array(70 * rate).fill(0.5);
    samples.fill(0, 24 * rate, 25 * rate); // пауза на 24–25 с
    const chunks = splitOnPauses(samples, rate);
    expect(chunks[0].start).toBe(0);
    expect(chunks[0].end).toBeGreaterThanOrEqual(24 * rate);
    expect(chunks[0].end).toBeLessThanOrEqual(25 * rate);
    chunks.slice(1).forEach((c, i) => expect(c.start).toBe(chunks[i].end));
    expect(chunks.at(-1)!.end).toBe(samples.length);
    chunks.forEach((c) => expect(c.end - c.start).toBeLessThanOrEqual(30 * rate));
  });

  it('короткая запись — один фрагмент', () => {
    expect(splitOnPauses(new Float32Array(10 * rate), rate)).toEqual([{ start: 0, end: 10 * rate }]);
  });
});
