'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillingPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const monolithUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const billingUrl = process.env.NEXT_PUBLIC_BILLING_SERVICE_URL || 'http://localhost:3011';

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
      const userData = meData.data;
      setUser(userData);

      if (userData.role === 'patient' && !userData.patient_profile) {
        setInvoices([]);
        setError('You need a patient profile before viewing invoices. Complete your profile first.');
        return;
      }

      const invoicesRes = await fetch(`${billingUrl}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const invoicesData = await invoicesRes.json();
      if (!invoicesRes.ok) {
        throw new Error(invoicesData.message || 'Failed to retrieve invoices');
      }

      setInvoices(invoicesData.data || []);
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

  useEffect(() => {
    fetchData();
  }, [router]);

  const handlePayInvoice = async (invoice) => {
    setActionLoading(invoice.id);
    setError(null);
    setSuccessMsg(null);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${billingUrl}/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: 'card',
          amount: parseFloat(invoice.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      setSuccessMsg(`Invoice #${invoice.id.slice(0, 8)} marked as paid successfully.`);
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, status: data.data.invoice.status } : inv
        )
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'paid':
        return styles.badgePaid;
      case 'covered':
        return styles.badgeCovered;
      case 'refunded':
        return styles.badgeRefunded;
      case 'pending':
      default:
        return styles.badgePending;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return Number.isNaN(num) ? amount : `$${num.toFixed(2)}`;
  };

  const shortId = (id) => (id ? `${id.slice(0, 8)}…` : '');

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
              <h1 style={styles.title}>Billing & Invoices</h1>
              <p style={styles.subtitle}>
                {user?.role === 'patient' &&
                  'Review consultation charges and pay outstanding invoices.'}
                {['receptionist', 'admin'].includes(user?.role) &&
                  'System-wide invoice dashboard — all patient billing records.'}
              </p>
            </div>
          </div>

          {successMsg && <div style={styles.successAlert}>✅ {successMsg}</div>}
          {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

          {loading ? (
            <div style={styles.statusContainer}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div style={styles.emptyContainer}>
              <h3>No Invoices Found</h3>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
                {user?.role === 'patient'
                  ? 'Invoices appear here after a completed appointment is billed.'
                  : 'No billing records have been created yet.'}
              </p>
              {user?.role === 'patient' && (
                <button onClick={() => router.push('/appointments')} style={styles.btnSecondary}>
                  View My Appointments
                </button>
              )}
            </div>
          ) : (
            <div style={styles.list}>
              {invoices.map((invoice) => (
                <div key={invoice.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.invoiceTitle}>{formatAmount(invoice.amount)}</h3>
                      <div style={styles.detailsRow}>
                        <span style={styles.metaText}>
                          🗓️ Issued {formatDate(invoice.created_at)}
                        </span>
                        <span style={styles.metaText}>
                          📋 Appt {shortId(invoice.appointment_id)}
                        </span>
                        {['receptionist', 'admin'].includes(user?.role) && (
                          <span style={styles.metaText}>
                            👤 Patient {shortId(invoice.patient_id)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={styles.badgeContainer}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...getStatusBadgeStyle(invoice.status),
                        }}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <p style={styles.detailText}>
                      <strong>Invoice ID:</strong> {invoice.id}
                    </p>
                    <p style={styles.detailText}>
                      <strong>Payment status:</strong>{' '}
                      {invoice.status === 'pending' && 'Awaiting payment'}
                      {invoice.status === 'paid' && 'Paid in full'}
                      {invoice.status === 'covered' && 'Covered by insurance'}
                      {invoice.status === 'refunded' && 'Payment refunded'}
                    </p>
                  </div>

                  {user?.role === 'patient' && invoice.status === 'pending' && (
                    <div style={styles.cardFooter}>
                      <p style={styles.payHint}>Mock payment — no real card charged.</p>
                      <button
                        disabled={actionLoading === invoice.id}
                        onClick={() => handlePayInvoice(invoice)}
                        style={styles.btnPay}
                      >
                        {actionLoading === invoice.id ? 'Processing...' : '💳 Pay with Card'}
                      </button>
                    </div>
                  )}
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
    maxWidth: '1000px',
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 0.5rem 0',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    margin: 0,
    lineHeight: '1.5',
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
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '2rem',
    color: '#ef4444',
    fontSize: '0.95rem',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '2rem',
    color: '#10b981',
    fontSize: '0.95rem',
  },
  emptyContainer: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
  },
  btnSecondary: {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #334155',
    backgroundColor: '#090e1a',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1.5rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  invoiceTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 0.5rem 0',
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  badgeContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.35rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  badgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  badgeCovered: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#38bdf8',
    border: '1px solid rgba(14, 165, 233, 0.2)',
  },
  badgeRefunded: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  cardBody: {
    padding: '1.25rem 0',
    borderBottom: '1px solid #1e293b',
  },
  detailText: {
    fontSize: '0.925rem',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 0.5rem 0',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  payHint: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0,
  },
  btnPay: {
    padding: '0.6rem 1.25rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
};
