import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { NotFoundError, ValidationError } from '../domain/errors';
import { isClaimable, seatsForRows } from '../domain/seats';
import type { Movie, Room, RoomRow, Seat, SeatStatus, Show, ShowStatus } from '../domain/types';
import { batchPut, ddb, queryAll, strip, type Item } from '../lib/ddb';
import { index, keys } from './keys';

const TableName = () => config.tableName;

async function getItem<T>(key: { PK: string; SK: string }, consistent = false): Promise<T | null> {
  const res = await ddb.send(new GetCommand({ TableName: TableName(), Key: key, ConsistentRead: consistent }));
  return res.Item ? strip<T>(res.Item) : null;
}

export type CreateMovieInput = Omit<Movie, 'movieId' | 'createdAt'>;

export async function createMovie(input: CreateMovieInput): Promise<Movie> {
  const movie: Movie = { ...input, movieId: randomUUID(), createdAt: new Date().toISOString() };
  await ddb.send(
    new PutCommand({
      TableName: TableName(),
      Item: {
        ...keys.movie(movie.movieId),
        type: 'MOVIE',
        GSI2PK: index.movies,
        GSI2SK: `${movie.title.toLowerCase()}#${movie.movieId}`,
        ...movie,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );
  return movie;
}

export const getMovie = (movieId: string) => getItem<Movie>(keys.movie(movieId));

export async function listMovies(): Promise<Movie[]> {
  const items = await queryAll({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': index.movies },
  });
  return items.map((i) => strip<Movie>(i));
}

export async function createRoom(input: { name: string; rows: RoomRow[] }): Promise<Room> {
  const rowNames = input.rows.map((r) => r.row);
  if (new Set(rowNames).size !== rowNames.length) throw new ValidationError('Filas duplicadas en la sala');
  const room: Room = {
    roomId: randomUUID(),
    name: input.name,
    rows: input.rows,
    capacity: input.rows.reduce((sum, r) => sum + r.seats, 0),
    createdAt: new Date().toISOString(),
  };
  await ddb.send(
    new PutCommand({
      TableName: TableName(),
      Item: { ...keys.room(room.roomId), type: 'ROOM', GSI2PK: index.rooms, GSI2SK: room.name, ...room },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );
  return room;
}

export const getRoom = (roomId: string) => getItem<Room>(keys.room(roomId));

export async function listRooms(): Promise<Room[]> {
  const items = await queryAll({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': index.rooms },
  });
  return items.map((i) => strip<Room>(i));
}

export interface CreateShowInput {
  movieId: string;
  roomId: string;
  startsAt: string;
  priceCents: number;
}

export async function createShow(input: CreateShowInput): Promise<Show> {
  const [movie, room] = await Promise.all([getMovie(input.movieId), getRoom(input.roomId)]);
  if (!movie) throw new NotFoundError('Película');
  if (!room) throw new NotFoundError('Sala');

  const startsAt = new Date(input.startsAt).toISOString();
  const show: Show = {
    showId: randomUUID(),
    movieId: movie.movieId,
    movieTitle: movie.title,
    roomId: room.roomId,
    roomName: room.name,
    startsAt,
    priceCents: input.priceCents,
    currency: config.currency,
    capacity: room.capacity,
    available: room.capacity,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  await batchPut(
    seatsForRows(room.rows).map(({ seatId, row, number }) => ({
      ...keys.seat(show.showId, seatId),
      type: 'SEAT',
      showId: show.showId,
      seatId,
      row,
      number,
      status: 'AVAILABLE' satisfies SeatStatus,
    })),
  );
  await ddb.send(
    new PutCommand({
      TableName: TableName(),
      Item: {
        ...keys.show(show.showId),
        type: 'SHOW',
        GSI2PK: index.movieShows(movie.movieId),
        GSI2SK: startsAt,
        GSI3PK: index.allShows,
        GSI3SK: `${startsAt}#${show.showId}`,
        ...show,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );
  return show;
}

export const getShow = (showId: string, consistent = false) => getItem<Show>(keys.show(showId), consistent);

export interface PublicSeat {
  seatId: string;
  row: string;
  number: number;
  status: SeatStatus;
}

export async function getShowSeats(showId: string): Promise<Seat[]> {
  const items = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :seat)',
    ExpressionAttributeValues: { ':pk': keys.show(showId).PK, ':seat': 'SEAT#' },
  });
  return items.map((i) => strip<Seat>(i));
}

export async function getShowAvailability(showId: string, now = new Date()) {
  const [show, seats] = await Promise.all([getShow(showId), getShowSeats(showId)]);
  if (!show) throw new NotFoundError('Sesión');
  const publicSeats: PublicSeat[] = seats.map((s) => ({
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

export async function listShowsForMovie(movieId: string, from: string, to: string): Promise<Show[]> {
  const items = await queryAll({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :from AND :to',
    ExpressionAttributeValues: { ':pk': index.movieShows(movieId), ':from': from, ':to': to },
  });
  return items.map((i) => strip<Show>(i));
}

export async function listShows(from: string, to: string): Promise<Show[]> {
  const items = await queryAll({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk AND GSI3SK BETWEEN :from AND :to',
    ExpressionAttributeValues: { ':pk': index.allShows, ':from': from, ':to': `${to}~` },
  });
  return items.map((i) => strip<Show>(i));
}

export async function setShowStatus(
  showId: string,
  status: ShowStatus,
  actor: string,
  reason?: string,
): Promise<Show> {
  try {
    const res = await ddb.send(
      new UpdateCommand({
        TableName: TableName(),
        Key: keys.show(showId),
        UpdateExpression:
          'SET #status = :status, blockedReason = :reason, lastActor = :actor, lastReason = :reason, updatedAt = :now',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':reason': status === 'BLOCKED' ? (reason ?? 'Bloqueada por administración') : null,
          ':actor': actor,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return strip<Show>(res.Attributes as Item);
  } catch (err) {
    if ((err as Error).name === 'ConditionalCheckFailedException') throw new NotFoundError('Sesión');
    throw err;
  }
}

export async function recountAvailable(showId: string): Promise<number> {
  const seats = await getShowSeats(showId);
  const available = seats.filter((s) => s.status === 'AVAILABLE').length;
  await ddb.send(
    new UpdateCommand({
      TableName: TableName(),
      Key: keys.show(showId),
      UpdateExpression: 'SET available = :n',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':n': available },
    }),
  );
  return available;
}
