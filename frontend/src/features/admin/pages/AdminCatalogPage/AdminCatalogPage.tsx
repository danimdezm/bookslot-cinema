import { Poster } from '@/components/common/Poster';
import { Spinner } from '@/components/common/Spinner';
import { useAsync } from '@/hooks';
import { api } from '@/lib/api';
import { duration } from '@/lib/format';
import { MovieForm } from '../../components/MovieForm';
import { RoomForm } from '../../components/RoomForm';
import './AdminCatalogPage.css';

export function AdminCatalogPage() {
  const movies = useAsync(() => api.movies(), []);
  const rooms = useAsync(() => api.admin.rooms(), []);

  return (
    <div className="catalog">
      <section className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="section-head section-head--sm">
          <h2>Películas</h2>
          <span className="muted">{movies.data?.length ?? 0}</span>
        </div>
        <MovieForm onCreated={movies.reload} />
        {movies.loading ? (
          <Spinner />
        ) : (
          <div className="catalog-movies">
            {movies.data?.map((m) => (
              <div key={m.movieId} className="catalog-movie">
                <Poster movie={m} size="sm" />
                <div>
                  <strong>{m.title}</strong>
                  <span className="muted">
                    {duration(m.durationMinutes)}
                    {m.rating && ` · +${m.rating}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="section-head section-head--sm">
          <h2>Salas</h2>
          <span className="muted">{rooms.data?.length ?? 0}</span>
        </div>
        <RoomForm onCreated={rooms.reload} />
        {rooms.loading ? (
          <Spinner />
        ) : (
          <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            {rooms.data?.map((r) => (
              <div key={r.roomId} className="catalog-room">
                <strong>{r.name}</strong>
                <span className="muted">
                  {r.rows.length} filas · {r.capacity} butacas
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
