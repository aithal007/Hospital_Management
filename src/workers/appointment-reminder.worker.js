import { Worker } from 'bullmq';
import { queueConnection } from '../db/queue.js';
import { NOTIFICATION_SERVICE_URL } from '../config/index.js';

async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // If it is a client-side error (400-499), do not retry. Throw immediately.
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Client error: status ${response.status}`);
      }

      // Otherwise it's a server error (500+), trigger retry
      throw new Error(`Server error: status ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      const isLastAttempt = i === retries - 1;
      const isAbort = err.name === 'AbortError';

      // Determine if error is retryable. If it's a client error (does not match Server error or Abort/Network error), we fail immediately.
      const isRetryable = isAbort || err.message.includes('Server error') || err.message.includes('fetch failed') || !err.message.includes('Client error');

      if (isLastAttempt || !isRetryable) {
        throw err;
      }

      console.warn(
        `[Worker] Notification service request failed (${err.message}). Retrying attempt ${i + 2}/${retries} in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

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
      const response = await fetchWithRetry(`${NOTIFICATION_SERVICE_URL}/notify/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mailPayload),
      });

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
