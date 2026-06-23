import { Queue } from 'bullmq';
import { queueConnection } from '../db/queue.js';

export const billGenerationQueue = new Queue('bill-generation', {
  connection: queueConnection,
});
