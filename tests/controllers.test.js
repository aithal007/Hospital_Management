import test from 'node:test';
import assert from 'node:assert';
import pool from '../src/db/index.js';
import { createPatientProfile } from '../src/modules/patients/patients.controller.js';
import { getDoctorById } from '../src/modules/doctors/doctors.controller.js';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
} from '../src/modules/appointments/appointments.controller.js';
import { validate } from '../src/middleware/validate.js';
import {
  appointmentCreateSchema,
  appointmentUpdateStatusSchema,
} from '../src/modules/appointments/appointments.routes.js';

// Save the original pool query function to restore after mock tests
const originalQuery = pool.query;

test.describe('Patient Controller Tests', () => {
  test.afterEach(() => {
    // Restore original DB query method
    pool.query = originalQuery;
  });

  test('createPatientProfile - successful patient profile creation', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      date_of_birth: '1995-05-15',
      gender: 'Female',
      address: '123 Main St',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    const next = () => {};

    // Mock DB queries inside controller:
    // Query 1: checks existing profile -> returns empty rows
    // Query 2: inserts profile -> returns created profile
    let queryCallCount = 0;
    pool.query = async (text, params) => {
      queryCallCount++;
      if (queryCallCount === 1) {
        return { rows: [] };
      }
      if (queryCallCount === 2) {
        return {
          rows: [
            {
              id: 'new-profile-uuid',
              user_id: 'patient-user-uuid',
              date_of_birth: '1995-05-15',
              gender: 'Female',
              address: '123 Main St',
            },
          ],
        };
      }
    };

    await createPatientProfile(req, res, next);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.id, 'new-profile-uuid');
    assert.strictEqual(res.body.data.user_id, 'patient-user-uuid');
  });

  test('createPatientProfile - deny if patient tries to create profile for someone else', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      user_id: 'someone-else-uuid',
      date_of_birth: '1995-05-15',
      gender: 'Female',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    await createPatientProfile(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /Access denied/);
  });
});

test.describe('Doctor Controller Tests', () => {
  test.afterEach(() => {
    // Restore original DB query method
    pool.query = originalQuery;
  });

  test('getDoctorById - returns doctor profile details if it exists', async () => {
    const req = {
      params: { id: 'doctor-profile-uuid' },
      user: { id: 'patient-uuid', role: 'patient' },
    };

    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    const next = () => {};

    pool.query = async (text, params) => {
      return {
        rows: [
          {
            id: 'doctor-profile-uuid',
            user_id: 'doctor-user-uuid',
            first_name: 'John',
            last_name: 'Smith',
            specialization: 'Cardiology',
            consultation_fee: '150.00',
          },
        ],
      };
    };

    await getDoctorById(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.specialization, 'Cardiology');
  });

  test('getDoctorById - returns 404 error if doctor profile does not exist', async () => {
    const req = {
      params: { id: 'non-existent-uuid' },
      user: { id: 'patient-uuid', role: 'patient' },
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      return { rows: [] };
    };

    await getDoctorById(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 404);
    assert.match(errorPassed.message, /Doctor profile not found/);
  });
});

