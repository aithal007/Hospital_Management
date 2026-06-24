'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function WritePrescriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [appointment, setAppointment] = useState(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { medicine_name: '', dosage: '', frequency: '', duration_days: 7 },
  ]);

  const monolithUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const appointmentUrl = process.env.NEXT_PUBLIC_APPOINTMENT_SERVICE_URL || 'http://localhost:3020';
  const prescriptionUrl = process.env.NEXT_PUBLIC_PRESCRIPTION_SERVICE_URL || 'http://localhost:3012';

  useEffect(() => {
    if (!appointmentId) {
      setError('No appointment ID provided.');
      setLoading(false);
      return;
    }

    const verifyDoctorAndAppointment = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // 1. Verify that user is a doctor
        const meRes = await fetch(`${monolithUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (!meRes.ok) {
          throw new Error(meData.message || 'Failed to authenticate user');
        }

        if (meData.data.role !== 'doctor') {
          throw new Error('Access denied. Only doctors can write prescriptions.');
        }

        // 2. Fetch appointment details
        const apptRes = await fetch(`${appointmentUrl}/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const apptData = await apptRes.json();
        if (!apptRes.ok) {
          throw new Error(apptData.message || 'Failed to retrieve appointment details');
        }

        const appt = apptData.data;
        if (appt.status !== 'completed') {
          throw new Error(`Prescriptions can only be created for completed appointments (current: '${appt.status}').`);
        }

        setAppointment(appt);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyDoctorAndAppointment();
  }, [appointmentId, router, monolithUrl, appointmentUrl]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { medicine_name: '', dosage: '', frequency: '', duration_days: 7 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [field]: field === 'duration_days' ? parseInt(value, 10) || '' : value,
        };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    // Simple validation
    for (const item of items) {
      if (!item.medicine_name.trim() || !item.dosage.trim() || !item.frequency.trim()) {
        setError('Please fill in all fields (Medicine Name, Dosage, Frequency) for all items.');
        setSubmitLoading(false);
        return;
      }
      if (!item.duration_days || item.duration_days <= 0) {
        setError('Duration must be a positive integer.');
        setSubmitLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${prescriptionUrl}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          notes: notes.trim() || null,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create prescription');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/appointments');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.statusContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading appointment details...</p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorAlert}>⚠️ {error}</div>
        <button onClick={() => router.push('/appointments')} style={styles.btnSecondary}>
          Back to Appointments
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Write Prescription</h1>
      <p style={styles.subtitle}>
        Create a official medical prescription for patient{' '}
        <strong>
          {appointment?.patient_first_name} {appointment?.patient_last_name}
        </strong>
      </p>

      {success && (
        <div style={styles.successAlert}>
          ✅ Prescription created successfully! Redirecting to appointments...
        </div>
      )}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

      <div style={styles.infoCard}>
        <h3>Appointment Summary</h3>
        <p>
          <strong>Reason for Visit:</strong> {appointment?.reason || 'Not specified'}
        </p>
        <p>
          <strong>Date:</strong> {appointment?.appointment_date}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Clinical Notes / Remarks (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.textarea}
            placeholder="E.g., Take medication after meals, return for review if symptoms persist."
            rows={4}
          />
        </div>

        <h3 style={styles.sectionTitle}>Medications</h3>
        {items.map((item, index) => (
          <div key={index} style={styles.itemRow}>
            <div style={styles.rowHeader}>
              <span>Medication #{index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  style={styles.btnRemove}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.smallLabel}>Medicine Name</label>
                <input
                  type="text"
                  value={item.medicine_name}
                  onChange={(e) => handleItemChange(index, 'medicine_name', e.target.value)}
                  style={styles.input}
                  placeholder="e.g. Amoxicillin 500mg"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.smallLabel}>Dosage</label>
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                  style={styles.input}
                  placeholder="e.g. 1 tablet"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.smallLabel}>Frequency</label>
                <input
                  type="text"
                  value={item.frequency}
                  onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                  style={styles.input}
                  placeholder="e.g. 3 times daily"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.smallLabel}>Duration (Days)</label>
                <input
                  type="number"
                  value={item.duration_days}
                  onChange={(e) => handleItemChange(index, 'duration_days', e.target.value)}
                  style={styles.input}
                  min={1}
                  required
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={handleAddItem} style={styles.btnAddItem}>
          ➕ Add Another Medication
        </button>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => router.push('/appointments')}
            style={styles.btnSecondary}
            disabled={submitLoading}
          >
            Cancel
          </button>
          <button type="submit" style={styles.btnSubmit} disabled={submitLoading}>
            {submitLoading ? 'Submitting...' : 'Save & Issue Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function WritePrescriptionPage() {
  return (
    <>
      <header style={styles.header}>
        <div style={styles.navWrapper}>
          <div style={styles.logo}>🏥 CareFlow HMS</div>
          <nav>
            <ul style={styles.navLinks}>
              <li>
                <Link href="/" style={styles.link}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/appointments" style={styles.link}>
                  Appointments
                </Link>
              </li>
              <li>
                <Link href="/logout" style={styles.logoutLink}>
                  Logout
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <Suspense
          fallback={
            <div style={styles.statusContainer}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading form...</p>
            </div>
          }
        >
          <WritePrescriptionForm />
        </Suspense>
      </main>
    </>
  );
}

const styles = {
  header: {
    backgroundColor: '#111a2e',
    borderBottom: '1px solid #1e293b',
    padding: '1rem 2rem',
  },
  navWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: { fontSize: '1.35rem', fontWeight: 'bold', color: '#0ea5e9' },
  navLinks: { display: 'flex', listStyle: 'none', gap: '1.5rem', margin: 0, padding: 0 },
  link: { color: '#94a3b8', textDecoration: 'none' },
  logoutLink: { color: '#ef4444', textDecoration: 'none', fontWeight: '600' },
  mainContainer: {
    backgroundColor: '#090e1a',
    minHeight: 'calc(100vh - 65px)',
    padding: '3rem 1.5rem',
    fontFamily: 'sans-serif',
  },
  container: { maxWidth: '800px', margin: '0 auto' },
  title: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 0.5rem',
    background: 'linear-gradient(135deg, #0ea5e9, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: { color: '#94a3b8', marginBottom: '2rem' },
  infoCard: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.25rem 1.5rem',
    marginBottom: '2rem',
    color: '#e2e8f0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  smallLabel: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  sectionTitle: {
    color: 'white',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '0.5rem',
    marginTop: '1rem',
  },
  itemRow: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '1rem',
  },
  input: {
    backgroundColor: '#090e1a',
    border: '1px solid #334155',
    borderRadius: '0.375rem',
    color: 'white',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    outline: 'none',
  },
  textarea: {
    backgroundColor: '#111a2e',
    border: '1px solid #334155',
    borderRadius: '0.375rem',
    color: 'white',
    padding: '0.75rem',
    fontSize: '0.95rem',
    outline: 'none',
    resize: 'vertical',
  },
  btnAddItem: {
    backgroundColor: 'transparent',
    border: '1px dashed #0ea5e9',
    color: '#0ea5e9',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnRemove: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  btnSecondary: {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnSubmit: {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(14, 165, 233, 0.1)',
    borderTop: '4px solid #0ea5e9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '2rem 0',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: '#ef4444',
    width: '100%',
    textAlign: 'center',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: '#10b981',
    marginBottom: '1.5rem',
  },
};
