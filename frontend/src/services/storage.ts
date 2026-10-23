import { db } from './db';
import type { Bookmark, LectureRecord, RecordSource, Segment, SegmentDraft } from '../types';

/** StorageService: все операции с локальными данными. */

export interface NewRecordInput {
  title: string;
  file: File;
  duration: number;
  source: RecordSource;
  segments?: SegmentDraft[];
}

export async function createRecord(input: NewRecordInput): Promise<LectureRecord> {
  const now = Date.now();
  const record: LectureRecord = {
    id: crypto.randomUUID(),
    title: input.title,
    fileName: input.file.name,
    fileSize: input.file.size,
    mimeType: input.file.type,
    duration: input.duration,
    language: 'ru',
    source: input.source,
    status: input.source === 'subtitles' ? 'ready' : 'queued',
    processedChunks: 0,
    totalChunks: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.records, db.audio, db.segments, async () => {
    await db.records.add(record);
    await db.audio.add({ recordId: record.id, blob: input.file, mimeType: input.file.type });
    if (input.segments) {
      await db.segments.bulkAdd(toSegments(record.id, input.segments, 0));
    }
  });
  return record;
}

export function toSegments(recordId: string, drafts: SegmentDraft[], firstIndex: number): Segment[] {
  return drafts.map((draft, i) => ({
    id: `${recordId}:${firstIndex + i}`,
    recordId,
    index: firstIndex + i,
    start: draft.start,
    end: draft.end,
    text: draft.text,
    edited: false,
  }));
}

export function updateRecord(id: string, changes: Partial<LectureRecord>) {
  return db.records.update(id, { ...changes, updatedAt: Date.now() });
}

/** Сохраняет распознанный фрагмент и отметку о прогрессе одной транзакцией — так прогресс не теряется при закрытии вкладки. */
export async function appendChunkSegments(recordId: string, drafts: SegmentDraft[], processedChunks: number) {
  await db.transaction('rw', db.records, db.segments, async () => {
    const count = await db.segments.where('recordId').equals(recordId).count();
    await db.segments.bulkAdd(toSegments(recordId, drafts, count));
    await db.records.update(recordId, { processedChunks, updatedAt: Date.now() });
  });
}

/** Заменяет весь транскрипт (импорт субтитров на экране записи после ошибки распознавания). */
export async function replaceSegments(recordId: string, drafts: SegmentDraft[], source: RecordSource) {
  await db.transaction('rw', db.records, db.segments, db.bookmarks, async () => {
    await db.segments.where('recordId').equals(recordId).delete();
    await db.bookmarks.where('recordId').equals(recordId).delete();
    await db.segments.bulkAdd(toSegments(recordId, drafts, 0));
    await db.records.update(recordId, { source, status: 'ready', error: undefined, updatedAt: Date.now() });
  });
}

export async function deleteRecord(id: string) {
  await db.transaction('rw', [db.records, db.segments, db.bookmarks, db.audio], async () => {
    await db.segments.where('recordId').equals(id).delete();
    await db.bookmarks.where('recordId').equals(id).delete();
    await db.audio.delete(id);
    await db.records.delete(id);
  });
}

export async function getAudio(recordId: string) {
  return (await db.audio.get(recordId))?.blob;
}

export function listRecords() {
  return db.records.orderBy('createdAt').reverse().toArray();
}

export function getRecord(id: string) {
  return db.records.get(id);
}

export function getSegments(recordId: string) {
  return db.segments.where('[recordId+index]').between([recordId, 0], [recordId, Infinity]).toArray();
}

export function getBookmarks(recordId: string) {
  return db.bookmarks.where('recordId').equals(recordId).sortBy('time');
}

export async function countBookmarksByRecord(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  await db.bookmarks.each((b) => counts.set(b.recordId, (counts.get(b.recordId) ?? 0) + 1));
  return counts;
}

/** Id записей, в транскрипте которых встречается запрос, — для поиска в библиотеке. */
export async function findRecordsByText(match: (text: string) => boolean): Promise<Set<string>> {
  const ids = new Set<string>();
  await db.segments.each((s) => {
    if (!ids.has(s.recordId) && match(s.text)) ids.add(s.recordId);
  });
  return ids;
}

export async function addBookmark(segment: Segment): Promise<Bookmark> {
  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    recordId: segment.recordId,
    segmentId: segment.id,
    time: segment.start,
    note: '',
    createdAt: Date.now(),
  };
  await db.bookmarks.add(bookmark);
  return bookmark;
}

export function updateBookmarkNote(id: string, note: string) {
  return db.bookmarks.update(id, { note });
}

export function deleteBookmark(id: string) {
  return db.bookmarks.delete(id);
}

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
