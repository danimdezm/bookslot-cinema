import { useMemo } from 'react';
import { useAsync } from '@/hooks';
import { api } from '@/lib/api';
import { dayKey } from '@/lib/format';
import type { Show } from '@/types';

const DAYS_AHEAD = 14;

export function useMovieShows(movieId: string) {
  const state = useAsync(async () => {
    const [movie, shows] = await Promise.all([
      api.movie(movieId),
      api.movieShows(movieId, new Date().toISOString(), new Date(Date.now() + DAYS_AHEAD * 86_400_000).toISOString()),
    ]);
    return { movie, shows };
  }, [movieId]);

  const days = useMemo(() => {
    const map = new Map<string, Show[]>();
    for (const s of state.data?.shows ?? []) {
      const key = dayKey(s.startsAt);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [state.data]);

  return { ...state, days };
}
