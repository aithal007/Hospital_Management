import { Queue } from 'bullmq';
import { queueConnection } from '../db/queue.js';

export const appointmentReminderQueue = new Queue('appointment-reminder', {
  connection: queueConnection,
});
