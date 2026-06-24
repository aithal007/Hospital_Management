import { Kafka } from 'kafkajs';
import { createInvoiceFromEvent } from '../modules/invoices/invoices.service.js';
import invoicesRepository from '../modules/invoices/invoices.repository.js';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:29092';

const kafka = new Kafka({
  clientId: 'billing-service',
  brokers: [KAFKA_BROKER].filter(Boolean),
});

export const consumer = kafka.consumer({ groupId: 'billing-service-group' });

async function handleClaimApproved(payload) {
  const { appointment_id, amount } = payload;

  if (!appointment_id) {
    console.warn('[Billing Kafka] claim-approved: missing appointment_id in payload, skipping.');
    return;
  }

  const invoice = await invoicesRepository.markAsCovered(appointment_id);

  if (invoice) {
    console.log(
      `[Billing Kafka] Invoice for appointment ${appointment_id} marked as 'covered' (claim amount: $${amount}).`
    );
  } else {
    console.warn(
      `[Billing Kafka] claim-approved: No pending invoice found for appointment ${appointment_id}. ` +
        `It may already be paid/covered or not yet generated.`
    );
  }
}

export async function startBillingConsumer() {
  try {
    console.log('[Billing Kafka] Connecting consumer...');
    await consumer.connect();
    await consumer.subscribe({
      topics: ['appointment-completed', 'claim-approved'],
      fromBeginning: true,
    });
    console.log('[Billing Kafka] Subscribed to appointment-completed and claim-approved topics.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[Billing Kafka] Received ${topic} event:`, payload);

          if (topic === 'appointment-completed') {
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
          } else if (topic === 'claim-approved') {
            await handleClaimApproved(payload);
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
