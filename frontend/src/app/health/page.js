export const revalidate = 0; // Tells Next.js to always fetch fresh data, disabling cache
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

export default async function HealthPage() {
  let backendData = null;
  let errorMsg = null;

  try {
    // Perform server-to-server fetch request directly to Express backend
    const res = await fetch(`${apiUrl}/health`, {
      cache: 'no-store', // Bypasses Next.js data caching
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    
    backendData = await res.json();
  } catch (error) {
    errorMsg = error.message;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#090e1a',
      color: '#f1f5f9',
      fontFamily: 'sans-serif',
      padding: '2rem'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Backend Connection Monitor
      </h1>

      <div style={{
        backgroundColor: '#111a2e',
        border: '1px solid #1e293b',
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        {backendData ? (
          <div>
            <p style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              Connection Status: <span style={{ color: '#10b981', fontWeight: 'bold' }}>● ONLINE</span>
            </p>
            <div style={{
              textAlign: 'left',
              backgroundColor: '#090e1a',
              padding: '1.2rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              border: '1px solid #1e293b'
            }}>
              <p style={{ marginBottom: '0.5rem' }}><strong>Ping URL:</strong> {`${apiUrl}/health`}</p>
              <p style={{ marginBottom: '0.5rem' }}><strong>Response Status:</strong> {backendData.status}</p>
              <p><strong>Server Time:</strong> {backendData.timestamp}</p>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              Connection Status: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>● OFFLINE</span>
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Failed to connect to the backend server. Make sure your Express server is running on port 5000.
            </p>
            {errorMsg && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '1rem', fontFamily: 'monospace' }}>
                Error: {errorMsg}
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: '2.5rem' }}>
          <a href="/" style={{
            color: '#0ea5e9',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            ← Return to Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
