import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Booking, BookingFilters } from '@/types';

export type BookingsTab = 'upcoming' | 'past' | 'cancelled';

function filtersFor(tab: BookingsTab): BookingFilters {
  const now = new Date().toISOString();
  if (tab === 'upcoming') return { status: 'CONFIRMED', from: now };
  if (tab === 'past') return { status: 'CONFIRMED', to: now };
  return { status: 'CANCELLED' };
}

export function useMyBookings(tab: BookingsTab) {
  const [items, setItems] = useState<Booking[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const load = useCallback(
    async (reset: boolean, from?: string) => {
      setLoading(true);
      setError(undefined);
      try {
        const page = await api.myBookings({ ...filtersFor(tab), cursor: reset ? undefined : from, limit: 10 });
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  return {
    items,
    loading,
    error,
    hasMore: Boolean(cursor),
    reload: () => load(true),
    loadMore: () => load(false, cursor),
    remove: (bookingId: string) => setItems((prev) => prev.filter((b) => b.bookingId !== bookingId)),
  };
}
