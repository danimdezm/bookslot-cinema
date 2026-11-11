import { adminRouter } from '../../modules/admin/admin.routes';
import { bookingsRouter } from '../../modules/bookings/bookings.routes';
import { catalogRouter } from '../../modules/catalog/catalog.routes';
import { healthRouter } from '../../modules/health/health.routes';
import { holdsRouter } from '../../modules/holds/holds.routes';

export const routers = [healthRouter, catalogRouter, holdsRouter, bookingsRouter, adminRouter];
