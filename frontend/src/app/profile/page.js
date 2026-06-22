'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  
  // User and profile states
  const [user, setUser] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [profileId, setProfileId] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    date_of_birth: '',
    gender: 'Male',
    address: '',
    insurance_provider: '',
    insurance_policy_number: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch current user and check profile presence
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch user details');
        }

        const userData = data.data;
        setUser(userData);

        // Access Gate: only patient role allowed on this profile page
        if (userData.role !== 'patient') {
          throw new Error('Access denied. This profile page is strictly for patient accounts.');
        }

        // If profile already exists, prefill form data
        if (userData.patient_profile) {
          setProfileExists(true);
          setProfileId(userData.patient_profile.id);
          
          // Format date_of_birth from database timestamp/date string to YYYY-MM-DD
          let dbDate = userData.patient_profile.date_of_birth || '';
          if (dbDate) {
            dbDate = new Date(dbDate).toISOString().split('T')[0];
          }

          setFormData({
            date_of_birth: dbDate,
            gender: userData.patient_profile.gender || 'Male',
            address: userData.patient_profile.address || '',
            insurance_provider: userData.patient_profile.insurance_provider || '',
            insurance_policy_number: userData.patient_profile.insurance_policy_number || ''
          });
        }
      } catch (err) {
        setError(err.message);
        // Clear token if unauthorized / expired
        if (err.message.includes('auth') || err.message.includes('token') || err.message.includes('denied')) {
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
          setTimeout(() => router.push('/login'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const token = localStorage.getItem('token');
    
    // Choose creation or modification endpoint based on profile existence
    const endpoint = profileExists 
      ? `http://localhost:5000/patients/${profileId}` 
      : 'http://localhost:5000/patients';
      
    const method = profileExists ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map(err => err.message).join(', '));
        }
        throw new Error(data.message || 'Operation failed');
      }

      setSuccessMsg(profileExists ? 'Profile updated successfully!' : 'Profile created successfully!');
      
      // Update local state if profile was created
      if (!profileExists) {
        setProfileExists(true);
        setProfileId(data.data.id);
      }

      // Scroll to top to see success alert
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading patient profile...</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={styles.errorWrapper}>
        <div style={styles.errorCard}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}>Access Error</h3>
          <p style={{ color: '#94a3b8', lineHeight: '1.5' }}>{error}</p>
          <button onClick={() => router.push('/login')} style={styles.btnPrimary}>Go to Sign In</button>
        </div>
      </div>
    );
  }

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
              <li><Link href="/logout" style={styles.logoutLink}>Logout</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.card}>
          <h2 style={styles.title}>
            {profileExists ? 'Update Patient Profile' : 'Set Up Patient Profile'}
          </h2>
          <p style={styles.subtitle}>
            Please fill out your clinical demographics below. This information is needed to book appointments and process coverage claims.
          </p>

          {successMsg && (
            <div style={styles.successAlert}>
              ✓ {successMsg}
            </div>
          )}

          {error && (
            <div style={styles.errorAlert}>
              ⚠️ {error}
            </div>
          )}

          {/* User Account Info Section (ReadOnly) */}
          <div style={styles.sectionHeader}>Account Information</div>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Full Name</span>
              <span style={styles.infoValue}>{user.first_name} {user.last_name}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email Address</span>
              <span style={styles.infoValue}>{user.email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Registered Role</span>
              <span style={{ ...styles.infoValue, textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Phone Number</span>
              <span style={styles.infoValue}>{user.phone || 'Not provided'}</span>
            </div>
          </div>

          {/* Demographics setup form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.sectionHeader}>Demographics & Insurance</div>
            
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  required
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]} // date must be in past
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Gender *</label>
                <select
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer Not to Say">Prefer Not to Say</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Residential Address</label>
              <textarea
                name="address"
                rows="3"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your street address, city, state, and ZIP code"
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Insurance Provider</label>
                <input
                  type="text"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleChange}
                  placeholder="e.g. Blue Cross Blue Shield"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Policy Number</label>
                <input
                  type="text"
                  name="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={handleChange}
                  placeholder="e.g. BC987654321"
                  style={styles.input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={styles.btnPrimary}
            >
              {submitting ? 'Saving Profile...' : profileExists ? 'Update Details' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

// Inline custom CSS design tokens matching login theme (dark/glassmorphism aesthetics)
const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#090e1a',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(14, 165, 233, 0.1)',
    borderTop: '4px solid #0ea5e9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#090e1a',
    padding: '2rem'
  },
  errorCard: {
    backgroundColor: '#111a2e',
    border: '1px solid #ef4444',
    borderRadius: '0.75rem',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  },
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
    maxWidth: '1000px',
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
    fontFamily: 'sans-serif'
  },
  card: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '3rem',
    maxWidth: '800px',
    margin: '0 auto',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
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
  sectionHeader: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#38bdf8',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '0.5rem',
    marginTop: '2rem',
    marginBottom: '1.25rem'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
    backgroundColor: '#090e1a',
    padding: '1.25rem',
    borderRadius: '0.5rem',
    border: '1px solid #1e293b'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  infoLabel: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  infoValue: {
    fontSize: '0.95rem',
    color: '#e2e8f0',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.875rem',
    color: '#94a3b8'
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
