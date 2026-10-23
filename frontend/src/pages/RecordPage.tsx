import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import PageIntro from '../components/PageIntro';
import EmptyState from '../components/EmptyState';
import Player from '../components/Player';
import Transcript from '../components/Transcript';
import SearchBar from '../components/SearchBar';
import BookmarksPanel from '../components/BookmarksPanel';
import ExportDialog from '../components/ExportDialog';
import TranscriptionStatus from '../components/TranscriptionStatus';
import {
  deleteBookmark, getAudio, getBookmarks, getRecord, getSegments, replaceSegments, toggleBookmark, updateBookmarkNote,
} from '../services/storage';
import { startTranscription, useTranscriptionJob } from '../services/transcription';
import { findMatches, type TextMatch } from '../lib/search';
import { parseSubtitles } from '../lib/subtitles';
import { validateSubtitleFile } from '../lib/audio';
import { formatDate, formatTime } from '../lib/time';
import type { Segment } from '../types';

/** Номер фразы, которая звучит в момент time (последняя с началом не позже time). */
function activeSegmentIndex(segments: Segment[], time: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= time + 0.05) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

export default function RecordPage() {
  const { id = '' } = useParams();
  const record = useLiveQuery(() => getRecord(id).then((r) => r ?? null), [id]);
  const segments = useLiveQuery(() => getSegments(id), [id]) ?? [];
  const bookmarks = useLiveQuery(() => getBookmarks(id), [id]) ?? [];
  const job = useTranscriptionJob(id);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [matchIndex, setMatchIndex] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let url: string | null = null;
    getAudio(id).then((blob) => {
      if (!blob) return;
      url = URL.createObjectURL(blob);
      setAudioUrl(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  const texts = useMemo(() => segments.map((s) => s.text), [segments]);
  const matches = useMemo(() => findMatches(texts, deferredQuery), [texts, deferredQuery]);
  const matchesBySegment = useMemo(() => {
    const map = new Map<number, TextMatch[]>();
    for (const m of matches) map.set(m.segment, [...(map.get(m.segment) ?? []), m]);
    return map;
  }, [matches]);
  const currentMatch = matches.length > 0 ? matches[Math.min(matchIndex, matches.length - 1)] : null;

  useEffect(() => setMatchIndex(0), [deferredQuery]);

  const activeIndex = activeSegmentIndex(segments, currentTime);
  const bookmarkedSegments = useMemo(() => new Set(bookmarks.map((b) => b.segmentId)), [bookmarks]);
  const segmentsById = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments]);

  const scrollToSegment = useCallback((index: number) => {
    transcriptRef.current
      ?.querySelector(`[data-segment="${index}"]`)
      ?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  // К текущему совпадению поиска
  useEffect(() => {
    if (currentMatch) scrollToSegment(segments[currentMatch.segment].index);
  }, [currentMatch?.segment, currentMatch?.start, scrollToSegment]);

  // За звучащей фразой во время воспроизведения
  useEffect(() => {
    if (playing && activeIndex >= 0 && !deferredQuery.trim()) scrollToSegment(segments[activeIndex].index);
  }, [activeIndex, playing]);

  const seek = useCallback(
    (time: number, play = false) => {
      if (!audioEl) return;
      audioEl.currentTime = time;
      setCurrentTime(time);
      if (play) void audioEl.play();
    },
    [audioEl],
  );

  const onSegmentClick = useCallback((segment: Segment) => seek(segment.start, true), [seek]);

  const onToggleBookmark = useCallback((segment: Segment) => toggleBookmark(segment), []);

  async function onSubtitles(file: File) {
    const error = validateSubtitleFile(file);
    if (error) {
      setSubtitleError(error);
      return;
    }
    try {
      await replaceSegments(id, parseSubtitles(await file.text()), 'subtitles');
      setSubtitleError(null);
    } catch (e) {
      setSubtitleError((e as Error).message);
    }
  }

  if (record === undefined) {
    return <p className="loading-text" role="status">Загрузка записи…</p>;
  }

  if (record === null) {
    return (
      <>
        <PageIntro back title="Запись не найдена" />
        <EmptyState title="Такой записи нет в библиотеке" action={<Link className="button" to="/">Вернуться в библиотеку</Link>}>
          Возможно, она была удалена или открыта в другом браузере — записи хранятся только на том устройстве, где их импортировали.
        </EmptyState>
      </>
    );
  }

  const sourceLabel =
    record.source === 'subtitles' ? 'из субтитров' : record.status === 'ready' ? 'распознано в браузере' : 'распознаётся в браузере';
  const step = (delta: number) => matches.length && setMatchIndex((i) => (i + delta + matches.length) % matches.length);

  return (
    <>
      <PageIntro
        back
        title={record.title}
        lead={`${formatDate(record.createdAt)} · ${formatTime(record.duration)} · ${sourceLabel}`}
        actions={<button className="button" type="button" onClick={() => setExportOpen(true)}>Экспорт</button>}
      />

      <div className="record-layout">
        <div className="record-layout__main">
          <div className="record-layout__player">
            <Player
              audio={audioEl}
              playing={playing}
              currentTime={currentTime}
              duration={record.duration}
              rate={rate}
              markers={bookmarks.map((b) => b.time)}
              onSeek={(t) => seek(t)}
              onRateChange={(r) => {
                setRate(r);
                if (audioEl) audioEl.playbackRate = r;
              }}
            />
            {segments.length > 0 && (
              <SearchBar
                query={query}
                total={matches.length}
                current={Math.min(matchIndex, Math.max(matches.length - 1, 0))}
                onQueryChange={setQuery}
                onNext={() => step(1)}
                onPrev={() => step(-1)}
              />
            )}
          </div>
          {audioUrl && (
            <audio
              ref={setAudioEl}
              src={audioUrl}
              preload="metadata"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          )}

          <TranscriptionStatus record={record} job={job} onStart={() => startTranscription(record.id)} onSubtitles={onSubtitles} subtitleError={subtitleError} />

          {deferredQuery.trim() && matches.length === 0 && segments.length > 0 && (
            <EmptyState title="Ничего не найдено">Проверьте написание или попробуйте другое слово — поиск не учитывает регистр и букву «ё».</EmptyState>
          )}

          <div ref={transcriptRef}>
            {segments.length > 0 ? (
              <Transcript
                segments={segments}
                activeIndex={activeIndex}
                matchesBySegment={matchesBySegment}
                currentMatch={currentMatch}
                bookmarkedSegments={bookmarkedSegments}
                onSeek={onSegmentClick}
                onToggleBookmark={onToggleBookmark}
              />
            ) : (
              record.status === 'ready' && <EmptyState title="Транскрипт пуст">В записи не нашлось речи.</EmptyState>
            )}
          </div>
        </div>

        <aside className="record-layout__aside">
          <BookmarksPanel
            bookmarks={bookmarks}
            segmentsById={segmentsById}
            onSeek={(t) => seek(t, true)}
            onNoteChange={updateBookmarkNote}
            onDelete={deleteBookmark}
          />
        </aside>
      </div>

      <ExportDialog open={exportOpen} record={record} segments={segments} bookmarks={bookmarks} onClose={() => setExportOpen(false)} />
    </>
  );
}
