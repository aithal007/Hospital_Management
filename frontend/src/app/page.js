import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  return (
    <>
      <header>
        <div className="container nav-wrapper">
          <div className="logo">
            🏥 CareFlow HMS
          </div>
          <nav>
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              {token ? (
                <>
                  <li><a href="/doctors">Specialists</a></li>
                  <li><a href="/appointments">Appointments</a></li>
                  <li><a href="/billing">Billing</a></li>
                  <li><a href="/prescriptions">Prescriptions</a></li>
                  <li><a href="/profile">My Profile</a></li>
                  <li><a href="/logout" style={{ color: '#ef4444', fontWeight: 'bold' }}>Logout</a></li>
                </>
              ) : (
                <>
                  <li><a href="/login">Login</a></li>
                  <li><a href="/register">Register</a></li>
                </>
              )}
              <li><a href="https://github.com/aithal007/Hospital_Management" target="_blank" rel="noreferrer">GitHub</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1>Modern Healthcare Portal</h1>
          <p>
            Welcome to CareFlow, a comprehensive Hospital Management System designed to 
            streamline doctor schedules, appointment bookings, prescriptions, and insurance claims.
          </p>
          <div className="ctas">
            {token ? (
              <span className="btn btn-primary" style={{ cursor: 'default' }}>Logged In Successfully</span>
            ) : (
              <a href="/login" className="btn btn-primary">Enter Portal</a>
            )}
            <a href="/health" className="btn btn-secondary">Test Connection</a>
          </div>

        </section>

        <section id="features" className="features">
          <div className="grid">
            <div className="card">
              <h3>📅 Smart Booking</h3>
              <p>Patients can search for doctors by specialization, view available slots, and request appointments instantly.</p>
            </div>
            <div className="card">
              <h3>📝 Digital Prescriptions</h3>
              <p>Doctors can log patient visits and write digital prescriptions linked securely to completed appointments.</p>
            </div>
            <div className="card">
              <h3>💳 Billing & Claims</h3>
              <p>Get instant invoice calculations, make card payments, and file automated insurance coverage claims directly.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} CareFlow HMS. Built with Next.js and Node.js.</p>
        </div>
      </footer>
    </>
  );
}
