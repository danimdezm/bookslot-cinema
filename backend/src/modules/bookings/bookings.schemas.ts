import { z } from 'zod';

export const BookingsQuery = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
