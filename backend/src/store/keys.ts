export const keys = {
  movie: (movieId: string) => ({ PK: `MOVIE#${movieId}`, SK: 'META' }),
  room: (roomId: string) => ({ PK: `ROOM#${roomId}`, SK: 'META' }),
  show: (showId: string) => ({ PK: `SHOW#${showId}`, SK: 'META' }),
  seat: (showId: string, seatId: string) => ({ PK: `SHOW#${showId}`, SK: `SEAT#${seatId}` }),
  hold: (holdId: string) => ({ PK: `HOLD#${holdId}`, SK: 'META' }),
  booking: (bookingId: string) => ({ PK: `BOOKING#${bookingId}`, SK: 'META' }),
  idempotency: (userId: string, key: string) => ({ PK: `IDEMP#${userId}#${key}`, SK: 'META' }),
  wsShow: (showId: string, connectionId: string) => ({ PK: `WSCONN#${showId}`, SK: `CONN#${connectionId}` }),
  wsConnection: (connectionId: string) => ({ PK: `CONN#${connectionId}`, SK: 'META' }),
};

export const index = {
  movies: 'MOVIES',
  rooms: 'ROOMS',
  movieShows: (movieId: string) => `MOVIE#${movieId}`,
  allShows: 'SHOWS',
  userBookings: (userId: string) => `USER#${userId}`,
  showBookings: (showId: string) => `SHOW#${showId}`,
};

export const epochSeconds = (date: Date) => Math.floor(date.getTime() / 1000);
