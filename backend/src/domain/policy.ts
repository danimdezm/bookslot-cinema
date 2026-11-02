export interface CancellationDecision {
  allowed: boolean;
  freeUntil: string;
}

export function cancellationDecision(startsAt: string, now: Date, freeHours: number): CancellationDecision {
  const freeUntil = new Date(new Date(startsAt).getTime() - freeHours * 3_600_000);
  return { allowed: now < freeUntil, freeUntil: freeUntil.toISOString() };
}

export function reminderTime(startsAt: string, now: Date, hoursBefore: number): Date | null {
  const at = new Date(new Date(startsAt).getTime() - hoursBefore * 3_600_000);
  return at > now ? at : null;
}
