import { Link } from 'react-router-dom';
import './Logo.css';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="BookSlot Cinema, inicio">
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd27e" />
            <stop offset="1" stopColor="#ff7a45" />
          </linearGradient>
        </defs>
        <path
          d="M5 10a3.5 3.5 0 0 1 3.5-3.5h15A3.5 3.5 0 0 1 27 10v1.6a2.6 2.6 0 0 0 0 5.2v1.7a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 5 18.5v-1.7a2.6 2.6 0 0 0 0-5.2z"
          fill="url(#logo-g)"
        />
        <path d="M20 9.5v13" stroke="#0c0b0a" strokeWidth="1.4" strokeDasharray="1.6 1.6" />
      </svg>
      <span className="logo__word">
        BookSlot<em>cinema</em>
      </span>
    </Link>
  );
}
