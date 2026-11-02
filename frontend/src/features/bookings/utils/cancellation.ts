import { config } from '@/lib/config';
import type { Booking } from '@/types';

export const freeUntil = (b: Booking) => new Date(new Date(b.startsAt).getTime() - config.cancelFreeHours * 3_600_000);

export const canCancelFree = (b: Booking) => new Date() < freeUntil(b);
