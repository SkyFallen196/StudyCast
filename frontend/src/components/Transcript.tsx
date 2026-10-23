import { memo } from 'react';
import type { ReactNode } from 'react';
import type { Segment } from '../types';
import type { TextMatch } from '../lib/search';
import { formatTime } from '../lib/time';

interface TranscriptProps {
  segments: Segment[];
  activeIndex: number;
  /** Совпадения поиска, сгруппированные по номеру фразы. */
  matchesBySegment: Map<number, TextMatch[]>;
  currentMatch: TextMatch | null;
  bookmarkedSegments: Set<string>;
  onSeek: (segment: Segment) => void;
  onToggleBookmark: (segment: Segment) => void;
}

/** Синхронный транскрипт (FE-024): клик по фразе перематывает аудио, текущая фраза подсвечена. */
export default function Transcript(props: TranscriptProps) {
  const { segments, activeIndex, matchesBySegment, currentMatch, bookmarkedSegments, onSeek, onToggleBookmark } = props;
  return (
    <ol className="transcript" aria-label="Транскрипт">
      {segments.map((segment, i) => (
        <SegmentRow
          key={segment.id}
          segment={segment}
          active={i === activeIndex}
          matches={matchesBySegment.get(i)}
          currentMatch={currentMatch?.segment === i ? currentMatch : null}
          bookmarked={bookmarkedSegments.has(segment.id)}
          onSeek={onSeek}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </ol>
  );
}

interface SegmentRowProps {
  segment: Segment;
  active: boolean;
  matches?: TextMatch[];
  currentMatch: TextMatch | null;
  bookmarked: boolean;
  onSeek: (segment: Segment) => void;
  onToggleBookmark: (segment: Segment) => void;
}

const SegmentRow = memo(function SegmentRow({ segment, active, matches, currentMatch, bookmarked, onSeek, onToggleBookmark }: SegmentRowProps) {
  return (
    <li className={`segment${active ? ' segment--active' : ''}`} data-segment={segment.index} aria-current={active ? 'true' : undefined}>
      <button className="segment__jump" type="button" onClick={() => onSeek(segment)}>
        <time className="segment__time">{formatTime(segment.start)}</time>
        <span className="segment__text">{highlight(segment.text, matches, currentMatch)}</span>
      </button>
      <button
        className="segment__bookmark"
        type="button"
        aria-pressed={bookmarked}
        aria-label={bookmarked ? `Убрать закладку ${formatTime(segment.start)}` : `Добавить закладку ${formatTime(segment.start)}`}
        title={bookmarked ? 'Убрать закладку' : 'Добавить закладку'}
        onClick={() => onToggleBookmark(segment)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.5h8v11L8 10.5l-4 3v-11Z" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
});

function highlight(text: string, matches: TextMatch[] | undefined, current: TextMatch | null): ReactNode {
  if (!matches?.length) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    if (m.start > last) parts.push(text.slice(last, m.start));
    const isCurrent = current !== null && current.start === m.start;
    parts.push(
      <mark key={i} className={isCurrent ? 'match match--current' : 'match'}>{text.slice(m.start, m.end)}</mark>,
    );
    last = m.end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
