import type { ReactNode } from 'react';
import { Poster } from '@/components/common/Poster';
import type { Movie } from '@/types';
import './ShowInfo.css';

export function ShowInfo({ movie, title, children }: { movie?: Movie; title: string; children: ReactNode }) {
  return (
    <div className="show-info">
      {movie && <Poster movie={movie} size="sm" />}
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}
