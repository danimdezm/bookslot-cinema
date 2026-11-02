import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/hooks';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { Show } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BlockShowModalProps {
  show: Show;
  onClose(): void;
  onBlocked(): void;
}

export function BlockShowModal({ show, onClose, onBlocked }: BlockShowModalProps) {
  const notify = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await api.admin.block(show.showId, reason || 'Bloqueada por administración');
      notify({
        tone: 'success',
        title: 'Sesión bloqueada',
        body: res.cancelledBookings
          ? `${res.cancelledBookings} reservas canceladas y reembolsadas. Los clientes han sido avisados por email.`
          : 'No había reservas afectadas.',
      });
      onBlocked();
    } catch (err) {
      notify({ tone: 'error', title: 'No se pudo bloquear', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Bloquear sesión"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Volver
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? 'Bloqueando…' : 'Bloquear y avisar'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p style={{ margin: 0 }} className="text-2">
          <strong>{show.movieTitle}</strong> · {dateTime(show.startsAt)} · {show.roomName}
        </p>
        <div className="alert">
          Se cancelarán y reembolsarán todas las reservas confirmadas ({show.capacity - show.available} entradas) y se avisará por email a
          cada cliente.
        </div>
        <div className="field">
          <Label htmlFor="block-reason">Motivo</Label>
          <Input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mantenimiento del proyector" />
        </div>
      </div>
    </Modal>
  );
}
