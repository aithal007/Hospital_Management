import invoicesRepository from './invoices.repository.js';
import paymentsRepository from './payments.repository.js';
import { billGenerationQueue } from '../../queues/bill-generation.queue.js';

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3020';
const coreAppUrl = process.env.CORE_APP_URL || 'http://localhost:5000';

const fetchFromMonolith = async (path, token) => {
  const response = await fetch(`${coreAppUrl}${path}`, {
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.message || `Monolith request failed with status ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const body = await response.json();
  return body.data;
};

const resolvePatientProfileId = async (user, authToken) => {
  if (user.profileId) return user.profileId;
  if (!authToken || user.role !== 'patient') return null;

  const profile = await fetchFromMonolith('/auth/me', authToken);
  return profile?.patient_profile?.id ?? null;
};

export const createInvoice = async ({ appointmentId, amount, token }) => {
  // 1. Check if invoice already exists for this appointment
  const existingInvoice = await invoicesRepository.findByAppointmentId(appointmentId);
  if (existingInvoice) {
    const error = new Error('An invoice has already been generated for this appointment');
    error.statusCode = 409;
    throw error;
  }

  // 2. Fetch appointment details from appointment-service to validate existence and resolve patient_id
  let appointment;
  try {
    const response = await fetch(`${APPOINTMENT_SERVICE_URL}/appointments/${appointmentId}`, {
      headers: {
        'Authorization': token, // Forward the authentication token
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        const error = new Error('Appointment not found');
        error.statusCode = 404;
        throw error;
      }
      const errorText = await response.text();
      throw new Error(`Failed to verify appointment details: ${errorText}`);
    }

    const apptJson = await response.json();
    appointment = apptJson.data;
  } catch (error) {
    if (error.statusCode) throw error;
    const wrapError = new Error(`Connection to appointment-service failed: ${error.message}`);
    wrapError.statusCode = 503;
    throw wrapError;
  }

  // 3. Extract patient ID
  const patientId = appointment.patient_id;
  if (!patientId) {
    const error = new Error('Resolved appointment has no valid patient profile identifier');
    error.statusCode = 422;
    throw error;
  }

  // 4. Create the pending invoice record
  const invoice = await invoicesRepository.create({
    appointment_id: appointmentId,
    patient_id: patientId,
    amount,
    status: 'pending',
  });

  return invoice;
};

export const createInvoiceFromEvent = async ({ appointmentId, patientId, amount = 100.00 }) => {
  // 1. Check if invoice already exists for this appointment
  const existingInvoice = await invoicesRepository.findByAppointmentId(appointmentId);
  if (existingInvoice) {
    console.log(`[Billing Service] Invoice already exists for appointment ${appointmentId}. Skipping.`);
    return existingInvoice;
  }

  // 2. Create the pending invoice record directly using data from the Kafka event
  const invoice = await invoicesRepository.create({
    appointment_id: appointmentId,
    patient_id: patientId,
    amount,
    status: 'pending',
  });

  console.log(`[Billing Service] Auto-generated pending invoice ${invoice.id} for patient ${patientId}`);
  return invoice;
};

export const getInvoices = async ({ user, authToken }) => {
  if (user.role === 'patient') {
    const patientProfileId = await resolvePatientProfileId(user, authToken);
    if (!patientProfileId) {
      return [];
    }
    return await invoicesRepository.findByPatientId(patientProfileId);
  }

  // Admins and receptionists see all invoices
  return await invoicesRepository.findAllOrderedByDate();
};

export const getInvoiceById = async (id, { user, authToken }) => {
  const invoice = await invoicesRepository.findById(id);
  if (!invoice) {
    const error = new Error('Invoice not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'patient') {
    const patientProfileId = await resolvePatientProfileId(user, authToken);
    if (!patientProfileId || invoice.patient_id !== patientProfileId) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }
  }

  return invoice;
};

export const processInvoicePayment = async (invoiceId, { method, amount, user, authToken }) => {
  // 1. Get the invoice and verify it exists
  const invoice = await invoicesRepository.findById(invoiceId);
  if (!invoice) {
    const error = new Error('Invoice not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Access control: Patients can only pay their own invoices
  if (user.role === 'patient') {
    const patientProfileId = await resolvePatientProfileId(user, authToken);
    if (!patientProfileId || invoice.patient_id !== patientProfileId) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      throw error;
    }
  }

  // 3. Verify that invoice is pending
  if (invoice.status !== 'pending') {
    const error = new Error(`Invoice cannot be paid because it is currently '${invoice.status}'`);
    error.statusCode = 400;
    throw error;
  }

  // 4. Create the transaction record
  const payment = await paymentsRepository.create({
    invoice_id: invoiceId,
    amount,
    method,
  });

  // 5. Update invoice status
  const nextStatus = method === 'insurance' ? 'covered' : 'paid';
  const updatedInvoice = await invoicesRepository.update(invoiceId, { status: nextStatus });

  // 6. Enqueue PDF bill generation job
  await billGenerationQueue.add('generate-pdf', {
    invoiceId: updatedInvoice.id,
    appointmentId: updatedInvoice.appointment_id,
    patientName: `Patient #${updatedInvoice.patient_id}`,
    doctorName: 'General Staff',
    consultationFee: updatedInvoice.amount,
    date: new Date(updatedInvoice.created_at).toLocaleDateString(),
    status: updatedInvoice.status,
  });
  console.log(`[Billing] PDF generation queued for invoice ${updatedInvoice.id}`);

  return { payment, invoice: updatedInvoice };
};

export const processInvoiceRefund = async (invoiceId, { user }) => {
  // 1. Get the invoice and verify it exists
  const invoice = await invoicesRepository.findById(invoiceId);
  if (!invoice) {
    const error = new Error('Invoice not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify invoice status is 'paid' or 'covered' before allowing refund
  if (!['paid', 'covered'].includes(invoice.status)) {
    const error = new Error(`Invoice cannot be refunded because its status is '${invoice.status}'`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Find associated payment records
  const payments = await paymentsRepository.findByInvoiceId(invoiceId);
  if (payments.length === 0) {
    const error = new Error('No payment records found to refund for this invoice');
    error.statusCode = 400;
    throw error;
  }

  // Find the active payment (status = 'completed')
  const activePayment = payments.find(p => p.status === 'completed' || !p.status);
  if (!activePayment) {
    const error = new Error('No active completed payment found to refund');
    error.statusCode = 400;
    throw error;
  }

  // 4. Update the payment status to 'refunded'
  await paymentsRepository.update(activePayment.id, { status: 'refunded' });

  // 5. Update the invoice status to 'refunded'
  const updatedInvoice = await invoicesRepository.update(invoiceId, { status: 'refunded' });

  return { invoice: updatedInvoice };
};
