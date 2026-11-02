import './CountdownRing.css';

export function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, seconds / total) : 0;
  const urgent = seconds <= 60;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className={`countdown ${urgent ? 'countdown--urgent' : ''}`} role="timer" aria-label={`Quedan ${mm}:${ss}`}>
      <svg viewBox="0 0 80 80" aria-hidden>
        <defs>
          <linearGradient id="cd-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd27e" />
            <stop offset="1" stopColor="#ff7a45" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={radius} className="countdown__track" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="countdown__value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <span className="countdown__time tabular">
        {mm}:{ss}
      </span>
    </div>
  );
}
