import type { Bookmark, LectureRecord, Segment } from '../types';
import { formatDate, formatSrtTime, formatTime } from './time';

/** ExportService: конспект в Markdown и транскрипт в SRT (FE-030). */

export function toMarkdown(record: LectureRecord, segments: Segment[], bookmarks: Bookmark[], withTranscript: boolean): string {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const lines: string[] = [
    `# ${record.title}`,
    '',
    `Дата: ${formatDate(record.createdAt)} · Длительность: ${formatTime(record.duration)} · Источник текста: ${record.source === 'asr' ? 'распознано в браузере' : 'субтитры'}`,
    '',
    '## Закладки',
    '',
  ];

  if (bookmarks.length === 0) {
    lines.push('Закладок нет.', '');
  }
  for (const bookmark of [...bookmarks].sort((a, b) => a.time - b.time)) {
    const segment = byId.get(bookmark.segmentId);
    lines.push(`### ${formatTime(bookmark.time)}`, '');
    if (segment) lines.push(`> ${segment.text}`, '');
    if (bookmark.note.trim()) lines.push(bookmark.note.trim(), '');
  }

  if (withTranscript) {
    lines.push('## Транскрипт', '');
    for (const segment of segments) lines.push(`**${formatTime(segment.start)}** ${segment.text}`, '');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function toSrt(segments: Segment[]): string {
  return segments
    .map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`)
    .join('\n');
}

/** Безопасное имя файла из названия записи. */
export function fileNameFor(title: string, extension: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'studycast';
  return `${base}.${extension}`;
}

export function downloadText(content: string, fileName: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
