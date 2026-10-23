import type { LectureRecord } from '../types';

export function statusLabel(record: LectureRecord): { text: string; tone: 'success' | 'progress' | 'error' | 'neutral' } {
  switch (record.status) {
    case 'ready':
      return { text: record.source === 'asr' ? 'распознано' : 'из субтитров', tone: 'success' };
    case 'transcribing':
      return { text: 'распознаётся', tone: 'progress' };
    case 'queued':
      return { text: 'ожидает распознавания', tone: 'neutral' };
    case 'error':
      return { text: 'ошибка распознавания', tone: 'error' };
  }
}

export default function RecordStatus({ record }: { record: LectureRecord }) {
  const { text, tone } = statusLabel(record);
  return <span className={tone === 'neutral' ? 'pill' : `pill pill--${tone}`}>{text}</span>;
}
