'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InsurancePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const insuranceUrl = process.env.NEXT_PUBLIC_INSURANCE_SERVICE_URL || '';
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [claimForm, setClaimForm] = useState({ appointment_id: '', amount: '' });
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      const meRes = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (!meRes.ok) throw new Error(meData.message || 'Failed to authenticate');
      const userData = meData.data;
      setUser(userData);

      // Fetch policies
      const polRes = await fetch(`${insuranceUrl}/policies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const polData = await polRes.json();
      if (polRes.ok && polData.data?.length > 0) {
        setPolicy(polData.data[0]);
      } else {
        setPolicy(null);
      }

      // Fetch claims
      const claimsRes = await fetch(`${insuranceUrl}/claims`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const claimsData = await claimsRes.json();
      if (claimsRes.ok) {
        setClaims(claimsData.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    if (!claimForm.appointment_id.trim() || !claimForm.amount) {
      setFormError('Both Appointment ID and Amount are required.');
      return;
    }
    setActionLoading('submit');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${insuranceUrl}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          appointment_id: claimForm.appointment_id.trim(),
          amount: parseFloat(claimForm.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit claim');
      setSuccessMsg('Claim submitted successfully! It is now pending review.');
      setClaimForm({ appointment_id: '', amount: '' });
      setShowForm(false);
      setClaims((prev) => [data.data, ...prev]);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReview = async (claimId, status) => {
    setActionLoading(claimId);
    setError(null);
    setSuccessMsg(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${insuranceUrl}/claims/${claimId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Review action failed');
      setSuccessMsg(`Claim ${status} successfully.`);
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, ...data.data } : c))
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const formatAmount = (a) => {
    const n = parseFloat(a);
    return isNaN(n) ? a : `$${n.toFixed(2)}`;
  };
  const shortId = (id) => (id ? `${id.slice(0, 8)}…` : '—');
  const isAgent = user?.role === 'insurance_agent' || user?.role === 'admin';
  const isPatient = user?.role === 'patient';

  const getClaimBadge = (status) => ({
    pending: styles.badgePending,
    approved: styles.badgeApproved,
    rejected: styles.badgeRejected,
  }[status] || styles.badgePending);

  return (
    <>
      <header style={styles.header}>
        <div style={styles.navWrapper}>
          <div style={styles.logo} onClick={() => router.push('/')}>🏥 CareFlow HMS</div>
          <nav>
            <ul style={styles.navLinks}>
              <li><Link href="/" style={styles.link}>Home</Link></li>
              <li><Link href="/appointments" style={styles.link}>Appointments</Link></li>
              <li><Link href="/billing" style={styles.link}>Billing</Link></li>
              <li><Link href="/profile" style={styles.link}>My Profile</Link></li>
              <li><Link href="/logout" style={styles.logoutLink}>Logout</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.container}>

          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div>
              <h1 style={styles.title}>🛡️ Insurance</h1>
              <p style={styles.subtitle}>
                {isPatient && 'View your active policy and manage insurance claims.'}
                {isAgent && 'Review and action pending insurance claims.'}
              </p>
            </div>
            {isPatient && policy && (
              <button
                style={styles.btnPrimary}
                onClick={() => setShowForm((v) => !v)}
              >
                {showForm ? '✕ Cancel' : '+ Submit a Claim'}
              </button>
            )}
          </div>

          {successMsg && <div style={styles.successAlert}>✅ {successMsg}</div>}
          {error && <div style={styles.errorAlert}>⚠️ {error}</div>}

          {loading ? (
            <div style={styles.statusContainer}>
              <div style={styles.spinner} />
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading insurance data…</p>
            </div>
          ) : (
            <>
              {/* Patient Policy Card */}
              {isPatient && (
                <section style={{ marginBottom: '2.5rem' }}>
                  <h2 style={styles.sectionTitle}>Your Policy</h2>
                  {policy ? (
                    <div style={styles.policyCard}>
                      <div style={styles.policyGrid}>
                        <div style={styles.policyItem}>
                          <span style={styles.policyLabel}>Provider</span>
                          <span style={styles.policyValue}>{policy.provider}</span>
                        </div>
                        <div style={styles.policyItem}>
                          <span style={styles.policyLabel}>Policy #</span>
                          <span style={styles.policyValue}>{policy.policy_number}</span>
                        </div>
                        <div style={styles.policyItem}>
                          <span style={styles.policyLabel}>Coverage</span>
                          <span style={{ ...styles.policyValue, color: '#34d399' }}>
                            {formatAmount(policy.coverage_amount)}
                          </span>
                        </div>
                        <div style={styles.policyItem}>
                          <span style={styles.policyLabel}>Valid From</span>
                          <span style={styles.policyValue}>{formatDate(policy.valid_from)}</span>
                        </div>
                        <div style={styles.policyItem}>
                          <span style={styles.policyLabel}>Valid Until</span>
                          <span style={styles.policyValue}>{formatDate(policy.valid_until)}</span>
                        </div>
                        <div style={styles.policyItem}>
                          <span style={styles.policyLabel}>Status</span>
                          <span style={{
                            ...styles.statusBadge,
                            ...(new Date(policy.valid_until) >= new Date() ? styles.badgeApproved : styles.badgeRejected),
                          }}>
                            {new Date(policy.valid_until) >= new Date() ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.emptyContainer}>
                      <p style={{ color: '#64748b' }}>No active insurance policy found on your account.</p>
                      <p style={{ color: '#475569', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Contact your insurance provider or hospital admin to get a policy assigned.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Claim Submission Form */}
              {isPatient && showForm && (
                <section style={{ marginBottom: '2.5rem' }}>
                  <div style={styles.formCard}>
                    <h2 style={styles.sectionTitle}>Submit an Insurance Claim</h2>
                    <p style={styles.formHint}>
                      You can only file claims for <strong>completed</strong> appointments. The claim
                      amount must not exceed your policy coverage ({formatAmount(policy?.coverage_amount)}).
                    </p>
                    {formError && <div style={styles.errorAlert}>⚠️ {formError}</div>}
                    <form onSubmit={handleSubmitClaim} style={styles.form}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Appointment ID *</label>
                        <input
                          id="claim-appointment-id"
                          style={styles.input}
                          type="text"
                          placeholder="Paste the appointment UUID here"
                          value={claimForm.appointment_id}
                          onChange={(e) => setClaimForm((f) => ({ ...f, appointment_id: e.target.value }))}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Claim Amount (USD) *</label>
                        <input
                          id="claim-amount"
                          style={styles.input}
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="e.g. 250.00"
                          value={claimForm.amount}
                          onChange={(e) => setClaimForm((f) => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                      <button
                        id="submit-claim-btn"
                        type="submit"
                        disabled={actionLoading === 'submit'}
                        style={styles.btnPrimary}
                      >
                        {actionLoading === 'submit' ? 'Submitting…' : '📤 Submit Claim'}
                      </button>
                    </form>
                  </div>
                </section>
              )}

              {/* Claims List */}
              <section>
                <h2 style={styles.sectionTitle}>
                  {isPatient ? 'My Claims' : 'All Claims'}
                </h2>
                {claims.length === 0 ? (
                  <div style={styles.emptyContainer}>
                    <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No Claims Found</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                      {isPatient
                        ? 'Submit a claim above after your appointment is completed and billed.'
                        : 'No claims have been submitted yet.'}
                    </p>
                  </div>
                ) : (
                  <div style={styles.list}>
                    {claims.map((claim) => (
                      <div key={claim.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                          <div>
                            <h3 style={styles.claimAmount}>{formatAmount(claim.amount)}</h3>
                            <div style={styles.detailsRow}>
                              <span style={styles.metaText}>📋 Appt {shortId(claim.appointment_id)}</span>
                              <span style={styles.metaText}>🗓️ Filed {formatDate(claim.created_at)}</span>
                              {isAgent && (
                                <span style={styles.metaText}>👤 Patient {shortId(claim.patient_id)}</span>
                              )}
                              {claim.reviewed_at && (
                                <span style={styles.metaText}>✔ Reviewed {formatDate(claim.reviewed_at)}</span>
                              )}
                            </div>
                          </div>
                          <span style={{ ...styles.statusBadge, ...getClaimBadge(claim.status) }}>
                            {claim.status}
                          </span>
                        </div>

                        <div style={styles.cardBody}>
                          <p style={styles.detailText}>
                            <strong>Claim ID:</strong> {claim.id}
                          </p>
                          <p style={styles.detailText}>
                            <strong>Policy ID:</strong> {claim.policy_id}
                          </p>
                        </div>

                        {/* Review actions — insurance_agent / admin only, pending claims */}
                        {isAgent && claim.status === 'pending' && (
                          <div style={styles.cardFooter}>
                            <button
                              id={`approve-claim-${claim.id}`}
                              disabled={!!actionLoading}
                              onClick={() => handleReview(claim.id, 'approved')}
                              style={styles.btnApprove}
                            >
                              {actionLoading === claim.id ? 'Processing…' : '✅ Approve'}
                            </button>
                            <button
                              id={`reject-claim-${claim.id}`}
                              disabled={!!actionLoading}
                              onClick={() => handleReview(claim.id, 'rejected')}
                              style={styles.btnReject}
                            >
                              {actionLoading === claim.id ? 'Processing…' : '❌ Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

const styles = {
  header: { backgroundColor: '#111a2e', borderBottom: '1px solid #1e293b', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 },
  navWrapper: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' },
  logo: { fontSize: '1.35rem', fontWeight: 'bold', color: '#0ea5e9', cursor: 'pointer' },
  navLinks: { display: 'flex', listStyle: 'none', gap: '1.5rem', margin: 0, padding: 0 },
  link: { color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '500' },
  logoutLink: { color: '#ef4444', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600' },
  mainContainer: { backgroundColor: '#090e1a', minHeight: 'calc(100vh - 65px)', padding: '3rem 1.5rem', fontFamily: 'sans-serif', boxSizing: 'border-box' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  pageHeader: { marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '2.25rem', fontWeight: '800', color: 'white', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { color: '#94a3b8', fontSize: '1rem', margin: 0, lineHeight: '1.5' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: '700', color: 'white', margin: '0 0 1.25rem 0' },
  statusContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' },
  spinner: { width: '40px', height: '40px', border: '4px solid rgba(14, 165, 233, 0.1)', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  errorAlert: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.95rem' },
  successAlert: { backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', color: '#10b981', fontSize: '0.95rem' },
  emptyContainer: { backgroundColor: '#111a2e', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center' },
  policyCard: { backgroundColor: '#111a2e', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' },
  policyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' },
  policyItem: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  policyLabel: { fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' },
  policyValue: { fontSize: '1rem', color: '#e2e8f0', fontWeight: '600' },
  formCard: { backgroundColor: '#111a2e', border: '1px solid #334155', borderRadius: '0.75rem', padding: '2rem' },
  formHint: { color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.9rem', fontWeight: '600', color: '#94a3b8' },
  input: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', padding: '0.75rem 1rem', color: 'white', fontSize: '0.95rem', outline: 'none' },
  list: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  card: { backgroundColor: '#111a2e', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' },
  claimAmount: { fontSize: '1.4rem', fontWeight: 'bold', color: 'white', margin: '0 0 0.4rem 0' },
  detailsRow: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  metaText: { fontSize: '0.85rem', color: '#94a3b8' },
  statusBadge: { display: 'inline-block', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  badgePending: { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' },
  badgeApproved: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' },
  badgeRejected: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' },
  cardBody: { padding: '1rem 0', borderBottom: '1px solid #1e293b' },
  detailText: { fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 0.4rem 0' },
  cardFooter: { display: 'flex', gap: '0.75rem', paddingTop: '1rem' },
  btnPrimary: { padding: '0.65rem 1.4rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#0ea5e9', color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
  btnApprove: { padding: '0.6rem 1.25rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
  btnReject: { padding: '0.6rem 1.25rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#ef4444', color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
};
