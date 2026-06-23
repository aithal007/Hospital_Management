import { Worker } from 'bullmq';
import { queueConnection } from '../db/queue.js';
import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } from '../config/index.js';

export const appointmentReminderWorker = new Worker(
  'appointment-reminder',
  async (job) => {
    const { appointmentId, patientName, patientEmail, doctorName, date, time } = job.data;
    console.log(`[Worker] Processing appointment reminder job ${job.id} for appointment ${appointmentId}`);

    if (!patientEmail) {
      console.warn(`[Worker] Skipping email for job ${job.id}: No patient email provided.`);
      return { success: false, reason: 'no_email' };
    }

    let transporter;
    try {
      if (!SMTP_USER || SMTP_USER === 'testuser@ethereal.email') {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });
      }
    } catch (err) {
      console.error('[Worker] Failed to initialize Nodemailer transporter:', err.message);
      throw err;
    }

    const mailOptions = {
      from: '"CareFlow HMS" <no-reply@careflowhms.com>',
      to: patientEmail,
      subject: `Upcoming Appointment Reminder - CareFlow HMS`,
      text: `Hello ${patientName},\n\nThis is a friendly reminder that you have an upcoming appointment scheduled with ${doctorName} on ${date} at ${time}.\n\nThank you for choosing CareFlow HMS.`,
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

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Worker] Email sent: ${info.messageId}`);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Worker] Ethereal Preview URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
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
