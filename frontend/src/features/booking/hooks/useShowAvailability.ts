import { useAsync } from '@/hooks';
import { api } from '@/lib/api';

export const useShowAvailability = (showId: string) =>
  useAsync(async () => {
    const availability = await api.show(showId);
    const movie = await api.movie(availability.show.movieId).catch(() => undefined);
    return { ...availability, movie };
  }, [showId]);
