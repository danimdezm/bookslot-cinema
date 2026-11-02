import './env';
import { config } from '../config';
import { createMovie, createRoom, createShow } from '../store/catalog';
import { ensureTable } from './table';

const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

await ensureTable(config.tableName);

const movies = await Promise.all([
  createMovie({
    title: 'Órbita Cero',
    durationMinutes: 128,
    rating: '12',
    description:
      'Una ingeniera queda atrapada en una estación orbital que ha perdido el contacto con la Tierra. Tiene once horas para entender por qué el silencio no es una avería.',
  }),
  createMovie({
    title: 'El Faro del Norte',
    durationMinutes: 104,
    rating: '7',
    description:
      'Un farero jubilado y su nieta reparan la vieja luz de la costa antes del último invierno del pueblo. Una historia pequeña sobre las cosas que merecen seguir encendidas.',
  }),
  createMovie({
    title: 'La Última Sesión',
    durationMinutes: 96,
    rating: '16',
    description:
      'Madrid, 1987. En la noche de cierre de un cine de barrio, la proyeccionista descubre que alguien ha cambiado el último rollo de la película.',
  }),
  createMovie({
    title: 'Mareas',
    durationMinutes: 117,
    rating: '12',
    description:
      'Dos hermanas se reencuentran en la casa familiar de Cádiz para vaciarla antes de venderla. Cada habitación guarda una versión distinta de la misma infancia.',
  }),
]);

const rooms = await Promise.all([
  createRoom({ name: 'Sala 1', rows: letters(8).map((row) => ({ row, seats: 12 })) }),
  createRoom({ name: 'Sala 2 VIP', rows: letters(5).map((row) => ({ row, seats: 8 })) }),
  createRoom({ name: 'Sala 3', rows: letters(10).map((row) => ({ row, seats: 14 })) }),
]);

const times: [number, number][] = [
  [16, 30],
  [19, 0],
  [21, 45],
];

const shows = [];
for (let day = 0; day < 7; day++) {
  for (const [r, room] of rooms.entries()) {
    for (const [t, [h, m]] of times.entries()) {
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + day);
      startsAt.setHours(h, m, 0, 0);
      if (startsAt <= new Date()) continue;
      const movie = movies[(day + r + t) % movies.length]!;
      shows.push(
        await createShow({
          movieId: movie.movieId,
          roomId: room.roomId,
          startsAt: startsAt.toISOString(),
          priceCents: room.name.includes('VIP') ? 1200 : t === 0 ? 650 : 850,
        }),
      );
    }
  }
}

console.log(`Tabla ${config.tableName}: ${movies.length} películas, ${rooms.length} salas, ${shows.length} sesiones\n`);
for (const s of shows.slice(0, 5)) console.log(`  ${s.showId}  ${s.startsAt}  ${s.movieTitle} · ${s.roomName}`);
console.log(`\nPrueba:  curl -s http://localhost:3000/shows/${shows[0]?.showId} | head -c 400`);
