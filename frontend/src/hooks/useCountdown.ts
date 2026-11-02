import { useEffect, useState } from 'react';

export function useCountdown(iso: string | undefined): number {
  const remaining = () => (iso ? Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(remaining);
  useEffect(() => {
    setSeconds(remaining());
    const id = setInterval(() => setSeconds(remaining()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  return seconds;
}
