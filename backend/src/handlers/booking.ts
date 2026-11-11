import { bookingsRouter } from '../modules/bookings/bookings.routes';
import { holdsRouter } from '../modules/holds/holds.routes';
import { Router } from '../shared/http/router';

export const handler = new Router().use(holdsRouter).use(bookingsRouter).handle;
