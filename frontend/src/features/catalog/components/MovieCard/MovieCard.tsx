import { Link } from 'react-router-dom';
import { Poster } from '@/components/common/Poster';
import { dayKey, dayLabel, duration, time } from '@/lib/format';
import type { Movie, Show } from '@/types';
import './MovieCard.css';

interface MovieCardProps {
  movie: Movie;
  shows: Show[];
  index: number;
}

export function MovieCard({ movie, shows, index }: MovieCardProps) {
  const firstDay = shows[0] ? dayKey(shows[0].startsAt) : undefined;
  const sameDay = shows.filter((s) => dayKey(s.startsAt) === firstDay).slice(0, 4);
  return (
    <Link to={`/movies/${movie.movieId}`} className="movie-card" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="movie-card__poster">
        <Poster movie={movie} />
        <span className="movie-card__cta">Ver sesiones →</span>
      </div>
      <div className="movie-card__body">
        <h3>{movie.title}</h3>
        <p className="muted">
          {duration(movie.durationMinutes)}
          {movie.rating && ` · +${movie.rating}`}
        </p>
        {sameDay.length > 0 ? (
          <div className="movie-card__times">
            <span className="movie-card__day">{dayLabel(sameDay[0]!.startsAt).top}</span>
            {sameDay.map((s) => (
              <span key={s.showId} className="time-pill">
                {time(s.startsAt)}
              </span>
            ))}
          </div>
        ) : (
          <p className="faint">Sin sesiones programadas</p>
        )}
      </div>
    </Link>
  );
}
