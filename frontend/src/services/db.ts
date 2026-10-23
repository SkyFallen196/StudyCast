import Dexie, { type EntityTable } from 'dexie';
import type { AudioBlob, Bookmark, LectureRecord, Segment } from '../types';

/** IndexedDB — основной источник данных приложения (ТЗ 7.2). Компоненты обращаются к нему через storage.ts. */
export const db = new Dexie('studycast') as Dexie & {
  records: EntityTable<LectureRecord, 'id'>;
  segments: EntityTable<Segment, 'id'>;
  bookmarks: EntityTable<Bookmark, 'id'>;
  audio: EntityTable<AudioBlob, 'recordId'>;
};

db.version(1).stores({
  records: 'id, createdAt',
  segments: 'id, recordId, [recordId+index]',
  bookmarks: 'id, recordId, segmentId',
  audio: 'recordId',
});
