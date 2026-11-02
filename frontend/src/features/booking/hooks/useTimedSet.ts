import { useCallback, useState } from 'react';

export function useTimedSet(ms: number) {
  const [items, setItems] = useState<Set<string>>(new Set());
  const mark = useCallback(
    (ids: string[]) => {
      setItems((prev) => new Set([...prev, ...ids]));
      setTimeout(() => setItems((prev) => new Set([...prev].filter((id) => !ids.includes(id)))), ms);
    },
    [ms],
  );
  return [items, mark] as const;
}
