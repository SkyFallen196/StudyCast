import type { SegmentDraft } from '../types';

/** SubtitleService: разбор SRT и WebVTT в список фраз (FE-014). */

export class SubtitleParseError extends Error {}

const TIMING = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

function toSeconds(h: string | undefined, m: string, s: string, ms: string): number {
  return (h ? parseInt(h, 10) : 0) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms.padEnd(3, '0'), 10) / 1000;
}

function cleanText(lines: string[]): string {
  return lines
    .join(' ')
    .replace(/<[^>]+>/g, '') // теги форматирования <i>, <b>, <v Говорящий>
    .replace(/\{\\[^}]*\}/g, '') // теги ASS внутри SRT
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSubtitles(content: string): SegmentDraft[] {
  const text = content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const segments: SegmentDraft[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const timingIndex = lines.findIndex((line) => TIMING.test(line));
    if (timingIndex === -1) continue; // заголовок WEBVTT, NOTE, STYLE, номер без тайминга

    const match = lines[timingIndex].match(TIMING)!;
    const start = toSeconds(match[1]?.slice(0, -1), match[2], match[3], match[4]);
    const end = toSeconds(match[5]?.slice(0, -1), match[6], match[7], match[8]);
    const body = cleanText(lines.slice(timingIndex + 1));
    if (body) segments.push({ start, end: Math.max(end, start), text: body });
  }

  if (segments.length === 0) {
    throw new SubtitleParseError('В файле не найдено ни одной фразы с таймкодом. Проверьте, что это SRT или VTT.');
  }
  return segments.sort((a, b) => a.start - b.start);
}
