import { z } from 'zod';

export const MovieBody = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(600),
  rating: z.string().max(10).optional(),
  description: z.string().max(2000).optional(),
  posterUrl: z.url().optional(),
});

export const RoomBody = z.object({
  name: z.string().min(1).max(100),
  rows: z
    .array(z.object({ row: z.string().regex(/^[A-Z]{1,2}$/), seats: z.number().int().min(1).max(999) }))
    .min(1)
    .max(60),
});

export const ShowBody = z.object({
  movieId: z.string().min(1),
  roomId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  priceCents: z.number().int().min(0),
});

export const BlockBody = z.object({ reason: z.string().min(1).max(500) });
export const CancelBody = z.object({ reason: z.string().max(500).optional() });
