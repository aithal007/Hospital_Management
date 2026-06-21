'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Send login credentials directly to the Express backend (CORS enabled)
      const res = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        // If Zod validation errors list is returned
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map(err => err.message).join(', '));
        }
        throw new Error(data.message || 'Login failed');
      }

      // Store the JWT token in document.cookie (24h validity) and localStorage
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('token', data.token);

      setSuccess(true);
      setFormData({
        email: '',
        password: '',
      });

      // Redirect the user to the portal dashboard/homepage after a brief moment
      setTimeout(() => {
        router.push('/');
        // Trigger a hard reload or router refresh so header reads the cookies
        router.refresh();
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#090e1a',
      padding: '2rem',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        backgroundColor: '#111a2e',
        border: '1px solid #1e293b',
        borderRadius: '0.75rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Sign In to Portal
        </h2>

        {success && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#10b981',
            fontSize: '0.95rem',
            textAlign: 'center'
          }}>
            Login successful! Redirecting you...
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#ef4444',
            fontSize: '0.95rem',
            lineHeight: '1.4'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #1e293b',
                backgroundColor: '#090e1a',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #1e293b',
                backgroundColor: '#090e1a',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: loading ? '#0284c7' : '#0ea5e9',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.875rem',
          marginTop: '1.5rem'
        }}>
          Don't have an account yet? <a href="/register" style={{ color: '#0ea5e9', textDecoration: 'none' }}>Register here</a>
        </p>
      </div>
    </div>
  );
}
