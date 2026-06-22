'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorIdParam = searchParams.get('doctorId');

  const [user, setUser] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    const initializePage = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // 1. Fetch user to verify patient profile status
        const meRes = await fetch('http://localhost:5000/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const meData = await meRes.json();
        if (!meRes.ok) {
          throw new Error(meData.message || 'Failed to authenticate user.');
        }

        const userData = meData.data;
        setUser(userData);

        if (userData.role !== 'patient') {
          throw new Error('Access denied. Only patients can request appointments from this portal.');
        }

        if (userData.patient_profile) {
          setProfileExists(true);
        } else {
          // Gating: patient has no profile created
          setLoading(false);
          return;
        }

        // 2. Fetch doctors
        const docRes = await fetch('http://localhost:5000/doctors', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const docData = await docRes.json();
        if (!docRes.ok) {
          throw new Error(docData.message || 'Failed to retrieve doctors list.');
        }

        const doctorsList = docData.data || [];
        setDoctors(doctorsList);

        // 3. Resolve selected doctor from query param if available
        if (doctorIdParam) {
          const doc = doctorsList.find(d => d.id === doctorIdParam);
          if (doc) {
            setSelectedDoctor(doc);
            setFormData(prev => ({ ...prev, doctor_id: doc.id }));
          } else {
            // Fetch single doctor if not in lists (backup)
            const singleRes = await fetch(`http://localhost:5000/doctors/${doctorIdParam}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const singleData = await singleRes.json();
            if (singleRes.ok && singleData.data) {
              setSelectedDoctor(singleData.data);
              setFormData(prev => ({ ...prev, doctor_id: singleData.data.id }));
            }
          }
        }
      } catch (err) {
        setError(err.message);
        if (err.message.includes('auth') || err.message.includes('token') || err.message.includes('expired')) {
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
          setTimeout(() => router.push('/login'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [router, doctorIdParam]);

  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    setFormData(prev => ({ ...prev, doctor_id: docId }));
    const doc = doctors.find(d => d.id === docId);
    setSelectedDoctor(doc || null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Format times to HH:MM:00 (some browser time pickers return HH:MM)
    let start = formData.start_time;
    if (start && start.split(':').length === 2) {
      start += ':00';
    }
    let end = formData.end_time;
    if (end && end.split(':').length === 2) {
      end += ':00';
    }

    try {
      const res = await fetch('http://localhost:5000/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: formData.doctor_id,
          appointment_date: formData.appointment_date,
          start_time: start,
          end_time: end,
          reason: formData.reason || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      setSuccessMsg('Appointment requested successfully! Redirecting back to specialists...');
      setTimeout(() => {
        router.push('/doctors');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.statusContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Initializing booking form...</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={styles.mainContainer}>
        <div style={styles.errorAlert}>⚠️ {error}</div>
      </div>
    );
  }

  // Profile Gating: patient has no profile created
  if (user && !profileExists) {
    return (
      <div style={styles.mainContainer}>
        <div style={styles.gatedCard}>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Profile Setup Required</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Before you can schedule appointments with our medical specialists, you must set up your patient clinical profile (including date of birth, gender, address, and insurance detail).
          </p>
          <button onClick={() => router.push('/profile')} style={styles.btnPrimary}>
            Set Up Patient Profile Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h1 style={styles.title}>Book Appointment</h1>
      <p style={styles.subtitle}>Fill in the fields below to request a scheduling slot with a care provider.</p>

      {successMsg && <div style={styles.successAlert}>✅ {successMsg}</div>}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Doctor Selection / display */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Selected Doctor</label>
          {doctorIdParam && selectedDoctor ? (
            <div style={styles.lockedDoctorBox}>
              <h3 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>
                Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
              </h3>
              <p style={{ color: '#38bdf8', fontSize: '0.85rem', margin: 0 }}>
                {selectedDoctor.specialization} &bull; Fee: ${parseFloat(selectedDoctor.consultation_fee).toFixed(2)}
              </p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: 0 }}>
                Selection locked from specialists directory. To change, <Link href="/doctors" style={{ color: '#0ea5e9', textDecoration: 'none' }}>go back to listings</Link>.
              </p>
            </div>
          ) : (
            <select
              name="doctor_id"
              value={formData.doctor_id}
              onChange={handleDoctorChange}
              required
              style={styles.input}
            >
              <option value="">-- Choose a doctor --</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.first_name} {doc.last_name} ({doc.specialization}) - ${parseFloat(doc.consultation_fee).toFixed(2)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date and Times Grid */}
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Appointment Date</label>
            <input
              type="date"
              name="appointment_date"
              value={formData.appointment_date}
              onChange={handleChange}
              required
              style={styles.input}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Start Time</label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>End Time</label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
        </div>

        {/* Reason for booking */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Reason for Visit (Optional)</label>
          <textarea
            name="reason"
            rows="4"
            placeholder="Briefly describe your symptoms or reason for scheduling..."
            value={formData.reason}
            onChange={handleChange}
            style={{ ...styles.input, fontFamily: 'inherit', resize: 'vertical' }}
          ></textarea>
        </div>

        <button type="submit" disabled={submitting} style={styles.btnPrimary}>
          {submitting ? 'Requesting Appointment...' : 'Submit Booking Request'}
        </button>
      </form>
    </div>
  );
}

export default function BookAppointmentPage() {
  const router = useRouter();

  return (
    <>
      <header style={styles.header}>
        <div style={styles.navWrapper}>
          <div style={styles.logo} onClick={() => router.push('/')}>
            🏥 CareFlow HMS
          </div>
          <nav>
            <ul style={styles.navLinks}>
              <li><Link href="/" style={styles.link}>Home</Link></li>
              <li><Link href="/doctors" style={styles.link}>Specialists</Link></li>
              <li><Link href="/profile" style={styles.link}>My Profile</Link></li>
              <li><Link href="/logout" style={styles.logoutLink}>Logout</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.container}>
          <Suspense fallback={
            <div style={styles.statusContainer}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading context...</p>
            </div>
          }>
            <BookingForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}

const styles = {
  header: {
    backgroundColor: '#111a2e',
    borderBottom: '1px solid #1e293b',
    padding: '1rem 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  navWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  logo: {
    fontSize: '1.35rem',
    fontWeight: 'bold',
    color: '#0ea5e9',
    cursor: 'pointer'
  },
  navLinks: {
    display: 'flex',
    listStyle: 'none',
    gap: '1.5rem',
    margin: 0,
    padding: 0
  },
  link: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'color 0.2s'
  },
  logoutLink: {
    color: '#ef4444',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600'
  },
  mainContainer: {
    backgroundColor: '#090e1a',
    minHeight: 'calc(100vh - 65px)',
    padding: '3rem 1.5rem',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    backgroundColor: '#090e1a',
    padding: '3rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(14, 165, 233, 0.1)',
    borderTop: '4px solid #0ea5e9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  card: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '3rem',
    maxWidth: '650px',
    margin: '0 auto',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
  },
  gatedCard: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '3rem',
    maxWidth: '550px',
    margin: '0 auto',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
    color: 'white',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.25rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid #1e293b',
    backgroundColor: '#090e1a',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  lockedDoctorBox: {
    backgroundColor: '#090e1a',
    border: '1px solid #1e293b',
    padding: '1.25rem',
    borderRadius: '0.5rem',
    boxSizing: 'border-box'
  },
  btnPrimary: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: '#0ea5e9',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1.5rem',
    transition: 'background-color 0.2s',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#10b981',
    fontSize: '0.95rem',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#ef4444',
    fontSize: '0.95rem',
  }
};
