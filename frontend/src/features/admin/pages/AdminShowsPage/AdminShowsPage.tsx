import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';
import { useAsync, useToast } from '@/hooks';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { Show } from '@/types';
import { BlockShowModal } from '../../components/BlockShowModal';
import { BookingsDrawer } from '../../components/BookingsDrawer';
import { KpiGrid } from '../../components/KpiGrid';
import { ShowsTable } from '../../components/ShowsTable';
import { useShowStats } from '../../hooks/useShowStats';

export function AdminShowsPage() {
  const notify = useToast();
  const { data: shows, loading, error, reload } = useAsync(() => api.admin.shows(), []);
  const stats = useShowStats(shows ?? []);
  const [drawer, setDrawer] = useState<Show>();
  const [blocking, setBlocking] = useState<Show>();

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const list = shows ?? [];

  const toggleBlock = async (show: Show) => {
    if (show.status !== 'BLOCKED') {
      setBlocking(show);
      return;
    }
    await api.admin.unblock(show.showId);
    notify({ tone: 'success', title: 'Sesión reabierta' });
    reload();
  };

  return (
    <>
      <KpiGrid
        items={[
          { label: 'Sesiones próximas', value: stats.upcoming },
          { label: 'Entradas vendidas', value: stats.sold },
          { label: 'Ocupación media', value: `${stats.occupancyPct}%` },
          { label: 'Ingresos', value: money(stats.revenueCents) },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          title="Sin sesiones"
          body="Programa la primera sesión para abrir la venta."
          action={{ to: '/admin/new', label: 'Nueva sesión' }}
        />
      ) : (
        <ShowsTable shows={list} onBookings={setDrawer} onToggleBlock={toggleBlock} />
      )}

      {drawer && <BookingsDrawer show={drawer} onClose={() => setDrawer(undefined)} onChanged={reload} />}

      {blocking && (
        <BlockShowModal
          show={blocking}
          onClose={() => setBlocking(undefined)}
          onBlocked={() => {
            setBlocking(undefined);
            reload();
          }}
        />
      )}
    </>
  );
}
