import '../env';
import type { Movie, Room, Show } from '../../domain/types';
import { createMovie, createRoom, createShow } from '../../modules/catalog/catalog.service';
import { config } from '../../shared/config';
import { LOCAL_MESSAGES } from '../messages';
import { MOVIES, PRICES, ROOMS, SEED_DAYS, SHOW_TIMES } from './seed.data';
import { ensureTable } from '../database/table';

function showTime(day: number, hour: number, minute: number): Date {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + day);
  startsAt.setHours(hour, minute, 0, 0);
  return startsAt;
}

const priceFor = (room: Room, timeIndex: number) =>
  room.name.includes('VIP') ? PRICES.vip : timeIndex === 0 ? PRICES.matinee : PRICES.standard;

async function createShows(movies: Movie[], rooms: Room[]): Promise<Show[]> {
  const shows: Show[] = [];
  for (let day = 0; day < SEED_DAYS; day++) {
    for (const [r, room] of rooms.entries()) {
      for (const [t, [hour, minute]] of SHOW_TIMES.entries()) {
        const startsAt = showTime(day, hour, minute);
        if (startsAt <= new Date()) continue;
        const movie = movies[(day + r + t) % movies.length]!;
        shows.push(
          await createShow({
            movieId: movie.movieId,
            roomId: room.roomId,
            startsAt: startsAt.toISOString(),
            priceCents: priceFor(room, t),
          }),
        );
      }
    }
  }
  return shows;
}

await ensureTable(config.tableName);
const movies = await Promise.all(MOVIES.map(createMovie));
const rooms = await Promise.all(ROOMS.map(createRoom));
const shows = await createShows(movies, rooms);

console.log(LOCAL_MESSAGES.seedSummary(config.tableName, movies.length, rooms.length, shows.length));
for (const s of shows.slice(0, 5)) console.log(LOCAL_MESSAGES.seedShow(s));
console.log(LOCAL_MESSAGES.seedTry(shows[0]?.showId));
