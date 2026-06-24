'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DoctorListingPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const router = useRouter();

  // State management
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch doctors list from backend
  const fetchDoctors = async (specialty = '') => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const url = specialty 
        ? `${apiUrl}/doctors?specialization=${encodeURIComponent(specialty)}`
        : `${apiUrl}/doctors`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to retrieve doctors list');
      }

      setDoctors(data.data || []);
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

  // Fetch all doctors on initial mount
  useEffect(() => {
    fetchDoctors();
  }, [router]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchDoctors('');
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
          
          {/* Page Title & Search Bar */}
          <div style={styles.heroSection}>
            <h1 style={styles.title}>Find a Specialist</h1>
            <p style={styles.subtitle}>
              Search through our network of certified medical professionals and find the care you need.
            </p>

            <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
              <input
                type="text"
                placeholder="Search by Specialization (e.g. Cardiology, Pediatrics)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button type="submit" style={styles.searchButton}>
                Search
              </button>
              {searchQuery && (
                <button type="button" onClick={handleClearSearch} style={styles.clearButton}>
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Loading, Error and Results display */}
          {loading ? (
            <div style={styles.statusContainer}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Searching doctors list...</p>
            </div>
          ) : error ? (
            <div style={styles.errorAlert}>
              ⚠️ {error}
            </div>
          ) : doctors.length === 0 ? (
            <div style={styles.emptyContainer}>
              <h3>No Specialists Found</h3>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
                We couldn't find any doctors matching your search criteria. Try a different specialization.
              </p>
              <button onClick={handleClearSearch} style={styles.btnSecondary}>
                View All Doctors
              </button>
            </div>
          ) : (
            <>
              <p style={styles.resultsCount}>
                Showing {doctors.length} specialist{doctors.length === 1 ? '' : 's'}
              </p>
              <div style={styles.grid}>
                {doctors.map((doctor) => (
                  <div key={doctor.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div>
                        <h3 style={styles.doctorName}>
                          Dr. {doctor.first_name} {doctor.last_name}
                        </h3>
                        <span style={styles.badge}>{doctor.specialization}</span>
                      </div>
                      <div style={styles.feeContainer}>
                        <span style={styles.feeLabel}>Fee</span>
                        <span style={styles.feeAmount}>${parseFloat(doctor.consultation_fee).toFixed(2)}</span>
                      </div>
                    </div>

                    <p style={styles.bio}>
                      {doctor.bio || "No professional biography has been provided by this practitioner yet."}
                    </p>

                    <div style={styles.cardFooter}>
                      <span style={styles.contactText}>📞 {doctor.phone || 'No phone provided'}</span>
                      <button 
                        style={styles.bookButton}
                        onClick={() => router.push(`/appointments/book?doctorId=${doctor.id}`)}
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </main>
    </>
  );
}

// Custom Premium styling definitions (Dark Theme glassmorphism style)
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
  heroSection: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: 'white',
    marginBottom: '0.75rem',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1.1rem',
    maxWidth: '600px',
    margin: '0 auto 2rem auto',
    lineHeight: '1.6'
  },
  searchForm: {
    display: 'flex',
    maxWidth: '650px',
    margin: '0 auto',
    gap: '0.75rem'
  },
  searchInput: {
    flex: 1,
    padding: '0.85rem 1.25rem',
    borderRadius: '0.5rem',
    border: '1px solid #1e293b',
    backgroundColor: '#111a2e',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  searchButton: {
    padding: '0.85rem 1.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#0ea5e9',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  clearButton: {
    padding: '0.85rem 1.25rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
    padding: '1.25rem',
    color: '#ef4444',
    fontSize: '1rem',
    maxWidth: '650px',
    margin: '0 auto',
    textAlign: 'center'
  },
  emptyContainer: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '4rem 2rem',
    textAlign: 'center',
    maxWidth: '550px',
    margin: '0 auto',
    color: 'white',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  },
  resultsCount: {
    color: '#64748b',
    fontSize: '0.9rem',
    marginBottom: '1.25rem',
    fontWeight: '500'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '2rem'
  },
  card: {
    backgroundColor: '#111a2e',
    border: '1px solid #1e293b',
    borderRadius: '0.75rem',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem'
  },
  doctorName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 0.5rem 0'
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#38bdf8',
    border: '1px solid rgba(14, 165, 233, 0.2)'
  },
  feeContainer: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
  },
  feeLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  feeAmount: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#10b981'
  },
  bio: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 1.75rem 0',
    flex: 1
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #1e293b',
    paddingTop: '1.25rem',
    marginTop: 'auto'
  },
  contactText: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  bookButton: {
    padding: '0.55rem 1.1rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#38bdf8',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid rgba(14, 165, 233, 0.2)'
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
  }
};
