import { Kafka } from 'kafkajs';
import { KAFKA_BOOTSTRAP_SERVERS } from '../config/index.js';

export const kafka = new Kafka({
  clientId: 'hms-monolith',
  brokers: KAFKA_BOOTSTRAP_SERVERS.split(','),
});

export const producer = kafka.producer();

export async function createTopic(topic) {
  const admin = kafka.admin();
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
      console.log(`[Kafka] Creating topic: ${topic}...`);
      await admin.createTopics({
        topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
      });
      console.log(`[Kafka] Topic '${topic}' created successfully.`);
    } else {
      console.log(`[Kafka] Topic '${topic}' already exists.`);
    }
  } catch (err) {
    console.error(`[Kafka] Failed to create topic '${topic}':`, err.message);
  } finally {
    await admin.disconnect();
  }
}

export async function connectKafka() {
  try {
    console.log(`[Kafka] Connecting to brokers: ${KAFKA_BOOTSTRAP_SERVERS}...`);
    await producer.connect();
    console.log('[Kafka] Producer connected successfully.');
    
    // Explicitly create the topics
    await createTopic('appointment-created');
    await createTopic('appointment-cancelled');
    await createTopic('prescription-created');
    await createTopic('claim-created');
  } catch (err) {
    console.error('[Kafka] Failed to connect producer:', err.message);
  }
}

export async function publishMessage(topic, payload) {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
    console.log(`[Kafka] Message published successfully to topic: ${topic}`);
  } catch (err) {
    console.error(`[Kafka] Failed to publish message to topic ${topic}:`, err.message);
  }
}

