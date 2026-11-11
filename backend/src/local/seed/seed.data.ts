import type { RoomRow } from '../../domain/types';

const rows = (count: number, seats: number): RoomRow[] =>
  Array.from({ length: count }, (_, i) => ({ row: String.fromCharCode(65 + i), seats }));

export const MOVIES = [
  {
    title: 'Órbita Cero',
    durationMinutes: 128,
    rating: '12',
    description:
      'Una ingeniera queda atrapada en una estación orbital que ha perdido el contacto con la Tierra. Tiene once horas para entender por qué el silencio no es una avería.',
  },
  {
    title: 'El Faro del Norte',
    durationMinutes: 104,
    rating: '7',
    description:
      'Un farero jubilado y su nieta reparan la vieja luz de la costa antes del último invierno del pueblo. Una historia pequeña sobre las cosas que merecen seguir encendidas.',
  },
  {
    title: 'La Última Sesión',
    durationMinutes: 96,
    rating: '16',
    description:
      'Madrid, 1987. En la noche de cierre de un cine de barrio, la proyeccionista descubre que alguien ha cambiado el último rollo de la película.',
  },
  {
    title: 'Mareas',
    durationMinutes: 117,
    rating: '12',
    description:
      'Dos hermanas se reencuentran en la casa familiar de Cádiz para vaciarla antes de venderla. Cada habitación guarda una versión distinta de la misma infancia.',
  },
];

export const ROOMS = [
  { name: 'Sala 1', rows: rows(8, 12) },
  { name: 'Sala 2 VIP', rows: rows(5, 8) },
  { name: 'Sala 3', rows: rows(10, 14) },
];

export const SHOW_TIMES: [hour: number, minute: number][] = [
  [16, 30],
  [19, 0],
  [21, 45],
];

export const SEED_DAYS = 7;

export const PRICES = { vip: 1200, matinee: 650, standard: 850 };
