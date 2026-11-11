import { DAY_MS, PUBLIC_SHOWS_WINDOW_DAYS } from '../../shared/constants';
import { json, Router } from '../../shared/http/router';
import * as catalog from './catalog.service';

export const catalogRouter = new Router()
  .get('/movies', 'public', async () => json(200, { items: await catalog.listMovies() }))

  .get('/movies/{movieId}', 'public', async ({ params }) => json(200, await catalog.getMovie(params.movieId!)))

  .get('/movies/{movieId}/shows', 'public', async ({ params, query }) => {
    const from = query.from ?? new Date().toISOString();
    const to = query.to ?? new Date(Date.now() + PUBLIC_SHOWS_WINDOW_DAYS * DAY_MS).toISOString();
    return json(200, { items: await catalog.listShowsForMovie(params.movieId!, from, to) });
  })

  .get('/shows/{showId}', 'public', async ({ params }) => json(200, await catalog.getShowAvailability(params.showId!)));
