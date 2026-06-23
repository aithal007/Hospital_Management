import assert from 'assert';

const MONOLITH_URL = 'http://localhost:5000';
const APPOINTMENT_SERVICE_URL = 'http://localhost:3020';
const BILLING_SERVICE_URL = 'http://localhost:3011';

async function runTests() {
  console.log('--- Starting Billing Service POST /invoices Verification Tests ---');

  try {
    // 1. Register or Log in as Receptionist to monolith
    console.log('Logging in as Receptionist...');
    let receptionistToken;
    const loginRes = await fetch(`${MONOLITH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'receptionist@hospital.com', password: 'Password123' }),
    });

    if (loginRes.status === 200) {
      const loginJson = await loginRes.json();
      receptionistToken = loginJson.token;
      console.log('Receptionist logged in successfully.');
    } else {
      console.log('Receptionist login failed or user does not exist. Registering receptionist...');
      const registerRes = await fetch(`${MONOLITH_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'receptionist@hospital.com',
          password: 'Password123',
          first_name: 'Jane',
          last_name: 'Staff',
          role: 'receptionist',
          phone: '555-0199',
        }),
      });
      assert.ok(registerRes.status === 200 || registerRes.status === 201, 'Receptionist registration failed');
      const registerJson = await registerRes.json();
      console.log('Receptionist registered successfully. Logging in...');
      
      const retryLogin = await fetch(`${MONOLITH_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'receptionist@hospital.com', password: 'Password123' }),
      });
      assert.strictEqual(retryLogin.status, 200, 'Failed to log in after registration');
      const retryLoginJson = await retryLogin.json();
      receptionistToken = retryLoginJson.token;
    }

    // 2. Login as Patient to create a new appointment
    console.log('Logging in as Patient to generate appointment...');
    const patientLoginRes = await fetch(`${MONOLITH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@gmail.com', password: 'Password123' }),
    });
    assert.strictEqual(patientLoginRes.status, 200, 'Patient login failed');
    const { token: patientToken } = await patientLoginRes.json();

    // Fetch patient auth details to get profile
    const patientMeRes = await fetch(`${MONOLITH_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${patientToken}` },
    });
    assert.strictEqual(patientMeRes.status, 200, 'Failed to fetch auth details');
    const patientMeData = await patientMeRes.json();
    const patientProfileId = patientMeData.data.patient_profile.id;

    // Fetch Doctor's Profile ID
    console.log('Logging in as Doctor (Alice Smith)...');
    const doctorLoginRes = await fetch(`${MONOLITH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice.smith@hospital.com', password: 'Password123' }),
    });
    assert.strictEqual(doctorLoginRes.status, 200, 'Doctor login failed');
    const doctorMeRes = await fetch(`${MONOLITH_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${(await doctorLoginRes.json()).token}` },
    });
    const doctorProfileId = (await doctorMeRes.json()).data.doctor_profile.id;

    // 3. Book Appointment natively on appointment-service (port 3020)
    console.log('Booking test appointment on port 3020...');
    const bookingRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctor_id: doctorProfileId,
        appointment_date: '2026-08-10',
        start_time: '14:00',
        end_time: '14:30',
        reason: 'Regular consultation',
      }),
    });
    assert.strictEqual(bookingRes.status, 201, 'Appointment booking failed');
    const bookingJson = await bookingRes.json();
    const appointmentId = bookingJson.data.id;
    console.log(`Test appointment created with ID: ${appointmentId}`);

    // 4. Create Invoice on billing-service (port 3011) using Receptionist token
    console.log('Creating invoice manually on port 3011...');
    const invoiceRes = await fetch(`${BILLING_SERVICE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${receptionistToken}`,
      },
      body: JSON.stringify({
        appointment_id: appointmentId,
        amount: 150.00,
      }),
    });
    assert.strictEqual(invoiceRes.status, 201, 'Failed to create manual invoice');
    const invoiceJson = await invoiceRes.json();
    console.log('Invoice created successfully:', invoiceJson);
    assert.strictEqual(invoiceJson.data.appointment_id, appointmentId, 'Mismatched appointment ID');
    assert.strictEqual(invoiceJson.data.patient_id, patientProfileId, 'Mismatched patient ID');
    assert.strictEqual(invoiceJson.data.status, 'pending', 'Invoice status should be pending');
    assert.strictEqual(parseFloat(invoiceJson.data.amount), 150.00, 'Mismatched invoice amount');

    // 5. Test Duplicate Invoice creation conflict (409 Conflict)
    console.log('Testing duplicate invoice creation constraint...');
    const duplicateRes = await fetch(`${BILLING_SERVICE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${receptionistToken}`,
      },
      body: JSON.stringify({
        appointment_id: appointmentId,
        amount: 150.00,
      }),
    });
    assert.strictEqual(duplicateRes.status, 409, 'Duplicate invoice creation did not trigger conflict');
    console.log('Duplicate check passed (409 Conflict received).');

    // 6. Test Non-existent Appointment verification (404 Not Found)
    console.log('Testing non-existent appointment validation...');
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const fakeRes = await fetch(`${BILLING_SERVICE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${receptionistToken}`,
      },
      body: JSON.stringify({
        appointment_id: fakeUuid,
        amount: 100.00,
      }),
    });
    assert.strictEqual(fakeRes.status, 404, 'Non-existent appointment did not return 404');
    console.log('Non-existent check passed (404 Not Found received).');

    // 7. Verify GET /invoices listing (All for receptionist, own for patient)
    console.log('Verifying GET /invoices as Receptionist...');
    const listStaffRes = await fetch(`${BILLING_SERVICE_URL}/invoices`, {
      headers: { 'Authorization': `Bearer ${receptionistToken}` },
    });
    assert.strictEqual(listStaffRes.status, 200);
    const listStaffJson = await listStaffRes.json();
    assert.ok(Array.isArray(listStaffJson.data));
    assert.ok(listStaffJson.data.some(inv => inv.appointment_id === appointmentId));
    console.log(`Receptionist listing check passed. Total: ${listStaffJson.data.length}`);

    console.log('Verifying GET /invoices as Patient...');
    const listPatientRes = await fetch(`${BILLING_SERVICE_URL}/invoices`, {
      headers: { 'Authorization': `Bearer ${patientToken}` },
    });
    assert.strictEqual(listPatientRes.status, 200);
    const listPatientJson = await listPatientRes.json();
    assert.ok(Array.isArray(listPatientJson.data));
    assert.ok(listPatientJson.data.every(inv => inv.patient_id === patientProfileId));
    console.log(`Patient listing check passed. Total: ${listPatientJson.data.length}`);

    // 8. Verify GET /invoices/:id (Details & authorization checks)
    const invoiceId = invoiceJson.data.id;
    console.log(`Verifying GET /invoices/${invoiceId} as Patient...`);
    const detailPatientRes = await fetch(`${BILLING_SERVICE_URL}/invoices/${invoiceId}`, {
      headers: { 'Authorization': `Bearer ${patientToken}` },
    });
    assert.strictEqual(detailPatientRes.status, 200);
    const detailPatientJson = await detailPatientRes.json();
    assert.strictEqual(detailPatientJson.data.id, invoiceId);

    // 9. Verify Kafka Auto-invoice generation on completion
    console.log('Booking a second test appointment to complete...');
    const doctorToken = (await doctorLoginRes.json()).token;
    const bookingRes2 = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctor_id: doctorProfileId,
        appointment_date: '2026-08-11',
        start_time: '15:00',
        end_time: '15:30',
        reason: 'Follow-up consultation',
      }),
    });
    assert.strictEqual(bookingRes2.status, 201);
    const bookingJson2 = await bookingRes2.json();
    const appointmentId2 = bookingJson2.data.id;
    console.log(`Second appointment created: ${appointmentId2}`);

    // Approve the appointment
    console.log('Approving the second appointment...');
    const approveRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId2}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert.strictEqual(approveRes.status, 200);

    // Complete the appointment (triggers Kafka appointment-completed event)
    console.log('Completing the appointment to trigger invoice auto-generation...');
    const completeRes = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId2}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.strictEqual(completeRes.status, 200);

    // Wait 2.5 seconds for consumer to generate invoice
    console.log('Waiting for Kafka consumer to generate invoice...');
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Retrieve invoices and check for the auto-generated invoice
    const finalInvoicesRes = await fetch(`${BILLING_SERVICE_URL}/invoices`, {
      headers: { 'Authorization': `Bearer ${receptionistToken}` },
    });
    const finalInvoices = await finalInvoicesRes.json();
    const autoInv = finalInvoices.data.find(inv => inv.appointment_id === appointmentId2);
    assert.ok(autoInv, 'Auto-generated invoice not found in billing-service!');
    assert.strictEqual(autoInv.status, 'pending');
    assert.strictEqual(parseFloat(autoInv.amount), 100.00);
    console.log('Auto-generated invoice found and validated successfully!');

    // 10. Pay/Settle the auto-generated invoice
    console.log(`Paying the auto-generated invoice ${autoInv.id} via card...`);
    const paymentRes = await fetch(`${BILLING_SERVICE_URL}/invoices/${autoInv.id}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        method: 'card',
        amount: 100.00,
      }),
    });
    assert.strictEqual(paymentRes.status, 200);
    const paymentJson = await paymentRes.json();
    assert.strictEqual(paymentJson.data.invoice.status, 'paid');
    assert.strictEqual(paymentJson.data.payment.method, 'card');
    assert.strictEqual(parseFloat(paymentJson.data.payment.amount), 100.00);
    console.log('Mock payment processed successfully and invoice marked as paid.');

    // 11. Test Refund endpoint
    console.log(`Refunding the invoice ${autoInv.id} as Receptionist...`);
    const refundRes = await fetch(`${BILLING_SERVICE_URL}/invoices/${autoInv.id}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${receptionistToken}`,
      },
    });
    assert.strictEqual(refundRes.status, 200);
    const refundJson = await refundRes.json();
    assert.strictEqual(refundJson.data.invoice.status, 'refunded');
    console.log('Refund processed successfully and invoice marked as refunded.');

    console.log('\n--- All Billing Invoices Verification Tests Passed Successfully! ---');
  } catch (error) {
    console.error('Test validation failed:', error);
    process.exit(1);
  }
}

runTests();


