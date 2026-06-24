import { Queue } from 'bullmq';
import { queueConnection } from '../queue.js';

export const prescriptionReminderQueue = new Queue('prescription-reminder', {
  connection: queueConnection,
});
