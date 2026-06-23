import assert from 'assert';

const MONOLITH_URL = 'http://localhost:5000';
const APPOINTMENT_SERVICE_URL = 'http://localhost:3020';

async function runTests() {
  console.log('--- Starting Endpoint Verification Tests ---');

  try {
    // 0. Verify health endpoint
    console.log('Verifying /health endpoint on appointment-service...');
    const healthRes = await fetch(`${APPOINTMENT_SERVICE_URL}/health`);
    assert.strictEqual(healthRes.status, 200, 'Health check failed');
    const healthJson = await healthRes.json();
    console.log('Health Check response:', JSON.stringify(healthJson, null, 2));
    assert.strictEqual(healthJson.status, 'UP', 'Service status should be UP');
    assert.strictEqual(healthJson.services.database.status, 'UP', 'Database status should be UP');
    assert.strictEqual(healthJson.services.redis.status, 'UP', 'Redis status should be UP');
    console.log('/health endpoint verified successfully.');

    // 1. Login as Patient
    console.log('Logging in as Patient (John Doe)...');
    const patientLoginRes = await fetch(`${MONOLITH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@gmail.com', password: 'Password123' }),
    });
    assert.strictEqual(patientLoginRes.status, 200, 'Patient login failed');
    const { token: patientToken } = await patientLoginRes.json();
    console.log('Logged in successfully. Token obtained.');

    // 2. Fetch profile details via Monolith's /auth/me
    console.log('Fetching patient profile details...');
    const patientMeRes = await fetch(`${MONOLITH_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${patientToken}` },
    });
    assert.strictEqual(patientMeRes.status, 200, 'Failed to fetch auth details');
    const patientMeData = await patientMeRes.json();
    const patientProfileId = patientMeData.data.patient_profile.id;
    console.log(`Patient Profile ID resolved: ${patientProfileId}`);

    // 3. Login as Doctor to get Doctor's Profile ID
    console.log('Logging in as Doctor (Alice Smith)...');
    const doctorLoginRes = await fetch(`${MONOLITH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice.smith@hospital.com', password: 'Password123' }),
    });
    assert.strictEqual(doctorLoginRes.status, 200, 'Doctor login failed');
    const { token: doctorToken } = await doctorLoginRes.json();

    console.log('Fetching doctor profile details...');
    const doctorMeRes = await fetch(`${MONOLITH_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` },
    });
    assert.strictEqual(doctorMeRes.status, 200, 'Failed to fetch doctor details');
    const doctorMeData = await doctorMeRes.json();
    const doctorProfileId = doctorMeData.data.doctor_profile.id;
    console.log(`Doctor Profile ID resolved: ${doctorProfileId}`);

    // 4. Book Appointment natively on appointment-service (port 3020)
    console.log('Booking appointment natively on port 3020...');
    const bookingRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctor_id: doctorProfileId,
        appointment_date: '2026-07-20',
        start_time: '10:00',
        end_time: '10:30',
        reason: 'Regular cardiology checkup',
      }),
    });
    const bookingJson = await bookingRes.json();
    console.log('Booking response:', bookingJson);
    assert.strictEqual(bookingRes.status, 201, 'Appointment booking failed');
    const appointmentId = bookingJson.data.id;
    console.log(`Appointment created successfully with ID: ${appointmentId}`);

    // 5. List Appointments natively on port 3020
    console.log('Listing appointments on port 3020...');
    const listRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments`, {
      headers: { 'Authorization': `Bearer ${patientToken}` },
    });
    assert.strictEqual(listRes.status, 200, 'Failed to list appointments');
    const listJson = await listRes.json();
    console.log(`Retrieved ${listJson.data.length} appointments. Enriched successfully.`);
    const createdAppt = listJson.data.find(a => a.id === appointmentId);
    assert.ok(createdAppt, 'Created appointment not found in list');
    assert.strictEqual(createdAppt.patient_first_name, 'John');
    assert.strictEqual(createdAppt.doctor_first_name, 'Alice');

    // 6. Update status to Approved (using Doctor Token)
    console.log('Updating appointment status to approved (Doctor approval)...');
    const approveRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert.strictEqual(approveRes.status, 200, 'Failed to approve appointment');
    console.log('Appointment approved successfully.');

    // 7. Cancel the appointment to clean up
    console.log('Cancelling appointment to clean up...');
    const cancelRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert.strictEqual(cancelRes.status, 200, 'Failed to cancel appointment');
    console.log('Appointment cancelled successfully.');

    console.log('\n--- All Endpoint Verification Tests Passed Successfully! ---');
  } catch (error) {
    console.error('Test validation failed:', error);
    process.exit(1);
  }
}

runTests();
