import { useAsync } from '@/hooks';
import { api } from '@/lib/api';
import type { Movie, Show } from '@/types';

export interface Billboard {
  movies: Movie[];
  shows: Record<string, Show[]>;
}

async function loadBillboard(): Promise<Billboard> {
  const movies = await api.movies();
  const lists = await Promise.all(movies.map((m) => api.movieShows(m.movieId)));
  const shows = Object.fromEntries(movies.map((m, i) => [m.movieId, lists[i]!.filter((s) => s.status === 'OPEN')]));
  const next = (m: Movie) => shows[m.movieId]?.[0]?.startsAt ?? '9999';
  return { movies: [...movies].sort((a, b) => next(a).localeCompare(next(b))), shows };
}

export const useBillboard = () => useAsync(loadBillboard, []);
