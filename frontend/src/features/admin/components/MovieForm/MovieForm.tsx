import { useState, type FormEvent } from 'react';
import { Poster } from '@/components/common/Poster';
import { useToast } from '@/hooks';
import { api } from '@/lib/api';
import './MovieForm.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const ALL_AGES = 'TP';
const RATINGS = [{ value: ALL_AGES, label: 'Todos los públicos' }, ...['7', '12', '16', '18'].map((r) => ({ value: r, label: `+${r}` }))];

export function MovieForm({ onCreated }: { onCreated(): void }) {
  const notify = useToast();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(110);
  const [rating, setRating] = useState('12');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.createMovie({
        title,
        durationMinutes: minutes,
        rating: rating === ALL_AGES ? undefined : rating,
        description: description || undefined,
      });
      notify({ tone: 'success', title: 'Película creada', body: title });
      setTitle('');
      setDescription('');
      onCreated();
    } catch (err) {
      notify({ tone: 'error', title: 'No se pudo crear', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--pad catalog-form" onSubmit={submit}>
      <div className="catalog-form__preview">
        <Poster movie={{ title: title || 'Tu película', durationMinutes: minutes, rating: rating === ALL_AGES ? undefined : rating }} />
        <small className="muted">Póster generado a partir del título</small>
      </div>
      <div className="stack">
        <h3>Nueva película</h3>
        <div className="field">
          <Label htmlFor="movie-title">Título</Label>
          <Input id="movie-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Órbita Cero" />
        </div>
        <div className="form-grid">
          <div className="field">
            <Label htmlFor="movie-minutes">Duración (min)</Label>
            <Input
              id="movie-minutes"
              type="number"
              min={1}
              max={600}
              required
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <Label htmlFor="movie-rating">Edad</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger id="movie-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATINGS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="field">
          <Label htmlFor="movie-description">Sinopsis</Label>
          <Textarea
            id="movie-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Una frase que haga querer verla."
          />
        </div>
        <Button disabled={busy || !title}>{busy ? 'Creando…' : 'Crear película'}</Button>
      </div>
    </form>
  );
}
