'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Clear the token cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';

    // 2. Clear the token from localStorage
    localStorage.removeItem('token');

    // 3. Redirect back to login page and refresh routing context
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#090e1a',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem', color: '#0ea5e9' }}>Logging out...</h2>
        <p style={{ color: '#94a3b8' }}>Please wait while we secure your session.</p>
      </div>
    </div>
  );
}
