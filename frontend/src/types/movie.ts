export interface Movie {
  movieId: string;
  title: string;
  durationMinutes: number;
  rating?: string;
  description?: string;
  posterUrl?: string;
}

export interface RoomRow {
  row: string;
  seats: number;
}

export interface Room {
  roomId: string;
  name: string;
  rows: RoomRow[];
  capacity: number;
}
