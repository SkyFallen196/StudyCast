import { useEffect, useState } from 'react';
import type { Bookmark, Segment } from '../types';
import { formatTime } from '../lib/time';

interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  segmentsById: Map<string, Segment>;
  onSeek: (time: number) => void;
  onNoteChange: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

/** Закладки с заметками (FE-029): переход к моменту, редактирование заметки, удаление. */
export default function BookmarksPanel({ bookmarks, segmentsById, onSeek, onNoteChange, onDelete }: BookmarksPanelProps) {
  return (
    <section className="panel bookmarks" aria-labelledby="bookmarks-title">
      <h2 id="bookmarks-title" className="panel__title">Закладки · {bookmarks.length}</h2>
      {bookmarks.length === 0 ? (
        <p className="bookmarks__empty">Закладок пока нет. Нажмите значок закладки рядом с фразой, чтобы отметить важный момент.</p>
      ) : (
        <ul className="bookmarks__list">
          {bookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              text={segmentsById.get(bookmark.segmentId)?.text ?? ''}
              onSeek={onSeek}
              onNoteChange={onNoteChange}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface BookmarkItemProps {
  bookmark: Bookmark;
  text: string;
  onSeek: (time: number) => void;
  onNoteChange: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

function BookmarkItem({ bookmark, text, onSeek, onNoteChange, onDelete }: BookmarkItemProps) {
  const [note, setNote] = useState(bookmark.note);
  const [saved, setSaved] = useState(false);
  const noteId = `note-${bookmark.id}`;

  useEffect(() => setNote(bookmark.note), [bookmark.note]);

  function save() {
    if (note === bookmark.note) return;
    onNoteChange(bookmark.id, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <li className="bookmark">
      <div className="bookmark__head">
        <button className="bookmark__time" type="button" onClick={() => onSeek(bookmark.time)} aria-label={`Перейти к ${formatTime(bookmark.time)}`}>
          {formatTime(bookmark.time)} →
        </button>
        <button className="bookmark__delete" type="button" onClick={() => onDelete(bookmark.id)} aria-label={`Удалить закладку ${formatTime(bookmark.time)}`}>
          Удалить
        </button>
      </div>
      {text && <p className="bookmark__text">{text}</p>}
      <label className="visually-hidden" htmlFor={noteId}>Заметка к закладке {formatTime(bookmark.time)}</label>
      <textarea
        className="bookmark__note"
        id={noteId}
        rows={2}
        maxLength={1000}
        placeholder="Заметка…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={save}
      />
      {saved && <p className="bookmark__saved" role="status">Заметка сохранена</p>}
    </li>
  );
}
