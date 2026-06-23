import express from 'express';
import dotenv from 'dotenv';
import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import { sendPush } from './push.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startNotificationConsumer } from './kafka.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Enable request logging
app.use(requestLogger);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

app.post('/notify/email', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.post('/notify/sms', async (req, res, next) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to and message are required.',
      });
    }

    const result = await sendSMS({ to, message });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/notify/push', async (req, res, next) => {
  try {
    const { userId, title, message } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, and message are required.',
      });
    }

    const result = await sendPush({ userId, title, message });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/notify', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// Enable global error handler (must be placed after all routes)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Notification Service is running on port ${PORT}`);
  startNotificationConsumer().catch((err) => {
    console.error('[Kafka Startup Error] Consumer failed to boot:', err.message);
  });
});

export default app;
