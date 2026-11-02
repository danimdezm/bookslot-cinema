import { useMemo } from 'react';
import type { Show } from '@/types';

export function useShowStats(shows: Show[]) {
  return useMemo(() => {
    const upcoming = shows.filter((s) => new Date(s.startsAt) > new Date()).length;
    const sold = shows.reduce((n, s) => n + (s.capacity - s.available), 0);
    const capacity = shows.reduce((n, s) => n + s.capacity, 0);
    const revenueCents = shows.reduce((n, s) => n + (s.capacity - s.available) * s.priceCents, 0);
    return { upcoming, sold, occupancyPct: capacity ? Math.round((sold / capacity) * 100) : 0, revenueCents };
  }, [shows]);
}
