'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrescriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prescriptionId = params.id;

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const monolithUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const prescriptionUrl =
    process.env.NEXT_PUBLIC_PRESCRIPTION_SERVICE_URL || 'http://localhost:3012';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const meRes = await fetch(`${monolithUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (!meRes.ok) {
          throw new Error(meData.message || 'Failed to authenticate user');
        }

        const rxRes = await fetch(`${prescriptionUrl}/prescriptions/${prescriptionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rxData = await rxRes.json();
        if (!rxRes.ok) {
          throw new Error(rxData.message || 'Failed to load prescription');
        }

        setPrescription(rxData.data);
      } catch (err) {
        setError(err.message);
        if (
          err.message.includes('auth') ||
          err.message.includes('token') ||
          err.message.includes('expired')
        ) {
          localStorage.removeItem('token');
          document.cookie =
            'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
          setTimeout(() => router.push('/login'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (prescriptionId) {
      fetchData();
    }
  }, [prescriptionId, router, monolithUrl, prescriptionUrl]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <header style={styles.header}>
        <div style={styles.navWrapper}>
          <div style={styles.logo} onClick={() => router.push('/')}>
            🏥 CareFlow HMS
          </div>
          <nav>
            <ul style={styles.navLinks}>
              <li>
                <Link href="/" style={styles.link}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/prescriptions" style={styles.link}>
                  Prescriptions
                </Link>
              </li>
              <li>
                <Link href="/appointments" style={styles.link}>
                  Appointments
                </Link>
              </li>
              <li>
                <Link href="/profile" style={styles.link}>
                  My Profile
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
        <div style={styles.container}>
          <div style={styles.pageHeader}>
            <div>
              <h1 style={styles.title}>Prescription Details</h1>
              <p style={styles.subtitle}>
                Review medicines prescribed by your doctor and follow the dosage instructions
                carefully.
              </p>
            </div>
            <button onClick={() => router.push('/prescriptions')} style={styles.btnSecondary}>
              ← All Prescriptions
            </button>
          </div>

          {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

          {loading ? (
            <div style={styles.statusContainer}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading prescription...</p>
            </div>
          ) : prescription ? (
            <>
              <div style={styles.summaryCard}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Issued on</span>
                  <span style={styles.summaryValue}>{formatDate(prescription.created_at)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Appointment</span>
                  <span style={styles.summaryValue}>{prescription.appointment_id}</span>
                </div>
                {prescription.notes && (
                  <div style={styles.notesBox}>
                    <strong style={{ color: '#e2e8f0' }}>Doctor&apos;s notes:</strong>
                    <p style={styles.notesText}>{prescription.notes}</p>
                  </div>
                )}
              </div>

              <h2 style={styles.sectionTitle}>Your Medicines</h2>

              {prescription.items?.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <p>No medicines listed on this prescription.</p>
                </div>
              ) : (
                <div style={styles.medicineList}>
                  {prescription.items.map((item) => (
                    <div key={item.id} style={styles.medicineCard}>
                      <div style={styles.medicineHeader}>
                        <h3 style={styles.medicineName}>💊 {item.medicine_name}</h3>
                        <span style={styles.durationBadge}>{item.duration_days} days</span>
                      </div>
                      <div style={styles.medicineDetails}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Dosage</span>
                          <span style={styles.detailValue}>{item.dosage}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Frequency</span>
                          <span style={styles.detailValue}>{item.frequency}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Duration</span>
                          <span style={styles.detailValue}>{item.duration_days} day(s)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.disclaimer}>
                ⚕️ This prescription is for your personal records. Always consult your doctor
                before changing or stopping any medication.
              </div>
            </>
          ) : null}
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
    zIndex: 10,
  },
  navWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: {
    fontSize: '1.35rem',
    fontWeight: 'bold',
    color: '#0ea5e9',
    cursor: 'pointer',
  },
  navLinks: {
    display: 'flex',
    listStyle: 'none',
    gap: '1.5rem',
    margin: 0,
    padding: 0,
  },
  link: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  logoutLink: {
    color: '#ef4444',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  mainContainer: {
    backgroundColor: '#090e1a',
    minHeight: 'calc(100vh - 65px)',
    padding: '3rem 1.5rem',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 0.5rem 0',
    background: 'linear-gradient(135deg, #34d399, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    margin: 0,
    lineHeight: '1.5',
  },
  btnSecondary: {
    padding: '0.6rem 1.25rem',
    borderRadius: '0.375rem',
    border: '1px solid #334155',
    backgroundColor: '#111a2e',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4rem 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(16, 185, 129, 0.1)',
    borderTop: '4px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '2rem',
    color: '#ef4444',
    fontSize: '0.95rem',
  },
  summaryCard: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
  summaryValue: {
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  notesBox: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #1e293b',
  },
  notesText: {
    color: '#94a3b8',
    margin: '0.5rem 0 0',
    lineHeight: '1.6',
  },
  sectionTitle: {
    color: 'white',
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.25rem',
  },
  emptyContainer: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '2rem',
    textAlign: 'center',
    color: '#94a3b8',
  },
  medicineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  medicineCard: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  },
  medicineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  medicineName: {
    color: 'white',
    fontSize: '1.15rem',
    fontWeight: '700',
    margin: 0,
  },
  durationBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  medicineDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailValue: {
    color: '#e2e8f0',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: '0.5rem',
    color: '#fbbf24',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
};
