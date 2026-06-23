'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AppointmentsPage() {
  const router = useRouter();

  // State management
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores appt ID being updated
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch user profile and their appointments list
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // 1. Fetch user profile
      const monolithUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const meRes = await fetch(`${monolithUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const meData = await meRes.json();
      if (!meRes.ok) {
        throw new Error(meData.message || 'Failed to authenticate user');
      }
      const userData = meData.data;
      setUser(userData);

      // 2. Fetch scoped appointments
      const apptServiceUrl = process.env.NEXT_PUBLIC_APPOINTMENT_SERVICE_URL || 'http://localhost:3020';
      const apptRes = await fetch(`${apptServiceUrl}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const apptData = await apptRes.json();
      if (!apptRes.ok) {
        throw new Error(apptData.message || 'Failed to retrieve appointments list');
      }

      setAppointments(apptData.data || []);
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

  useEffect(() => {
    fetchData();
  }, [router]);

  // Handle status transitions (e.g. approve, cancel, complete)
  const handleUpdateStatus = async (apptId, newStatus) => {
    setActionLoading(apptId);
    setError(null);
    setSuccessMsg(null);
    const token = localStorage.getItem('token');

    const apptServiceUrl = process.env.NEXT_PUBLIC_APPOINTMENT_SERVICE_URL || 'http://localhost:3020';

    try {
      const res = await fetch(`${apptServiceUrl}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update appointment status');
      }

      setSuccessMsg(`Appointment status successfully changed to ${newStatus}`);
      
      // Update local state to reflect change immediately
      setAppointments(prev =>
        prev.map(appt =>
          appt.id === apptId ? { ...appt, status: newStatus } : appt
        )
      );

      // Clear success banner after 3 seconds
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper to get visual classes/styles for status badges
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'approved':
        return styles.badgeApproved;
      case 'completed':
        return styles.badgeCompleted;
      case 'cancelled':
        return styles.badgeCancelled;
      case 'pending':
      default:
        return styles.badgePending;
    }
  };

  // Format date helper (YYYY-MM-DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time helper (HH:MM)
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    // timeStr is usually "10:00:00" -> split to "10:00"
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
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
              <li><Link href="/doctors" style={styles.link}>Specialists</Link></li>
              <li><Link href="/profile" style={styles.link}>My Profile</Link></li>
              <li><Link href="/logout" style={styles.logoutLink}>Logout</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.container}>
          
          <div style={styles.pageHeader}>
            <div>
              <h1 style={styles.title}>My Appointments</h1>
              <p style={styles.subtitle}>
                {user?.role === 'patient' && 'Review your scheduled consultations and request status.'}
                {user?.role === 'doctor' && 'Manage your calendar schedules, patient reviews, and session schedules.'}
                {['receptionist', 'admin'].includes(user?.role) && 'System-wide clinic scheduling dashboard and slot coordination.'}
              </p>
            </div>
            {user?.role === 'patient' && (
              <button 
                onClick={() => router.push('/doctors')}
                style={styles.bookCTA}
              >
                📅 Request New Appointment
              </button>
            )}
          </div>

          {successMsg && <div style={styles.successAlert}>✅ {successMsg}</div>}
          {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

          {loading ? (
            <div style={styles.statusContainer}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading appointment dashboard...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div style={styles.emptyContainer}>
              <h3>No Appointments Found</h3>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
                There are currently no scheduled appointments logged in your dashboard.
              </p>
              {user?.role === 'patient' && (
                <button onClick={() => router.push('/doctors')} style={styles.btnSecondary}>
                  Browse Clinic Specialists
                </button>
              )}
            </div>
          ) : (
            <div style={styles.list}>
              {appointments.map((appt) => (
                <div key={appt.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    {/* Header Info depending on role */}
                    <div>
                      {user?.role === 'patient' ? (
                        <h3 style={styles.partyName}>Dr. {appt.doctor_first_name} {appt.doctor_last_name}</h3>
                      ) : (
                        <h3 style={styles.partyName}>Patient: {appt.patient_first_name} {appt.patient_last_name}</h3>
                      )}

                      <div style={styles.detailsRow}>
                        {user?.role === 'patient' && appt.doctor_specialization && (
                          <span style={styles.specialtyBadge}>{appt.doctor_specialization}</span>
                        )}
                        <span style={styles.dateTimeText}>
                          🗓️ {formatDate(appt.appointment_date)} &bull; ⏰ {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                        </span>
                      </div>
                    </div>

                    <div style={styles.badgeContainer}>
                      <span style={{ ...styles.statusBadge, ...getStatusBadgeStyle(appt.status) }}>
                        {appt.status}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <p style={styles.reasonText}>
                      <strong>Reason for Visit:</strong> {appt.reason || 'No clinical reasoning or symptoms provided.'}
                    </p>
                    {user?.role !== 'patient' && appt.patient_email && (
                      <p style={styles.contactInfo}>
                        📧 Contact Email: <span style={{ color: '#e2e8f0' }}>{appt.patient_email}</span>
                      </p>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <div>
                      {/* Empty left side placeholder */}
                    </div>
                    
                    <div style={styles.actions}>
                      {/* 1. Patient actions: can only cancel pending/approved */}
                      {user?.role === 'patient' && ['pending', 'approved'].includes(appt.status) && (
                        <button
                          disabled={actionLoading === appt.id}
                          onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                          style={styles.btnCancel}
                        >
                          {actionLoading === appt.id ? 'Updating...' : 'Cancel Booking'}
                        </button>
                      )}

                      {/* 2. Doctor actions: can approve or cancel pending */}
                      {user?.role === 'doctor' && appt.status === 'pending' && (
                        <>
                          <button
                            disabled={actionLoading === appt.id}
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                            style={styles.btnReject}
                          >
                            Reject
                          </button>
                          <button
                            disabled={actionLoading === appt.id}
                            onClick={() => handleUpdateStatus(appt.id, 'approved')}
                            style={styles.btnApprove}
                          >
                            Approve
                          </button>
                        </>
                      )}

                      {/* 3. Receptionist / Admin actions: can approve or cancel pending/approved */}
                      {['receptionist', 'admin'].includes(user?.role) && ['pending', 'approved'].includes(appt.status) && (
                        <>
                          <button
                            disabled={actionLoading === appt.id}
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                            style={styles.btnCancel}
                          >
                            Cancel
                          </button>
                          {appt.status === 'pending' && (
                            <button
                              disabled={actionLoading === appt.id}
                              onClick={() => handleUpdateStatus(appt.id, 'approved')}
                              style={styles.btnApprove}
                            >
                              Approve
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}

// Premium visual style tokens (Dark mode glassmorphism)
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
    maxWidth: '1000px',
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 0.5rem 0',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    margin: 0,
    lineHeight: '1.5'
  },
  bookCTA: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.4)',
    transition: 'background-color 0.2s'
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0'
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
    fontSize: '0.95rem'
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '2rem',
    color: '#10b981',
    fontSize: '0.95rem'
  },
  emptyContainer: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
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
    transition: 'all 0.2s'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
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
    gap: '1rem'
  },
  partyName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 0.5rem 0'
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  specialtyBadge: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: '600',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#38bdf8',
    border: '1px solid rgba(14, 165, 233, 0.2)'
  },
  dateTimeText: {
    fontSize: '0.85rem',
    color: '#94a3b8'
  },
  badgeContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.35rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.2)'
  },
  badgeApproved: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#38bdf8',
    border: '1px solid rgba(14, 165, 233, 0.2)'
  },
  badgeCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.2)'
  },
  badgeCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  },
  cardBody: {
    padding: '1.25rem 0',
    borderBottom: '1px solid #1e293b'
  },
  reasonText: {
    fontSize: '0.925rem',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: 0
  },
  contactInfo: {
    fontSize: '0.825rem',
    color: '#64748b',
    marginTop: '0.5rem',
    marginBottom: 0
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginLeft: 'auto'
  },
  btnCancel: {
    padding: '0.45rem 1rem',
    borderRadius: '0.375rem',
    border: '1px solid #ef4444',
    backgroundColor: 'transparent',
    color: '#ef4444',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  btnReject: {
    padding: '0.45rem 1rem',
    borderRadius: '0.375rem',
    border: '1px solid #f87171',
    backgroundColor: 'transparent',
    color: '#f87171',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  btnApprove: {
    padding: '0.45rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};
