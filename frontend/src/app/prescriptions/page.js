'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrescriptionsListPage() {
  const router = useRouter();

  const [prescriptions, setPrescriptions] = useState([]);
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

        if (meData.data.role !== 'patient') {
          setError('This page is for patients to view their prescriptions.');
          return;
        }

        const rxRes = await fetch(`${prescriptionUrl}/prescriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rxData = await rxRes.json();
        if (!rxRes.ok) {
          throw new Error(rxData.message || 'Failed to load prescriptions');
        }

        setPrescriptions(rxData.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, monolithUrl, prescriptionUrl]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
              <li><Link href="/" style={styles.link}>Home</Link></li>
              <li><Link href="/appointments" style={styles.link}>Appointments</Link></li>
              <li><Link href="/profile" style={styles.link}>My Profile</Link></li>
              <li><Link href="/logout" style={styles.logoutLink}>Logout</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.container}>
          <h1 style={styles.title}>My Prescriptions</h1>
          <p style={styles.subtitle}>Select a prescription to view your medicines.</p>

          {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading...</p>
          ) : prescriptions.length === 0 ? (
            <div style={styles.empty}>No prescriptions yet.</div>
          ) : (
            <div style={styles.list}>
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  style={styles.card}
                  onClick={() => router.push(`/prescriptions/${rx.id}`)}
                >
                  <div>
                    <strong style={{ color: 'white' }}>
                      {rx.items?.length || 0} medicine(s)
                    </strong>
                    <p style={styles.date}>Issued {formatDate(rx.created_at)}</p>
                  </div>
                  <span style={styles.viewLink}>View →</span>
                </div>
              ))}
            </div>
          )}
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
  },
  navWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: { fontSize: '1.35rem', fontWeight: 'bold', color: '#0ea5e9', cursor: 'pointer' },
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
    fontSize: '2rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 0.5rem',
    background: 'linear-gradient(135deg, #34d399, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: { color: '#94a3b8', marginBottom: '2rem' },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#ef4444',
  },
  empty: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '3rem',
    textAlign: 'center',
    color: '#94a3b8',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  date: { color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0' },
  viewLink: { color: '#38bdf8', fontWeight: '600' },
};
