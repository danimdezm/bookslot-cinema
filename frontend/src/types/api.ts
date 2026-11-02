import type { BookingStatus } from './booking';

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export type BookingFilters = {
  status?: BookingStatus;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};
