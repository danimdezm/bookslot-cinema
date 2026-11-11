import type { Movie } from '../../domain/types';
import { index, keys } from '../../shared/dynamo/keys';
import { getItem, putNew, queryItems } from '../../shared/dynamo/operations';

const toItem = (movie: Movie) => ({
  ...keys.movie(movie.movieId),
  type: 'MOVIE',
  GSI2PK: index.movies,
  GSI2SK: `${movie.title.toLowerCase()}#${movie.movieId}`,
  ...movie,
});

export const findMovie = (movieId: string) => getItem<Movie>(keys.movie(movieId));

export const listMovies = () =>
  queryItems<Movie>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': index.movies },
  });

export const saveMovie = (movie: Movie) => putNew(toItem(movie));
