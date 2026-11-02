import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { useToast } from '@/hooks';
import { api, ApiError } from '@/lib/api';
import { capitalize, dateLong, time } from '@/lib/format';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { LiveMessage, PublicSeat } from '@/types';
import { LiveIndicator } from '../../components/LiveIndicator';
import { SeatMap } from '../../components/SeatMap';
import { SeatSummary } from '../../components/SeatSummary';
import { useShowAvailability } from '../../hooks/useShowAvailability';
import { useShowLive } from '../../hooks/useShowLive';
import { useTimedSet } from '../../hooks/useTimedSet';
import './ShowPage.css';

const MAX_SEATS = 10;

export function ShowPage() {
  const { showId = '' } = useParams();
  const navigate = useNavigate();
  const notify = useToast();

  const { data, error, loading, reload, setData } = useShowAvailability(showId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [flashing, flash] = useTimedSet(1400);
  const [lost, markLost] = useTimedSet(2400);
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef<{ selection: string; key: string }>(undefined);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const submittingRef = useRef(false);
  submittingRef.current = submitting;

  const onLive = useCallback(
    (msg: LiveMessage) => {
      if (msg.type === 'show') {
        reload();
        return;
      }
      const changes = new Map(msg.seats.map((s) => [s.seatId, s.status]));
      setData((prev) =>
        prev
          ? {
              ...prev,
              show: { ...prev.show, available: msg.available },
              seats: prev.seats.map((s): PublicSeat => (changes.has(s.seatId) ? { ...s, status: changes.get(s.seatId)! } : s)),
            }
          : prev!,
      );
      flash([...changes.keys()]);
      if (submittingRef.current) return;
      const gone = [...selectedRef.current].filter((id) => changes.has(id) && changes.get(id) !== 'AVAILABLE');
      if (!gone.length) return;
      notify({
        tone: 'error',
        title: 'Alguien ha sido más rápido',
        body: `${gone.join(', ')} ${gone.length === 1 ? 'acaba' : 'acaban'} de reservarse.`,
      });
      setSelected((prev) => new Set([...prev].filter((id) => !gone.includes(id))));
    },
    [flash, notify, reload, setData],
  );

  const { connected } = useShowLive(showId, onLive, reload);

  if (loading && !data) return <PageLoader />;
  if (error || !data) {
    return (
      <div className="container page">
        <ErrorState error={error ?? new Error('Sesión no encontrada')} onRetry={reload} />
      </div>
    );
  }

  const { show, seats, movie } = data;
  const blocked = show.status === 'BLOCKED';
  const started = new Date(show.startsAt) <= new Date();
  const selection = [...selected].sort();

  const toggle = (seatId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else if (next.size >= MAX_SEATS) {
        notify({ title: `Máximo ${MAX_SEATS} butacas por reserva` });
        return prev;
      } else next.add(seatId);
      return next;
    });
  };

  const reserve = async () => {
    const selectionKey = selection.join(',');
    if (keyRef.current?.selection !== selectionKey) keyRef.current = { selection: selectionKey, key: newIdempotencyKey() };
    setSubmitting(true);
    submittingRef.current = true;
    try {
      const hold = await api.createHold(showId, selection, keyRef.current.key);
      navigate(`/checkout/${hold.holdId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SOLD_OUT') {
        markLost(err.seats);
        setSelected((prev) => new Set([...prev].filter((id) => !err.seats.includes(id))));
        notify({
          tone: 'error',
          title: 'Lo sentimos, se ha agotado',
          body: `${err.seats.join(', ')} ya no ${err.seats.length === 1 ? 'está' : 'están'} disponible${err.seats.length === 1 ? '' : 's'}. Elige otra butaca.`,
        });
        reload();
      } else {
        notify({ tone: 'error', title: 'No se pudo reservar', body: (err as Error).message });
      }
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="container page show-page">
      <div className="show-head">
        <Link to={`/movies/${show.movieId}`} className="back-link">
          ← {show.movieTitle}
        </Link>
        <div className="show-head__row">
          <div>
            <h1 className="display show-head__title">{show.movieTitle}</h1>
            <p className="text-2">
              {capitalize(dateLong(show.startsAt))} · <strong className="tabular">{time(show.startsAt)}</strong> · {show.roomName}
            </p>
          </div>
          <LiveIndicator connected={connected} />
        </div>
      </div>

      {blocked && (
        <div className="alert" style={{ marginBottom: 20 }}>
          Esta sesión no está disponible{show.blockedReason ? `: ${show.blockedReason}` : ''}.
        </div>
      )}

      <div className="show-layout">
        <section className="card card--pad seatmap-card">
          <SeatMap
            seats={seats}
            selected={selected}
            flashing={flashing}
            lost={lost}
            disabled={blocked || started || submitting}
            onToggle={toggle}
          />
        </section>

        <SeatSummary
          show={show}
          movie={movie}
          freeSeats={seats.filter((s) => s.status === 'AVAILABLE').length}
          selection={selection}
          submitting={submitting}
          disabled={blocked || started}
          onRemove={toggle}
          onReserve={reserve}
        />
      </div>
    </div>
  );
}
