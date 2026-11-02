import { useState, type FormEvent } from 'react';
import { useToast } from '@/hooks';
import { api } from '@/lib/api';
import { rowLetters } from '@/lib/format';
import './RoomForm.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function RoomForm({ onCreated }: { onCreated(): void }) {
  const notify = useToast();
  const [name, setName] = useState('');
  const [rows, setRows] = useState(8);
  const [seats, setSeats] = useState(12);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.createRoom({ name, rows: rowLetters(rows).map((row) => ({ row, seats })) });
      notify({ tone: 'success', title: 'Sala creada', body: `${name} · ${rows * seats} butacas` });
      setName('');
      onCreated();
    } catch (err) {
      notify({ tone: 'error', title: 'No se pudo crear', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--pad stack" onSubmit={submit}>
      <h3>Nueva sala</h3>
      <div className="field">
        <Label htmlFor="room-name">Nombre</Label>
        <Input id="room-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sala 3" />
      </div>
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="room-rows">Filas</Label>
          <Input
            id="room-rows"
            type="number"
            min={1}
            max={26}
            value={rows}
            onChange={(e) => setRows(clamp(Number(e.target.value), 1, 26))}
          />
        </div>
        <div className="field">
          <Label htmlFor="room-seats">Butacas por fila</Label>
          <Input
            id="room-seats"
            type="number"
            min={1}
            max={40}
            value={seats}
            onChange={(e) => setSeats(clamp(Number(e.target.value), 1, 40))}
          />
        </div>
      </div>
      <div className="room-preview" aria-label={`Vista previa: ${rows * seats} butacas`}>
        <div className="room-preview__screen" />
        {rowLetters(rows).map((r) => (
          <div key={r} className="room-preview__row">
            {Array.from({ length: seats }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        ))}
        <span className="muted">{rows * seats} butacas</span>
      </div>
      <Button disabled={busy || !name}>{busy ? 'Creando…' : 'Crear sala'}</Button>
    </form>
  );
}
