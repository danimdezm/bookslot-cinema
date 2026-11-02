import { Link } from 'react-router-dom';
import { Poster } from '@/components/common/Poster';
import { dayLabel, duration, time } from '@/lib/format';
import type { Movie, Show } from '@/types';
import './Hero.css';
import { Button } from '@/components/ui/button';

export function Hero({ movie, shows }: { movie: Movie; shows: Show[] }) {
  const upcoming = shows.slice(0, 4);
  return (
    <section className="hero">
      <div className="hero__backdrop" aria-hidden>
        <Poster movie={movie} size="lg" />
      </div>
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="eyebrow">Destacada esta semana</span>
          <h1 className="display hero__title">{movie.title}</h1>
          <p className="hero__meta">
            <span>{duration(movie.durationMinutes)}</span>
            {movie.rating && <span>+{movie.rating}</span>}
            <span>Versión original subtitulada</span>
          </p>
          {movie.description && <p className="hero__desc">{movie.description}</p>}
          {upcoming.length > 0 && (
            <div className="hero__times" aria-label="Próximas sesiones">
              {upcoming.map((s) => (
                <Link key={s.showId} to={`/shows/${s.showId}`} className="hero__time">
                  <span>{dayLabel(s.startsAt).top}</span>
                  <strong className="tabular">{time(s.startsAt)}</strong>
                  <small>{s.roomName}</small>
                </Link>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 28 }}>
            <Button asChild size="lg">
              <Link to={`/movies/${movie.movieId}`}>Reservar butacas</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="#cartelera">Toda la cartelera</a>
            </Button>
          </div>
        </div>
        <div className="hero__poster">
          <Poster movie={movie} size="lg" />
        </div>
      </div>
    </section>
  );
}
