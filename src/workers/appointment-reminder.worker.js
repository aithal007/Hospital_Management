import { Worker } from 'bullmq';
import { queueConnection } from '../db/queue.js';
import { NOTIFICATION_SERVICE_URL } from '../config/index.js';

export const appointmentReminderWorker = new Worker(
  'appointment-reminder',
  async (job) => {
    const { appointmentId, patientName, patientEmail, doctorName, date, time } = job.data;
    console.log(
      `[Worker] Processing appointment reminder job ${job.id} for appointment ${appointmentId}`
    );

    if (!patientEmail) {
      console.warn(`[Worker] Skipping email for job ${job.id}: No patient email provided.`);
      return { success: false, reason: 'no_email' };
    }

    const mailPayload = {
      to: patientEmail,
      subject: `Upcoming Appointment Reminder - CareFlow HMS`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0ea5e9;">Appointment Reminder</h2>
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>This is a friendly reminder that you have an upcoming appointment scheduled with <strong>${doctorName}</strong>.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
            <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointmentId}</p>
          </div>
          <p>Please make sure to arrive 10 minutes prior to your scheduled time.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 0.875rem; color: #64748b; text-align: center;">This is an automated email from CareFlow HMS. Please do not reply.</p>
        </div>
      `,
    };

    try {
      const response = await fetch(`${NOTIFICATION_SERVICE_URL}/notify/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mailPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[Worker] Email notification triggered successfully. Message ID: ${result.id}`);
      return { success: true, messageId: result.id };
    } catch (err) {
      console.error('[Worker] Failed to send email via notification service:', err.message);
      throw err; // Trigger retry in BullMQ
    }
  },
  {
    connection: queueConnection,
  }
);

appointmentReminderWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

appointmentReminderWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with error:`, err.message);
});
