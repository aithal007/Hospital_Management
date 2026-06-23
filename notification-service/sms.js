/**
 * Sends an SMS (stub provider implementation)
 * @param {Object} options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.message - Message text content
 * @returns {Promise<{success: boolean, id: string}>}
 */
export async function sendSMS({ to, message }) {
  console.log(`============================================================`);
  console.log(`[SMS STUB] Sending SMS`);
  console.log(`To: ${to}`);
  console.log(`Message: ${message}`);
  console.log(`============================================================`);

  return {
    success: true,
    id: 'sms-stub-id-' + Date.now(),
  };
}
