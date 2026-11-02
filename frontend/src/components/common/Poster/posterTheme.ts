import type { CSSProperties } from 'react';

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const VARIANTS = ['sun', 'horizon', 'beam', 'orbit'] as const;

export function posterTheme(title: string) {
  const h = hash(title);
  const hue = h % 360;
  return {
    variant: VARIANTS[(h >>> 9) % VARIANTS.length]!,
    style: {
      '--h1': hue,
      '--h2': (hue + 28 + ((h >>> 3) % 50)) % 360,
      '--h3': (hue + 180 + ((h >>> 5) % 40)) % 360,
      '--sx': `${20 + ((h >>> 7) % 60)}%`,
      '--sy': `${18 + ((h >>> 11) % 30)}%`,
    } as CSSProperties,
  };
}
