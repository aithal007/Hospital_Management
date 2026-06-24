import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:29092';

console.log(`[Inspector] Connecting to Kafka broker at: ${KAFKA_BROKER}`);

const kafka = new Kafka({
  clientId: 'hms-kafka-inspector',
  brokers: [KAFKA_BROKER].filter(Boolean),
});

async function run() {
  const admin = kafka.admin();
  try {
    await admin.connect();
    
    // 1. Fetch Cluster Metadata
    const info = await admin.describeCluster();
    console.log('\n=== Cluster Info ===');
    console.log(`Brokers: ${info.brokers.length}`);
    info.brokers.forEach(b => console.log(`  - Broker ID: ${b.nodeId} (Host: ${b.host}:${b.port})`));
    
    // 2. Fetch Topics
    const topics = await admin.listTopics();
    console.log('\n=== Active Topics ===');
    if (topics.length === 0) {
      console.log('No active topics found.');
    } else {
      topics.forEach(t => console.log(`  - ${t}`));
    }
    
    // 3. Fetch Consumer Groups
    const groups = await admin.listGroups();
    console.log('\n=== Active Consumer Groups ===');
    if (groups.groups.length === 0) {
      console.log('No active consumer groups.');
    } else {
      groups.groups.forEach(g => console.log(`  - Group ID: ${g.groupId} (Protocol: ${g.protocolType})`));
    }
    console.log('\n===================\n');
  } catch (err) {
    console.error('[Inspector Error] Failed to inspect cluster:', err.message);
  } finally {
    await admin.disconnect();
    process.exit(0);
  }
}

run();
