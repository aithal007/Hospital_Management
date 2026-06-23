import { kafka } from '../db/kafka.js';

const consumer = kafka.consumer({ groupId: 'hms-monolith-cancelled-group' });

export async function startAppointmentCancelledConsumer() {
  try {
    console.log('[Kafka Consumer] Connecting appointment-cancelled consumer...');
    await consumer.connect();
    await consumer.subscribe({ topic: 'appointment-cancelled', fromBeginning: true });
    console.log('[Kafka Consumer] Consumer connected and subscribed to: appointment-cancelled');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();
        console.log(`\n============================================================`);
        console.log(`[Kafka Consumer] Received event from topic: ${topic}`);
        console.log(`Partition: ${partition}`);
        console.log(`Payload: ${value}`);
        console.log(`============================================================\n`);
      },
    });
  } catch (err) {
    console.error('[Kafka Consumer] Error running appointment-cancelled consumer:', err.message);
  }
}