test.describe('Appointment Controller Tests', () => {
  test.afterEach(() => {
    // Restore original DB query method
    pool.query = originalQuery;
  });

  test('createAppointment - successful appointment creation by patient', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
      reason: 'Regular Checkup',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    const next = () => {};

    // Mock DB queries inside controller:
    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
      if (text.includes('FROM appointments') && text.includes('doctor_id =')) {
        return { rows: [] }; // No doctor overlap
      }
      if (text.includes('FROM appointments') && text.includes('patient_id =')) {
        return { rows: [] }; // No patient overlap
      }
      if (text.includes('INSERT INTO appointments')) {
        return {
          rows: [
            {
              id: 'new-appointment-uuid',
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              appointment_date: '2026-07-01',
              start_time: '10:00:00',
              end_time: '11:00:00',
              status: 'pending',
              reason: 'Regular Checkup',
            },
          ],
        };
      }
    };

    await createAppointment(req, res, next);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.id, 'new-appointment-uuid');
    assert.strictEqual(res.body.data.patient_id, 'patient-profile-uuid');
  });

  test('createAppointment - failed appointment creation by patient if profile does not exist', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [] }; // Profile does not exist
      }
    };

    await createAppointment(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 400);
    assert.match(errorPassed.message, /Patient profile must be created/);
  });

  test('createAppointment - failed appointment creation by patient if trying to book for someone else', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      patient_id: 'someone-else-profile-uuid',
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
    };

    await createAppointment(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /Patients can only book appointments for themselves/);
  });

  test('createAppointment - successful appointment creation by receptionist', async () => {
    const mockUser = { id: 'staff-user-uuid', role: 'receptionist' };
    const mockBody = {
      patient_id: 'target-patient-profile-uuid',
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
      reason: 'Booked by staff',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'target-patient-profile-uuid' }] };
      }
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
      if (text.includes('FROM appointments') && text.includes('doctor_id =')) {
        return { rows: [] }; // No doctor overlap
      }
      if (text.includes('FROM appointments') && text.includes('patient_id =')) {
        return { rows: [] }; // No patient overlap
      }
      if (text.includes('INSERT INTO appointments')) {
        return {
          rows: [
            {
              id: 'new-appointment-uuid',
              patient_id: 'target-patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              appointment_date: '2026-07-01',
              start_time: '10:00:00',
              end_time: '11:00:00',
              status: 'pending',
              reason: 'Booked by staff',
            },
          ],
        };
      }
    };

    await createAppointment(req, res, next);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.patient_id, 'target-patient-profile-uuid');
  });

  test('createAppointment - denied access for doctors', async () => {
    const mockUser = { id: 'doctor-user-uuid', role: 'doctor' };
    const mockBody = {
      patient_id: 'target-patient-profile-uuid',
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    await createAppointment(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /Insufficient permissions/);
  });

  test('createAppointment - invalid time range (start_time >= end_time)', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '11:00:00',
      end_time: '10:00:00',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
    };

    await createAppointment(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 400);
    assert.match(errorPassed.message, /Start time must be before end time/);
  });

  test('createAppointment - doctor overlap validation (returns 409)', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
      if (text.includes('FROM appointments') && text.includes('doctor_id =')) {
        return { rows: [{ id: 'overlapping-appointment-uuid' }] }; // Overlap exists!
      }
    };

    await createAppointment(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 409);
    assert.match(errorPassed.message, /The doctor is not available/);
  });

  test('createAppointment - patient overlap validation (returns 409)', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      doctor_id: 'doctor-profile-uuid',
      appointment_date: '2026-07-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
      if (text.includes('FROM appointments') && text.includes('doctor_id =')) {
        return { rows: [] }; // Doctor is free
      }
      if (text.includes('FROM appointments') && text.includes('patient_id =')) {
        return { rows: [{ id: 'overlapping-appointment-uuid' }] }; // Patient is busy!
      }
    };

    await createAppointment(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 409);
    assert.match(errorPassed.message, /The patient already has another appointment/);
  });

  test('getAppointments - patient lists their own appointments', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const req = { user: mockUser };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
      if (text.includes('FROM appointments')) {
        // Ensure patient filter was added
        assert.ok(text.includes('a.patient_id = $1'));
        assert.strictEqual(params[0], 'patient-profile-uuid');
        return {
          rows: [
            {
              id: 'appointment-1-uuid',
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              appointment_date: '2026-07-01',
              patient_first_name: 'Jane',
              doctor_first_name: 'John',
            },
          ],
        };
      }
    };

    await getAppointments(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 'appointment-1-uuid');
  });

  test('getAppointments - doctor lists their own appointments', async () => {
    const mockUser = { id: 'doctor-user-uuid', role: 'doctor' };
    const req = { user: mockUser };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
      if (text.includes('FROM appointments')) {
        // Ensure doctor filter was added
        assert.ok(text.includes('a.doctor_id = $1'));
        assert.strictEqual(params[0], 'doctor-profile-uuid');
        return {
          rows: [
            {
              id: 'appointment-1-uuid',
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              appointment_date: '2026-07-01',
              patient_first_name: 'Jane',
              doctor_first_name: 'John',
            },
          ],
        };
      }
    };

    await getAppointments(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 'appointment-1-uuid');
  });

  test('getAppointments - receptionist lists all appointments', async () => {
    const mockUser = { id: 'staff-user-uuid', role: 'receptionist' };
    const req = { user: mockUser };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM appointments')) {
        // Ensure no filter is applied
        assert.ok(!text.includes('WHERE'));
        return {
          rows: [{ id: 'appt-1' }, { id: 'appt-2' }],
        };
      }
    };

    await getAppointments(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.length, 2);
  });

  test('getAppointments - access denied for insurance agents', async () => {
    const mockUser = { id: 'insurance-user-uuid', role: 'insurance_agent' };
    const req = { user: mockUser };
    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    await getAppointments(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /Insufficient permissions/);
  });

  test('getAppointmentById - patient retrieves their own appointment', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const req = { params: { id: 'appointment-uuid' }, user: mockUser };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
            },
          ],
        };
      }
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
    };

    await getAppointmentById(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.id, 'appointment-uuid');
  });

  test("getAppointmentById - patient denied retrieving another patient's appointment", async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const req = { params: { id: 'appointment-uuid' }, user: mockUser };
    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('FROM appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              patient_id: 'different-patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
            },
          ],
        };
      }
      if (text.includes('FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
    };

    await getAppointmentById(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /You do not have permission/);
  });

  test('getAppointmentById - doctor retrieves their assigned appointment', async () => {
    const mockUser = { id: 'doctor-user-uuid', role: 'doctor' };
    const req = { params: { id: 'appointment-uuid' }, user: mockUser };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
            },
          ],
        };
      }
      if (text.includes('FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
    };

    await getAppointmentById(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.id, 'appointment-uuid');
  });

  test('getAppointmentById - receptionist retrieves any appointment', async () => {
    const mockUser = { id: 'staff-user-uuid', role: 'receptionist' };
    const req = { params: { id: 'appointment-uuid' }, user: mockUser };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('FROM appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
            },
          ],
        };
      }
    };

    await getAppointmentById(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.id, 'appointment-uuid');
  });

  test('getAppointmentById - returns 404 if appointment not found', async () => {
    const req = { params: { id: 'non-existent-uuid' }, user: { role: 'receptionist' } };
    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      return { rows: [] };
    };

    await getAppointmentById(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 404);
    assert.match(errorPassed.message, /Appointment not found/);
  });

  test('updateAppointmentStatus - patient cancels their own appointment', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const req = {
      params: { id: 'appointment-uuid' },
      body: { status: 'cancelled' },
      user: mockUser,
    };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('SELECT patient_id, doctor_id, status FROM appointments')) {
        return {
          rows: [
            {
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              status: 'pending',
            },
          ],
        };
      }
      if (text.includes('SELECT id FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
      if (text.includes('UPDATE appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              status: 'cancelled',
            },
          ],
        };
      }
    };

    await updateAppointmentStatus(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.status, 'cancelled');
  });

  test('updateAppointmentStatus - patient blocked from setting status to approved', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const req = {
      params: { id: 'appointment-uuid' },
      body: { status: 'approved' },
      user: mockUser,
    };
    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('SELECT patient_id, doctor_id, status FROM appointments')) {
        return {
          rows: [
            {
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              status: 'pending',
            },
          ],
        };
      }
      if (text.includes('SELECT id FROM patients')) {
        return { rows: [{ id: 'patient-profile-uuid' }] };
      }
    };

    await updateAppointmentStatus(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /Patients can only cancel/);
  });

  test('updateAppointmentStatus - doctor approves their assigned appointment', async () => {
    const mockUser = { id: 'doctor-user-uuid', role: 'doctor' };
    const req = {
      params: { id: 'appointment-uuid' },
      body: { status: 'approved' },
      user: mockUser,
    };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('SELECT patient_id, doctor_id, status FROM appointments')) {
        return {
          rows: [
            {
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              status: 'pending',
            },
          ],
        };
      }
      if (text.includes('SELECT id FROM doctors')) {
        return { rows: [{ id: 'doctor-profile-uuid' }] };
      }
      if (text.includes('UPDATE appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              status: 'approved',
            },
          ],
        };
      }
    };

    await updateAppointmentStatus(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.status, 'approved');
  });

  test('updateAppointmentStatus - receptionist cancels any appointment', async () => {
    const mockUser = { id: 'staff-user-uuid', role: 'receptionist' };
    const req = {
      params: { id: 'appointment-uuid' },
      body: { status: 'cancelled' },
      user: mockUser,
    };
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    const next = () => {};

    pool.query = async (text, params) => {
      if (text.includes('SELECT patient_id, doctor_id, status FROM appointments')) {
        return {
          rows: [
            {
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              status: 'pending',
            },
          ],
        };
      }
      if (text.includes('UPDATE appointments')) {
        return {
          rows: [
            {
              id: 'appointment-uuid',
              status: 'cancelled',
            },
          ],
        };
      }
    };

    await updateAppointmentStatus(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.status, 'cancelled');
  });

  test('updateAppointmentStatus - blocked update of completed appointment', async () => {
    const mockUser = { id: 'staff-user-uuid', role: 'receptionist' };
    const req = {
      params: { id: 'appointment-uuid' },
      body: { status: 'cancelled' },
      user: mockUser,
    };
    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      if (text.includes('SELECT patient_id, doctor_id, status FROM appointments')) {
        return {
          rows: [
            {
              patient_id: 'patient-profile-uuid',
              doctor_id: 'doctor-profile-uuid',
              status: 'completed',
            },
          ],
        };
      }
    };

    await updateAppointmentStatus(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 400);
    assert.match(errorPassed.message, /Cannot update status of a completed/);
  });
});

