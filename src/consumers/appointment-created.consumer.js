import { kafka } from '../db/kafka.js';

const consumer = kafka.consumer({ groupId: 'hms-monolith-group' });

export async function startAppointmentCreatedConsumer() {
  try {
    console.log('[Kafka Consumer] Connecting appointment-created consumer...');
    await consumer.connect();
    await consumer.subscribe({ topic: 'appointment-created', fromBeginning: true });
    console.log('[Kafka Consumer] Consumer connected and subscribed to: appointment-created');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = message.value.toString();
          JSON.parse(value); // Validate that it is valid JSON
          
          console.log(`\n============================================================`);
          console.log(`[Kafka Consumer] Received event from topic: ${topic}`);
          console.log(`Partition: ${partition}`);
          console.log(`Payload: ${value}`);
          console.log(`============================================================\n`);
        } catch (err) {
          console.error(`\n============================================================`);
          console.error(`[DEAD-LETTER LOG] Failed to process message in topic '${topic}'`);
          console.error(`Partition: ${partition} | Offset: ${message.offset}`);
          console.error(`Error: ${err.message}`);
          console.error(`Raw Value: ${message.value ? message.value.toString() : 'null'}`);
          console.error(`============================================================\n`);
        }
      },
    });
  } catch (err) {
    console.error('[Kafka Consumer] Error running appointment-created consumer:', err.message);
  }
}
