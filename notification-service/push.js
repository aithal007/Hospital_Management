/**
 * Sends a push notification (stub provider implementation)
 * @param {Object} options
 * @param {string} options.userId - Target user ID to receive the notification
 * @param {string} options.title - Notification title header
 * @param {string} options.message - Notification message content
 * @returns {Promise<{success: boolean, id: string}>}
 */
export async function sendPush({ userId, title, message }) {
  console.log(`============================================================`);
  console.log(`[PUSH STUB] Sending Push Notification`);
  console.log(`To User: ${userId}`);
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log(`============================================================`);

  return {
    success: true,
    id: 'push-stub-id-' + Date.now(),
  };
}
