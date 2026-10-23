import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import { createRecord } from '../services/storage';
import { startTranscription } from '../services/transcription';
import { parseSubtitles, SubtitleParseError } from '../lib/subtitles';
import { extensionOf, hasWebGPU, readDuration, validateAudioFile, validateSubtitleFile } from '../lib/audio';
import { formatSize, formatTime } from '../lib/time';
import type { RecordSource } from '../types';

interface SelectedAudio {
  file: File;
  duration: number;
}

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
}

export default function ImportPage() {
  const navigate = useNavigate();
  const audioInput = useRef<HTMLInputElement>(null);
  const [audio, setAudio] = useState<SelectedAudio | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [method, setMethod] = useState<RecordSource>('asr');
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gpu, setGpu] = useState<boolean | null>(null);

  useEffect(() => {
    hasWebGPU().then(setGpu);
  }, []);

  async function onAudioChange(file: File | undefined) {
    setAudio(null);
    setAudioError(null);
    if (!file) return;
    const error = validateAudioFile(file);
    if (error) {
      setAudioError(error);
      return;
    }
    try {
      const duration = await readDuration(file);
      setAudio({ file, duration });
      // функциональное обновление: пользователь мог начать вводить название, пока читалась длительность
      setTitle((current) => (current.trim() ? current : titleFromFileName(file.name)));
    } catch (e) {
      setAudioError((e as Error).message);
    }
  }

  function onSubtitleChange(file: File | undefined) {
    setSubtitleFile(file ?? null);
    setSubtitleError(file ? validateSubtitleFile(file) : null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    let valid = true;
    if (!audio) {
      setAudioError(audioError ?? 'Выберите аудиофайл лекции.');
      valid = false;
    }
    if (!title.trim()) {
      setTitleError('Введите название записи.');
      valid = false;
    } else if (title.trim().length > 120) {
      setTitleError('Название длиннее 120 символов.');
      valid = false;
    }
    if (method === 'subtitles' && !subtitleFile) {
      setSubtitleError('Выберите файл субтитров SRT или VTT.');
      valid = false;
    }
    if (!valid || !audio || subtitleError) return;

    setBusy(true);
    try {
      const segments = method === 'subtitles' && subtitleFile ? parseSubtitles(await subtitleFile.text()) : undefined;
      const record = await createRecord({ title: title.trim(), file: audio.file, duration: audio.duration, source: method, segments });
      if (method === 'asr') startTranscription(record.id);
      navigate(`/records/${record.id}`);
    } catch (e) {
      if (e instanceof SubtitleParseError) setSubtitleError(e.message);
      else if ((e as Error).name === 'QuotaExceededError') setSubmitError('В хранилище браузера не хватает места. Удалите ненужные записи из библиотеки.');
      else setSubmitError(`Не удалось сохранить запись: ${(e as Error).message}`);
      setBusy(false);
    }
  }

  const minutes = audio ? Math.max(1, Math.round(audio.duration / 60)) : null;

  return (
    <>
      <PageIntro back title="Новая запись" lead="Файл обрабатывается на этом устройстве и не загружается на сервер." />

      <form className="import-form" noValidate onSubmit={onSubmit}>
        <div className="form-field form-field--file">
          <label className="form-field__label" htmlFor="audio-file">Аудиофайл (MP3, M4A, WAV, OGG, до 200 МБ)</label>
          {audio ? (
            <div className="file-summary">
              <span className="file-summary__badge" aria-hidden="true">{extensionOf(audio.file.name).toUpperCase()}</span>
              <span className="file-summary__info">
                <span className="file-summary__name">{audio.file.name}</span>
                <span className="file-summary__meta">{formatTime(audio.duration)} · {formatSize(audio.file.size)}</span>
              </span>
              <button className="button button--small" type="button" onClick={() => audioInput.current?.click()}>Выбрать другой файл</button>
            </div>
          ) : null}
          <input
            ref={audioInput}
            className={audio ? 'visually-hidden' : 'form-field__control'}
            id="audio-file"
            type="file"
            accept=".mp3,.m4a,.wav,.ogg,audio/*"
            aria-invalid={audioError ? true : undefined}
            aria-describedby={audioError ? 'audio-error' : undefined}
            onChange={(e) => onAudioChange(e.target.files?.[0])}
          />
          {audioError && <p id="audio-error" className="field-error" role="alert">{audioError}</p>}
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="record-title">Название записи</label>
          <input
            className="form-field__control"
            id="record-title"
            type="text"
            maxLength={150}
            placeholder="Например: Матанализ. Лекция 7"
            value={title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'title-error' : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(null);
            }}
          />
          {titleError && <p id="title-error" className="field-error" role="alert">{titleError}</p>}
        </div>

        <fieldset className="choice-group">
          <legend className="choice-group__legend">Как получить текст</legend>
          <div className="choice">
            <input className="choice__input" id="method-asr" name="method" type="radio" value="asr" checked={method === 'asr'} onChange={() => setMethod('asr')} />
            <label className="choice__label" htmlFor="method-asr">
              Распознать в браузере
              <span className="choice__hint">
                Модель Whisper tiny, русский язык.{minutes && gpu !== null ? ` Около ${gpu ? Math.max(1, Math.round(minutes / 3)) : minutes} мин для этой записи.` : ''}
              </span>
            </label>
          </div>
          <div className="choice">
            <input className="choice__input" id="method-subtitles" name="method" type="radio" value="subtitles" checked={method === 'subtitles'} onChange={() => setMethod('subtitles')} />
            <label className="choice__label" htmlFor="method-subtitles">
              Загрузить субтитры
              <span className="choice__hint">Готовый файл SRT или VTT. Текст появится сразу.</span>
            </label>
          </div>
        </fieldset>

        {method === 'subtitles' && (
          <div className="form-field">
            <label className="form-field__label" htmlFor="subtitle-file">Файл субтитров (SRT или VTT)</label>
            <input
              className="form-field__control"
              id="subtitle-file"
              type="file"
              accept=".srt,.vtt"
              aria-invalid={subtitleError ? true : undefined}
              aria-describedby={subtitleError ? 'subtitle-error' : undefined}
              onChange={(e) => onSubtitleChange(e.target.files?.[0])}
            />
            {subtitleError && <p id="subtitle-error" className="field-error" role="alert">{subtitleError}</p>}
          </div>
        )}

        {method === 'asr' && gpu === false && (
          <div className="notice notice--warning" role="status">
            <p className="notice__title">Аппаратное ускорение недоступно</p>
            <p>В этом браузере нет WebGPU, распознавание пойдёт в несколько раз медленнее. Если у записи есть субтитры, загрузите их. Для ускорения откройте StudyCast в Chrome или Edge.</p>
          </div>
        )}

        {method === 'asr' && (
          <p className="import-form__note">
            При первом запуске браузер скачает модель распознавания ({gpu ? '~115 МБ' : '~40 МБ'}) — дальше она берётся из кэша.
          </p>
        )}

        {submitError && <p className="field-error" role="alert">{submitError}</p>}

        <div className="import-form__actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Сохранение…' : method === 'asr' ? 'Начать распознавание' : 'Импортировать'}
          </button>
          <button className="button button--ghost" type="button" onClick={() => navigate('/')}>Отмена</button>
        </div>
      </form>
    </>
  );
}
