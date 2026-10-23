import { formatTime } from '../lib/time';

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

interface PlayerProps {
  audio: HTMLAudioElement | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  markers: number[];
  onSeek: (time: number) => void;
  onRateChange: (rate: number) => void;
}

/** Аудиоплеер (FE-017): воспроизведение, перемотка, скорость, метки закладок на таймлайне. */
export default function Player({ audio, playing, currentTime, duration, rate, markers, onSeek, onRateChange }: PlayerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function toggle() {
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function nextRate() {
    const index = SPEEDS.indexOf(rate);
    onRateChange(SPEEDS[(index + 1) % SPEEDS.length]);
  }

  return (
    <section className="player" aria-label="Аудиоплеер">
      <button className="player__toggle" type="button" onClick={toggle} disabled={!audio} aria-label={playing ? 'Пауза' : 'Воспроизвести'}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5Z" fill="currentColor" /></svg>
        )}
      </button>

      <div className="player__timeline">
        <div className="player__markers" aria-hidden="true">
          {duration > 0 && markers.map((time, i) => <span key={i} className="player__marker" style={{ left: `${(time / duration) * 100}%` }} />)}
        </div>
        <input
          className="player__range"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
          aria-label="Позиция воспроизведения"
          aria-valuetext={`${formatTime(currentTime)} из ${formatTime(duration)}`}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </div>

      <p className="player__time">
        <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
      </p>
      <button className="player__rate" type="button" onClick={nextRate} aria-label={`Скорость ${rate}×, изменить`}>
        {rate}×
      </button>
    </section>
  );
}
