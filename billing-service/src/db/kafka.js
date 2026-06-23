import { Kafka } from 'kafkajs';
import { createInvoiceFromEvent } from '../modules/invoices/invoices.service.js';

const KAFKA_BOOTSTRAP_SERVERS = process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:29092';

const kafka = new Kafka({
  clientId: 'billing-service',
  brokers: KAFKA_BOOTSTRAP_SERVERS.split(','),
});

export const consumer = kafka.consumer({ groupId: 'billing-service-group' });

export async function startBillingConsumer() {
  try {
    console.log('[Billing Kafka] Connecting consumer...');
    await consumer.connect();
    await consumer.subscribe({ topic: 'appointment-completed', fromBeginning: true });
    console.log('[Billing Kafka] Subscribed to appointment-completed topic.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[Billing Kafka] Received appointment-completed event:`, payload);

          const { id, patient_id } = payload;

          if (id && patient_id) {
            await createInvoiceFromEvent({
              appointmentId: id,
              patientId: patient_id,
              amount: 100.00, // Default consultation fee
            });
          } else {
            console.warn(`[Billing Kafka] Missing appointment ID or patient ID in event payload.`);
          }
        } catch (msgErr) {
          console.error(`\n============================================================`);
          console.error(`[DEAD-LETTER LOG] Failed to process message in topic '${topic}'`);
          console.error(`Partition: ${partition} | Offset: ${message.offset}`);
          console.error(`Error: ${msgErr.message}`);
          console.error(`Raw Value: ${message.value ? message.value.toString() : 'null'}`);
          console.error(`============================================================\n`);
        }
      },
    });
  } catch (err) {
    console.error('[Billing Kafka] Error in consumer:', err.message);
  }
}
