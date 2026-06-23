import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Sends an email using Resend
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('[Notification Service] Resend is not configured. Simulating email dispatch:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Length: ${html.length} chars`);
    return { success: true, id: 'stub-id-' + Date.now() };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'CareFlow HMS <onboarding@resend.dev>', // Default Resend verified sending domain for testing
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Notification Service] Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Notification Service] Email sent successfully via Resend. ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[Notification Service] Email dispatch crashed:', err.message);
    return { success: false, error: err.message };
  }
}
