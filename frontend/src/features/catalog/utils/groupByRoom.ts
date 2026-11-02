import type { Show } from '@/types';

export const groupByRoom = (shows: Show[]) =>
  shows.reduce<Record<string, Show[]>>((acc, s) => {
    (acc[s.roomName] ??= []).push(s);
    return acc;
  }, {});
