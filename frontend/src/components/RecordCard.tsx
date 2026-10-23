import { Link } from 'react-router-dom';
import type { LectureRecord } from '../types';
import { formatDate, formatTime } from '../lib/time';
import RecordStatus from './RecordStatus';

interface RecordCardProps {
  record: LectureRecord;
  bookmarks: number;
  onDelete: (record: LectureRecord) => void;
}

export default function RecordCard({ record, bookmarks, onDelete }: RecordCardProps) {
  const titleId = `rec-${record.id}-title`;
  const inProgress = record.status === 'transcribing' && record.totalChunks > 0;

  return (
    <article className="record-card" aria-labelledby={titleId}>
      <header className="record-card__header">
        <p className="record-card__course">{record.fileName}</p>
        <h3 id={titleId} className="record-card__title">
          <Link className="record-card__link" to={`/records/${record.id}`}>{record.title}</Link>
        </h3>
      </header>
      <dl className="record-meta">
        <div className="record-meta__item"><dt>Дата</dt><dd>{formatDate(record.createdAt)}</dd></div>
        <div className="record-meta__item"><dt>Длительность</dt><dd>{formatTime(record.duration)}</dd></div>
        <div className="record-meta__item"><dt>Закладки</dt><dd>{bookmarks}</dd></div>
      </dl>
      <p className="record-card__status">
        <span className="visually-hidden">Статус:</span>
        <RecordStatus record={record} />
        <span className="pill">только на этом устройстве</span>
      </p>
      {inProgress && (
        <p className="record-card__progress">
          <span>Фрагмент {record.processedChunks} из {record.totalChunks}</span>
          <progress className="progress" max={record.totalChunks} value={record.processedChunks} aria-label="Прогресс распознавания" />
        </p>
      )}
      <button
        className="record-card__delete"
        type="button"
        aria-label={`Удалить запись «${record.title}»`}
        title="Удалить запись"
        onClick={() => onDelete(record)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </article>
  );
}
