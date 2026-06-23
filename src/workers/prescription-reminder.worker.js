import { Worker } from 'bullmq';
import { queueConnection } from '../db/queue.js';

export const prescriptionReminderWorker = new Worker(
  'prescription-reminder',
  async (job) => {
    console.log(`[Worker] Processing prescription reminder job skeleton ${job.id}:`, job.data);
    return { success: true };
  },
  {
    connection: queueConnection,
  }
);

prescriptionReminderWorker.on('completed', (job) => {
  console.log(`[Worker] Prescription reminder job ${job.id} completed successfully.`);
});

prescriptionReminderWorker.on('failed', (job, err) => {
  console.error(`[Worker] Prescription reminder job ${job.id} failed with error:`, err.message);
});
