import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { DayPicker } from '../../components/DayPicker';
import { MovieHero } from '../../components/MovieHero';
import { ShowTile } from '../../components/ShowTile';
import { useMovieShows } from '../../hooks/useMovieShows';
import { groupByRoom } from '../../utils/groupByRoom';
import './MoviePage.css';

export function MoviePage() {
  const { movieId = '' } = useParams();
  const { data, error, loading, reload, days } = useMovieShows(movieId);

  const [day, setDay] = useState<string>();
  useEffect(() => {
    setDay(days[0]?.[0]);
  }, [days]);

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div className="container page">
        <ErrorState error={error ?? new Error('Película no encontrada')} onRetry={reload} />
      </div>
    );
  }

  const byRoom = groupByRoom(days.find(([k]) => k === day)?.[1] ?? []);

  return (
    <div className="movie-page">
      <MovieHero movie={data.movie} />

      <section className="container section">
        <div className="section-head">
          <h2 className="display">
            Elige <em>sesión</em>
          </h2>
        </div>

        {days.length === 0 ? (
          <EmptyState title="Sin sesiones" body="No hay sesiones programadas para las próximas dos semanas." />
        ) : (
          <>
            <DayPicker days={days} value={day} onChange={setDay} />

            <div className="room-groups">
              {Object.entries(byRoom).map(([room, shows]) => (
                <div key={room} className="room-group">
                  <h3 className="room-group__name">{room}</h3>
                  <div className="show-tiles">
                    {shows.map((s) => (
                      <ShowTile key={s.showId} show={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
