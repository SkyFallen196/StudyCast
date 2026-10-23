import { useEffect, useRef, useState } from 'react';
import type { Bookmark, LectureRecord, Segment } from '../types';
import { downloadText, fileNameFor, toMarkdown, toSrt } from '../lib/export';

interface ExportDialogProps {
  open: boolean;
  record: LectureRecord;
  segments: Segment[];
  bookmarks: Bookmark[];
  onClose: () => void;
}

/** Модальное окно экспорта (FE-031): конспект в Markdown или транскрипт в SRT. */
export default function ExportDialog({ open, record, segments, bookmarks, onClose }: ExportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<'md' | 'srt'>('md');
  const [withTranscript, setWithTranscript] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDone(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function exportFile() {
    const fileName = fileNameFor(record.title, format);
    if (format === 'md') downloadText(toMarkdown(record, segments, bookmarks, withTranscript), fileName, 'text/markdown');
    else downloadText(toSrt(segments), fileName, 'application/x-subrip');
    setDone(fileName);
  }

  const empty = segments.length === 0;

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="export-title" onClose={onClose}>
      <h2 id="export-title" className="dialog__title">Экспорт</h2>
      <div className="dialog__body">
        <fieldset className="choice-group">
          <legend className="choice-group__legend">Формат</legend>
          <div className="choice">
            <input className="choice__input" id="format-md" type="radio" name="format" checked={format === 'md'} onChange={() => setFormat('md')} />
            <label className="choice__label" htmlFor="format-md">
              Конспект Markdown
              <span className="choice__hint">Закладки с таймкодами, фразами и заметками · {bookmarks.length} шт.</span>
            </label>
          </div>
          <div className="choice">
            <input className="choice__input" id="format-srt" type="radio" name="format" checked={format === 'srt'} onChange={() => setFormat('srt')} />
            <label className="choice__label" htmlFor="format-srt">
              Субтитры SRT
              <span className="choice__hint">Весь транскрипт с таймкодами · {segments.length} фраз</span>
            </label>
          </div>
        </fieldset>
        {format === 'md' && (
          <label className="checkbox">
            <input type="checkbox" checked={withTranscript} onChange={(e) => setWithTranscript(e.target.checked)} />
            Добавить полный транскрипт
          </label>
        )}
        {empty && <p className="field-error">Транскрипт пуст — экспортировать пока нечего.</p>}
        {done && <p className="success-text" role="status">Файл «{done}» сохранён в папку загрузок.</p>}
      </div>
      <div className="dialog__actions">
        <button className="button" type="button" onClick={onClose}>Закрыть</button>
        <button className="button button--primary" type="button" onClick={exportFile} disabled={empty}>Скачать</button>
      </div>
    </dialog>
  );
}
