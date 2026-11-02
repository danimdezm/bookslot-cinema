import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { Hero } from '../../components/Hero';
import { MovieCard } from '../../components/MovieCard';
import { Promises } from '../../components/Promises';
import { useBillboard } from '../../hooks/useBillboard';
import './HomePage.css';
import { Skeleton } from '@/components/ui/skeleton';

export function HomePage() {
  const { data, error, loading, reload } = useBillboard();

  if (loading) {
    return (
      <div className="container page">
        <Skeleton className="mb-12 h-[420px]" />
        <div className="movie-grid">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-2/3" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container page">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }
  if (!data?.movies.length) {
    return (
      <div className="container page">
        <EmptyState
          title="La cartelera está vacía"
          body={
            <>
              Carga datos de ejemplo con <code>pnpm seed</code> o crea películas desde el panel.
            </>
          }
          action={{ to: '/admin/catalog', label: 'Ir al panel' }}
        />
      </div>
    );
  }

  const featured = data.movies[0]!;
  return (
    <>
      <Hero movie={featured} shows={data.shows[featured.movieId] ?? []} />

      <section className="container section" id="cartelera">
        <div className="section-head">
          <h2 className="display">
            En <em>cartelera</em>
          </h2>
          <p className="muted">{data.movies.length} películas · elige sesión y butaca en segundos</p>
        </div>
        <div className="movie-grid">
          {data.movies.map((m, i) => (
            <MovieCard key={m.movieId} movie={m} shows={data.shows[m.movieId] ?? []} index={i} />
          ))}
        </div>
      </section>

      <section className="container section">
        <Promises />
      </section>
    </>
  );
}
