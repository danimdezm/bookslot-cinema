import type { Movie } from '@/types';
import { posterTheme } from './posterTheme';
import './Poster.css';

interface PosterProps {
  movie: Pick<Movie, 'title' | 'rating' | 'durationMinutes' | 'posterUrl'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Poster({ movie, size = 'md', className = '' }: PosterProps) {
  if (movie.posterUrl) {
    return (
      <div className={`poster poster--${size} ${className}`}>
        <img src={movie.posterUrl} alt={movie.title} className="poster__img" />
      </div>
    );
  }
  const { variant, style } = posterTheme(movie.title);
  return (
    <div className={`poster poster--${size} poster--${variant} ${className}`} style={style} role="img" aria-label={movie.title}>
      <div className="poster__art" />
      <div className="poster__grain" />
      <div className="poster__content">
        <span className="poster__studio">BookSlot Pictures presenta</span>
        <span className="poster__title">{movie.title}</span>
        <span className="poster__credits">
          {movie.rating ? `+${movie.rating}` : 'TP'} · {movie.durationMinutes} min · Solo en cines
        </span>
      </div>
    </div>
  );
}
