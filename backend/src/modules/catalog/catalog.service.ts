import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { isClaimable, seatsForRows } from '../../domain/seats';
import type { Movie, Room, RoomRow, SeatStatus, Show, ShowStatus } from '../../domain/types';
import { config } from '../../shared/config';
import { DEFAULT_BLOCK_REASON, ENTITY_NAMES, ERROR_MESSAGES } from '../../shared/messages/errors';
import * as movies from './movies.repository';
import * as rooms from './rooms.repository';
import * as seats from './seats.repository';
import * as shows from './shows.repository';

export const { listMovies } = movies;
export const { listRooms } = rooms;
export const { listShows, listShowsForMovie } = shows;

type CreateMovieInput = Omit<Movie, 'movieId' | 'createdAt'>;

export async function createMovie(input: CreateMovieInput): Promise<Movie> {
  const movie: Movie = { ...input, movieId: randomUUID(), createdAt: new Date().toISOString() };
  await movies.saveMovie(movie);
  return movie;
}

export async function getMovie(movieId: string): Promise<Movie> {
  const movie = await movies.findMovie(movieId);
  if (!movie) throw new NotFoundError(ENTITY_NAMES.movie);
  return movie;
}

export async function createRoom(input: { name: string; rows: RoomRow[] }): Promise<Room> {
  const rowNames = input.rows.map((r) => r.row);
  if (new Set(rowNames).size !== rowNames.length) throw new ValidationError(ERROR_MESSAGES.duplicatedRows);
  const room: Room = {
    roomId: randomUUID(),
    name: input.name,
    rows: input.rows,
    capacity: input.rows.reduce((sum, r) => sum + r.seats, 0),
    createdAt: new Date().toISOString(),
  };
  await rooms.saveRoom(room);
  return room;
}

interface CreateShowInput {
  movieId: string;
  roomId: string;
  startsAt: string;
  priceCents: number;
}

export async function createShow(input: CreateShowInput): Promise<Show> {
  const [movie, room] = await Promise.all([movies.findMovie(input.movieId), rooms.findRoom(input.roomId)]);
  if (!movie) throw new NotFoundError(ENTITY_NAMES.movie);
  if (!room) throw new NotFoundError(ENTITY_NAMES.room);

  const show: Show = {
    showId: randomUUID(),
    movieId: movie.movieId,
    movieTitle: movie.title,
    roomId: room.roomId,
    roomName: room.name,
    startsAt: new Date(input.startsAt).toISOString(),
    priceCents: input.priceCents,
    currency: config.currency,
    capacity: room.capacity,
    available: room.capacity,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
  await seats.saveSeats(show.showId, seatsForRows(room.rows));
  await shows.saveShow(show);
  return show;
}

export async function getShow(showId: string, consistent = false): Promise<Show> {
  const show = await shows.findShow(showId, consistent);
  if (!show) throw new NotFoundError(ENTITY_NAMES.show);
  return show;
}

interface PublicSeat {
  seatId: string;
  row: string;
  number: number;
  status: SeatStatus;
}

export async function getShowAvailability(showId: string, now = new Date()) {
  const [show, showSeats] = await Promise.all([getShow(showId), seats.listShowSeats(showId)]);
  const publicSeats: PublicSeat[] = showSeats.map((s) => ({
    seatId: s.seatId,
    row: s.row,
    number: s.number,
    status: isClaimable(s, now) ? 'AVAILABLE' : s.status,
  }));
  return {
    show: { ...show, available: publicSeats.filter((s) => s.status === 'AVAILABLE').length },
    seats: publicSeats,
  };
}

export async function setShowStatus(showId: string, status: ShowStatus, actor: string, reason?: string): Promise<Show> {
  const blockedReason = status === 'BLOCKED' ? (reason ?? DEFAULT_BLOCK_REASON) : null;
  const show = await shows.updateShowStatus(showId, status, actor, blockedReason);
  if (!show) throw new NotFoundError(ENTITY_NAMES.show);
  return show;
}

export async function recountAvailable(showId: string): Promise<number> {
  const showSeats = await seats.listShowSeats(showId);
  const available = showSeats.filter((s) => s.status === 'AVAILABLE').length;
  await shows.updateAvailable(showId, available);
  return available;
}
