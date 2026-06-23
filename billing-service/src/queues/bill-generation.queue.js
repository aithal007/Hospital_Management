import { Queue } from 'bullmq';
import { queueConnection } from '../db/queue.js';

export const billGenerationQueue = new Queue('bill-generation', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
