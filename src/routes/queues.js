import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { appointmentReminderQueue } from '../queues/appointment-reminder.queue.js';
import { prescriptionReminderQueue } from '../queues/prescription-reminder.queue.js';
import { billGenerationQueue } from '../queues/bill-generation.queue.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(appointmentReminderQueue),
    new BullMQAdapter(prescriptionReminderQueue),
    new BullMQAdapter(billGenerationQueue),
  ],
  serverAdapter,
});

export default serverAdapter;
