import { Queue } from 'bullmq';
import { queueConnection } from '../db/queue.js';

export const prescriptionReminderQueue = new Queue('prescription-reminder', {
  connection: queueConnection,
});
