import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafkaBootstrapServers = process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:29092';

export const kafka = new Kafka({
  clientId: 'insurance-service',
  brokers: kafkaBootstrapServers.split(','),
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
    console.log(`[Kafka] Connecting to brokers: ${kafkaBootstrapServers}...`);
    await producer.connect();
    console.log('[Kafka] Producer connected successfully.');
    await createTopic('claim-created');
    await createTopic('claim-approved');
    await createTopic('claim-rejected');
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
    console.log(`[Kafka] Message published to topic: ${topic}`);
  } catch (err) {
    console.error(`[Kafka] Failed to publish to topic ${topic}:`, err.message);
  }
}
