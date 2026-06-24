import { Kafka } from 'kafkajs';
import { sendEmail } from './email.js';
import { prescriptionReminderQueue } from './queues/prescription-reminder.queue.js';
import { getReminderRepeatMs } from './utils/frequency.js';

const KAFKA_BOOTSTRAP_SERVERS = process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:29092';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: KAFKA_BOOTSTRAP_SERVERS.split(','),
});

export const consumer = kafka.consumer({ groupId: 'notification-service-group' });

async function handleAppointmentCreated(payload) {
  const {
    id,
    patient_email,
    patient_first_name,
    doctor_first_name,
    doctor_last_name,
    appointment_date,
    start_time,
  } = payload;

  if (!patient_email) {
    console.warn('[Notification Kafka] Skipping email send: patient_email not found in payload.');
    return;
  }

  const mailPayload = {
    to: patient_email,
    subject: 'Appointment Scheduled - CareFlow HMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0ea5e9;">Appointment Scheduled (Pending Approval)</h2>
        <p>Hello <strong>${patient_first_name || 'Patient'}</strong>,</p>
        <p>Your appointment with <strong>Dr. ${doctor_first_name || ''} ${doctor_last_name || ''}</strong> has been scheduled and is currently pending approval.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${appointment_date}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${start_time}</p>
          <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${id}</p>
        </div>
        <p>We will notify you once the doctor reviews your slot request.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.875rem; color: #64748b; text-align: center;">CareFlow HMS</p>
      </div>
    `,
  };

  const result = await sendEmail(mailPayload);
  if (result.success) {
    console.log(`[Notification Kafka] Email notification sent successfully to ${patient_email}`);
  } else {
    console.error(`[Notification Kafka] Failed to send email to ${patient_email}:`, result.error);
  }
}

async function handlePrescriptionCreated(payload) {
  const { id, appointment_id, doctor_id, patient_id, medications } = payload;

  if (!id || !patient_id || !Array.isArray(medications) || medications.length === 0) {
    console.warn('[Notification Kafka] Skipping reminder enqueue: invalid prescription-created payload.');
    return;
  }

  for (const medication of medications) {
    const repeatEveryMs = getReminderRepeatMs(medication.frequency);

    const job = await prescriptionReminderQueue.add(
      'medicine-reminder',
      {
        prescriptionId: id,
        appointmentId: appointment_id,
        doctorId: doctor_id,
        patientId: patient_id,
        medicineName: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
      },
      {
        repeat: {
          every: repeatEveryMs,
          limit: 7,
        },
      }
    );

    console.log(
      `[Notification Kafka] Enqueued medicine reminder job ${job.id} for ${medication.name} (${medication.frequency}, every ${repeatEveryMs / 3600000}h)`
    );
  }
}

export async function startNotificationConsumer() {
  try {
    console.log('[Notification Kafka] Connecting consumer...');
    await consumer.connect();
    await consumer.subscribe({
      topics: ['appointment-created', 'prescription-created'],
      fromBeginning: true,
    });
    console.log('[Notification Kafka] Subscribed to appointment-created and prescription-created topics.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[Notification Kafka] Received ${topic} event:`, payload);

          if (topic === 'appointment-created') {
            await handleAppointmentCreated(payload);
          } else if (topic === 'prescription-created') {
            await handlePrescriptionCreated(payload);
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
    console.error('[Notification Kafka] Error in consumer:', err.message);
  }
}
