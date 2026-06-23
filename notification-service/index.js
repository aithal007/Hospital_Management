import express from 'express';
import dotenv from 'dotenv';
import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import { sendPush } from './push.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

app.post('/notify/email', async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, and html are required.',
    });
  }

  const result = await sendEmail({ to, subject, html });

  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json(result);
});

app.post('/notify/sms', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to and message are required.',
    });
  }

  const result = await sendSMS({ to, message });
  res.json(result);
});

app.post('/notify/push', async (req, res) => {
  const { userId, title, message } = req.body;

  if (!userId || !title || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, title, and message are required.',
    });
  }

  const result = await sendPush({ userId, title, message });
  res.json(result);
});

app.post('/notify', async (req, res) => {
  const { channel, payload } = req.body;

  if (!channel || !payload) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: channel and payload are required.',
    });
  }

  if (channel === 'email') {
    const { to, subject, html } = payload;
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payload fields for email: to, subject, and html are required.',
      });
    }
    const result = await sendEmail({ to, subject, html });
    if (!result.success) return res.status(500).json(result);
    return res.json(result);
  }

  if (channel === 'sms') {
    const { to, message } = payload;
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payload fields for sms: to and message are required.',
      });
    }
    const result = await sendSMS({ to, message });
    return res.json(result);
  }

  if (channel === 'push') {
    const { userId, title, message } = payload;
    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payload fields for push: userId, title, and message are required.',
      });
    }
    const result = await sendPush({ userId, title, message });
    return res.json(result);
  }

  return res.status(400).json({
    success: false,
    error: `Invalid channel: '${channel}'. Supported channels are: email, sms, push.`,
  });
});

app.listen(PORT, () => {
  console.log(`Notification Service is running on port ${PORT}`);
});

export default app;
