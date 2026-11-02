import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Poster } from '@/components/common/Poster';
import { Spinner } from '@/components/common/Spinner';
import { useAsync, useToast } from '@/hooks';
import { api } from '@/lib/api';
import { capitalize, dateLong, money, time } from '@/lib/format';
import { defaultShowStart } from '../../utils/datetime';
import './AdminNewShowPage.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdminNewShowPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { data, loading } = useAsync(async () => {
    const [movies, rooms] = await Promise.all([api.movies(), api.admin.rooms()]);
    return { movies, rooms };
  }, []);
  const [movieId, setMovieId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [startsAt, setStartsAt] = useState(defaultShowStart);
  const [price, setPrice] = useState('8.50');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!data?.movies.length || !data.rooms.length) {
    return (
      <EmptyState
        title="Faltan datos"
        body="Necesitas al menos una película y una sala para programar sesiones."
        action={{ to: '/admin/catalog', label: 'Ir al catálogo' }}
      />
    );
  }

  const movie = data.movies.find((m) => m.movieId === movieId) ?? data.movies[0]!;
  const room = data.rooms.find((r) => r.roomId === roomId) ?? data.rooms[0]!;
  const startIso = startsAt ? new Date(startsAt).toISOString() : undefined;
  const priceCents = Math.round(Number(price.replace(',', '.')) * 100);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startIso) return;
    setBusy(true);
    try {
      await api.admin.createShow({ movieId: movie.movieId, roomId: room.roomId, startsAt: startIso, priceCents });
      notify({ tone: 'success', title: 'Sesión programada', body: `${movie.title} · ${time(startIso)}` });
      navigate('/admin');
    } catch (err) {
      notify({ tone: 'error', title: 'No se pudo crear', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="new-show">
      <form className="card card--pad stack" style={{ '--gap': '18px' } as React.CSSProperties} onSubmit={submit}>
        <h3>Programar sesión</h3>
        <div className="field">
          <Label htmlFor="show-movie">Película</Label>
          <Select value={movie.movieId} onValueChange={setMovieId}>
            <SelectTrigger id="show-movie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.movies.map((m) => (
                <SelectItem key={m.movieId} value={m.movieId}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="field">
          <Label htmlFor="show-room">Sala</Label>
          <Select value={room.roomId} onValueChange={setRoomId}>
            <SelectTrigger id="show-room">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.rooms.map((r) => (
                <SelectItem key={r.roomId} value={r.roomId}>
                  {r.name} · {r.capacity} butacas
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="form-grid">
          <div className="field">
            <Label htmlFor="show-starts">Fecha y hora</Label>
            <Input id="show-starts" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="show-price">Precio (€)</Label>
            <Input
              id="show-price"
              className="tabular"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <Button size="lg" disabled={busy || !startIso || !(priceCents >= 0)}>
          {busy ? 'Programando…' : 'Abrir venta'}
        </Button>
      </form>

      <aside className="card card--pad new-show__preview">
        <span className="eyebrow">Vista previa</span>
        <Poster movie={movie} />
        <div>
          <h3 className="display" style={{ fontSize: 30 }}>
            {movie.title}
          </h3>
          {startIso && (
            <p className="text-2">
              {capitalize(dateLong(startIso))} · <strong className="tabular">{time(startIso)}</strong>
            </p>
          )}
          <p className="muted">
            {room.name} · {room.capacity} butacas · {Number.isFinite(priceCents) ? money(priceCents) : '—'}
          </p>
        </div>
      </aside>
    </div>
  );
}
