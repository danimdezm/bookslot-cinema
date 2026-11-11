import { sendReminder } from '../modules/notifications/notifications.service';

export const handler = async (event: { bookingId: string }) => {
  await sendReminder(event.bookingId);
};
