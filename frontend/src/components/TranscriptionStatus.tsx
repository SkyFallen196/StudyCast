import { useRef } from 'react';
import type { LectureRecord } from '../types';
import type { JobState } from '../services/transcription';

interface TranscriptionStatusProps {
  record: LectureRecord;
  job: JobState | null;
  onStart: () => void;
  onSubtitles: (file: File) => void;
  subtitleError: string | null;
}

/** Состояния распознавания на экране записи (FE-022, FE-023): загрузка модели, прогресс, прерывание, ошибка. */
export default function TranscriptionStatus({ record, job, onStart, onSubtitles, subtitleError }: TranscriptionStatusProps) {
  const subtitleInput = useRef<HTMLInputElement>(null);

  const subtitleButton = (
    <>
      <button className="button button--small" type="button" onClick={() => subtitleInput.current?.click()}>Загрузить субтитры</button>
      <input
        ref={subtitleInput}
        className="visually-hidden"
        type="file"
        accept=".srt,.vtt"
        tabIndex={-1}
        aria-label="Файл субтитров SRT или VTT"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSubtitles(file);
          e.target.value = '';
        }}
      />
    </>
  );

  if (job?.phase === 'error' || (!job && record.status === 'error')) {
    const message = job?.phase === 'error' ? job.message : record.error;
    return (
      <div className="notice notice--error" role="alert">
        <p className="notice__title">Распознавание остановилось</p>
        <p>{message} Уже распознанный текст сохранён ({record.processedChunks} из {record.totalChunks} фрагментов).</p>
        <div className="notice__actions">
          <button className="button button--primary button--small" type="button" onClick={onStart}>Продолжить с фрагмента {record.processedChunks + 1}</button>
          {subtitleButton}
        </div>
        {subtitleError && <p className="field-error">{subtitleError}</p>}
      </div>
    );
  }

  if (job?.phase === 'decoding') {
    return <ProgressBox label="Подготовка аудио…" />;
  }

  if (job?.phase === 'loading-model') {
    const mb = (bytes: number) => Math.max(1, Math.round(bytes / 1024 / 1024));
    return (
      <ProgressBox
        label={job.loaded > 0 ? `Загрузка модели распознавания: ${mb(job.loaded)} МБ` : 'Загрузка модели распознавания…'}
        hint="Модель скачивается один раз и сохраняется в браузере. Затем начнётся распознавание первого фрагмента."
      />
    );
  }

  if (job?.phase === 'transcribing') {
    const percent = Math.round((job.chunk / job.total) * 100);
    return (
      <ProgressBox
        label={`Распознавание: фрагмент ${job.chunk} из ${job.total} · ${percent}%`}
        hint="Текст появляется по мере готовности. Плеер и поиск уже работают."
        value={job.chunk}
        max={job.total}
      />
    );
  }

  if (record.status === 'transcribing') {
    return (
      <div className="notice notice--warning" role="status">
        <p className="notice__title">Распознавание прервано</p>
        <p>Готово {record.processedChunks} из {record.totalChunks} фрагментов, распознанный текст сохранён.</p>
        <div className="notice__actions">
          <button className="button button--primary button--small" type="button" onClick={onStart}>Продолжить</button>
        </div>
      </div>
    );
  }

  if (record.status === 'queued') {
    return (
      <div className="notice notice--warning" role="status">
        <p className="notice__title">Текст ещё не получен</p>
        <div className="notice__actions">
          <button className="button button--primary button--small" type="button" onClick={onStart}>Начать распознавание</button>
          {subtitleButton}
        </div>
        {subtitleError && <p className="field-error">{subtitleError}</p>}
      </div>
    );
  }

  return null;
}

function ProgressBox({ label, hint, value, max }: { label: string; hint?: string; value?: number; max?: number }) {
  return (
    <div className="progress-box" role="status" aria-live="polite">
      <p className="progress-box__label">{label}</p>
      {max !== undefined && value !== undefined ? (
        <progress className="progress" max={max} value={value} />
      ) : (
        <progress className="progress" />
      )}
      {hint && <p className="progress-box__hint">{hint}</p>}
    </div>
  );
}
