import { Link } from 'react-router-dom';
import { Poster } from '@/components/common/Poster';
import { duration } from '@/lib/format';
import type { Movie } from '@/types';
import './MovieHero.css';

export function MovieHero({ movie }: { movie: Movie }) {
  return (
    <section className="movie-hero">
      <div className="movie-hero__backdrop" aria-hidden>
        <Poster movie={movie} size="lg" />
      </div>
      <div className="container movie-hero__inner">
        <Poster movie={movie} size="lg" className="movie-hero__poster" />
        <div className="movie-hero__info">
          <Link to="/" className="back-link">
            ← Cartelera
          </Link>
          <h1 className="display movie-hero__title">{movie.title}</h1>
          <div className="row">
            <span className="chip">{duration(movie.durationMinutes)}</span>
            {movie.rating && <span className="chip">+{movie.rating}</span>}
            <span className="chip">VOSE</span>
          </div>
          {movie.description && <p className="movie-hero__desc">{movie.description}</p>}
        </div>
      </div>
    </section>
  );
}
