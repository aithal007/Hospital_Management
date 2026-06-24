import { Kafka } from 'kafkajs';
import { sendEmail } from './email.js';
import { prescriptionReminderQueue } from './queues/prescription-reminder.queue.js';
import { getReminderRepeatMs } from './utils/frequency.js';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:29092';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [KAFKA_BROKER].filter(Boolean),
});

export const consumer = kafka.consumer({ groupId: 'notification-service-group' });

async function createTopic(topic) {
  const admin = kafka.admin();
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
      console.log(`[Notification Kafka] Creating topic: ${topic}...`);
      await admin.createTopics({
        topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
      });
      console.log(`[Notification Kafka] Topic '${topic}' created successfully.`);
    }
  } catch (err) {
    console.error(`[Notification Kafka] Failed to create topic '${topic}':`, err.message);
  } finally {
    await admin.disconnect();
  }
}

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

async function handleClaimApproved(payload) {
  const { claim_id, patient_email, amount, appointment_id } = payload;

  if (!patient_email) {
    console.warn('[Notification Kafka] claim-approved: no patient_email in payload, skipping.');
    return;
  }

  const mailPayload = {
    to: patient_email,
    subject: 'Insurance Claim Approved - CareFlow HMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">🎉 Your Insurance Claim Has Been Approved</h2>
        <p>Great news! Your insurance claim has been reviewed and <strong>approved</strong>.</p>
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 5px 0;"><strong>Claim ID:</strong> ${claim_id}</p>
          <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointment_id}</p>
          <p style="margin: 5px 0;"><strong>Approved Amount:</strong> $${parseFloat(amount || 0).toFixed(2)}</p>
        </div>
        <p>Your invoice for the linked appointment has been automatically marked as <strong>covered</strong>. No further payment is required.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.875rem; color: #64748b; text-align: center;">CareFlow HMS</p>
      </div>
    `,
  };

  const result = await sendEmail(mailPayload);
  if (result.success) {
    console.log(`[Notification Kafka] Claim-approved email sent to ${patient_email}`);
  } else {
    console.error(`[Notification Kafka] Failed to send claim-approved email:`, result.error);
  }
}

async function handleClaimRejected(payload) {
  const { claim_id, patient_email, amount, appointment_id } = payload;

  if (!patient_email) {
    console.warn('[Notification Kafka] claim-rejected: no patient_email in payload, skipping.');
    return;
  }

  const mailPayload = {
    to: patient_email,
    subject: 'Insurance Claim Rejected - CareFlow HMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444;">❌ Insurance Claim Update</h2>
        <p>We regret to inform you that your insurance claim has been <strong>rejected</strong> after review.</p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 5px 0;"><strong>Claim ID:</strong> ${claim_id}</p>
          <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointment_id}</p>
          <p style="margin: 5px 0;"><strong>Claimed Amount:</strong> $${parseFloat(amount || 0).toFixed(2)}</p>
        </div>
        <p>Your invoice for the linked appointment remains <strong>unpaid</strong>. Please log in to CareFlow to complete your payment, or contact support if you believe this was an error.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.875rem; color: #64748b; text-align: center;">CareFlow HMS</p>
      </div>
    `,
  };

  const result = await sendEmail(mailPayload);
  if (result.success) {
    console.log(`[Notification Kafka] Claim-rejected email sent to ${patient_email}`);
  } else {
    console.error(`[Notification Kafka] Failed to send claim-rejected email:`, result.error);
  }
}

export async function startNotificationConsumer() {
  try {
    console.log('[Notification Kafka] Connecting consumer...');
    await consumer.connect();
    await createTopic('appointment-created');
    await createTopic('prescription-created');
    await createTopic('claim-created');
    await createTopic('claim-approved');
    await createTopic('claim-rejected');
    await consumer.subscribe({
      topics: ['appointment-created', 'prescription-created', 'claim-approved', 'claim-rejected'],
      fromBeginning: true,
    });
    console.log('[Notification Kafka] Subscribed to appointment-created, prescription-created, claim-approved, claim-rejected topics.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[Notification Kafka] Received ${topic} event:`, payload);

          if (topic === 'appointment-created') {
            await handleAppointmentCreated(payload);
          } else if (topic === 'prescription-created') {
            await handlePrescriptionCreated(payload);
          } else if (topic === 'claim-approved') {
            await handleClaimApproved(payload);
          } else if (topic === 'claim-rejected') {
            await handleClaimRejected(payload);
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
