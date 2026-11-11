import { z } from 'zod';

export const CreateHoldBody = z.object({ seats: z.array(z.string().min(2).max(6)).min(1) });
