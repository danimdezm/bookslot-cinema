import { useMemo } from 'react';

export function Barcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < code.length; i++) {
      const c = code.charCodeAt(i);
      out.push((c % 3) + 1, ((c >> 2) % 2) + 1);
    }
    return out.slice(0, 56);
  }, [code]);
  let x = 0;
  return (
    <svg className="barcode" viewBox={`0 0 ${bars.reduce((a, b) => a + b + 1, 0)} 40`} preserveAspectRatio="none" aria-hidden>
      {bars.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="40" /> : null;
        x += w + 1;
        return rect;
      })}
    </svg>
  );
}
