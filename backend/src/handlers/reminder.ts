import { sendReminder } from '../notify';

export const handler = async (event: { bookingId: string }) => {
  await sendReminder(event.bookingId);
};