test.describe('Appointment Validation Middleware Tests', () => {
  test('validate - passes with correct appointment creation payload', () => {
    const middleware = validate(appointmentCreateSchema);
    const req = {
      body: {
        doctor_id: '8a5f6e80-7164-4e20-9426-302ef36ee7bf',
        appointment_date: '2026-07-01',
        start_time: '10:00:00',
        end_time: '11:00:00',
        reason: 'Regular Checkup',
      },
    };
    let nextCalled = false;
    let errorPassed = null;
    const next = (err) => {
      nextCalled = true;
      errorPassed = err;
    };
    middleware(req, {}, next);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(errorPassed, undefined);
  });

  test('validate - fails with invalid date format', () => {
    const middleware = validate(appointmentCreateSchema);
    const req = {
      body: {
        doctor_id: '8a5f6e80-7164-4e20-9426-302ef36ee7bf',
        appointment_date: '07-01-2026', // wrong format (must be YYYY-MM-DD)
        start_time: '10:00:00',
        end_time: '11:00:00',
      },
    };
    let nextCalled = false;
    let errorPassed = null;
    const next = (err) => {
      nextCalled = true;
      errorPassed = err;
    };
    middleware(req, {}, next);
    assert.strictEqual(nextCalled, true);
    assert.ok(errorPassed);
    assert.strictEqual(errorPassed.name, 'ZodError');
  });

  test('validate - fails with invalid UUID format for doctor_id', () => {
    const middleware = validate(appointmentCreateSchema);
    const req = {
      body: {
        doctor_id: 'invalid-uuid-format',
        appointment_date: '2026-07-01',
        start_time: '10:00:00',
        end_time: '11:00:00',
      },
    };
    let nextCalled = false;
    let errorPassed = null;
    const next = (err) => {
      nextCalled = true;
      errorPassed = err;
    };
    middleware(req, {}, next);
    assert.strictEqual(nextCalled, true);
    assert.ok(errorPassed);
    assert.strictEqual(errorPassed.name, 'ZodError');
  });

  test('validate - passes with correct status update payload', () => {
    const middleware = validate(appointmentUpdateStatusSchema);
    const req = {
      params: { id: '8a5f6e80-7164-4e20-9426-302ef36ee7bf' },
      body: { status: 'approved' },
    };
    let nextCalled = false;
    let errorPassed = null;
    const next = (err) => {
      nextCalled = true;
      errorPassed = err;
    };
    middleware(req, {}, next);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(errorPassed, undefined);
  });

  test('validate - fails with invalid status value', () => {
    const middleware = validate(appointmentUpdateStatusSchema);
    const req = {
      params: { id: '8a5f6e80-7164-4e20-9426-302ef36ee7bf' },
      body: { status: 'invalid-status' },
    };
    let nextCalled = false;
    let errorPassed = null;
    const next = (err) => {
      nextCalled = true;
      errorPassed = err;
    };
    middleware(req, {}, next);
    assert.strictEqual(nextCalled, true);
    assert.ok(errorPassed);
    assert.strictEqual(errorPassed.name, 'ZodError');
  });
});
