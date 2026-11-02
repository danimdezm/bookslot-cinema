import { NotFoundError } from '../domain/errors';
import { json, Router } from '../lib/http';
import { getMovie, getShowAvailability, listMovies, listShowsForMovie } from '../store/catalog';

const DAY = 86_400_000;

export const catalogRouter = new Router()
  .get('/movies', 'public', async () => json(200, { items: await listMovies() }))

  .get('/movies/{movieId}', 'public', async ({ params }) => {
    const movie = await getMovie(params.movieId!);
    if (!movie) throw new NotFoundError('Película');
    return json(200, movie);
  })

  .get('/movies/{movieId}/shows', 'public', async ({ params, query }) => {
    const from = query.from ?? new Date().toISOString();
    const to = query.to ?? new Date(Date.now() + 7 * DAY).toISOString();
    return json(200, { items: await listShowsForMovie(params.movieId!, from, to) });
  })

  .get('/shows/{showId}', 'public', async ({ params }) => json(200, await getShowAvailability(params.showId!)));
