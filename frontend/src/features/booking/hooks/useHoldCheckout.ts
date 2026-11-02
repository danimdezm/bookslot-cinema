import { useAsync } from '@/hooks';
import { api } from '@/lib/api';

export const useHoldCheckout = (holdId: string) =>
  useAsync(async () => {
    const hold = await api.hold(holdId);
    const { show } = await api.show(hold.showId);
    const movie = await api.movie(show.movieId).catch(() => undefined);
    return { hold, show, movie };
  }, [holdId]);
