import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './Auth.css';

const Register = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', aadhaarId: '',
    bloodGroup: '', age: '', role: 'patient',
    specialty: '', hospital: '', licenseNumber: '',
    registrationNumber: '', labTypes: '', address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        age: Number(form.age) || 0,
        labTypes: form.role === 'hospital' ? form.labTypes.split(',').map(t => t.trim()).filter(Boolean) : undefined
      };
      const { data } = await API.post('/auth/register', payload);
      // Show the generated code before navigating
      if (data.role === 'doctor' && data.doctorCode) {
        setSuccessInfo({ type: 'doctor', code: data.doctorCode, name: data.name });
        setTimeout(() => { login(data); navigate('/dashboard'); }, 4000);
      } else if (data.role === 'hospital' && data.labCode) {
        setSuccessInfo({ type: 'hospital', code: data.labCode, name: data.name });
        setTimeout(() => { login(data); navigate('/dashboard'); }, 4000);
      } else {
        login(data);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    }
    setLoading(false);
  };

  const isDoctor = form.role === 'doctor';
  const isHospital = form.role === 'hospital';

  if (successInfo) {
    return (
      <div className="auth-page">
        <div className="auth-right" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div className="auth-card card" style={{ textAlign: 'center', maxWidth: 480 }}>
            <h2 style={{ fontSize: '2rem', marginBottom: 8 }}>🎉 Registration Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Welcome, {successInfo.name}</p>
            <div style={{ background: 'var(--surface-container-low)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <p style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Your Unique {successInfo.type === 'doctor' ? 'Doctor' : 'Lab'} Code
              </p>
              <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-accent)', letterSpacing: 4 }}>{successInfo.code}</p>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {successInfo.type === 'doctor'
                ? 'Share this code with patients so they can grant you access to their records.'
                : 'Share this code with patients so they can search and link your lab for report uploads.'}
            </p>
            <p style={{ marginTop: 16, fontSize: '0.85rem', opacity: 0.6 }}>Redirecting to dashboard in a few seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-logo">💚</span>
          <h1>HealthVault AI</h1>
          <p className="auth-tagline">Your Health. Your Data. Your Control.</p>
        </div>
        <div className="auth-features">
          <div className="auth-feature"><span className="feature-icon">🆔</span><div><h4>Unique Health ID</h4><p>Auto-generated ID linked to your Aadhaar</p></div></div>
          <div className="auth-feature"><span className="feature-icon">🧠</span><div><h4>AI Health Score</h4><p>Get a personalized 0-1000 health trust score</p></div></div>
          <div className="auth-feature"><span className="feature-icon">👨‍⚕️</span><div><h4>Doctor Code</h4><p>Doctors get a unique DR-XXXX code for easy lookup</p></div></div>
          <div className="auth-feature"><span className="feature-icon">🏥</span><div><h4>Lab Portal</h4><p>Hospitals get LAB-XXXX codes to upload reports</p></div></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card card">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join HealthVault to take control of your health data</p>

          {error && <div className="auth-error">{error}</div>}

          {/* Role Toggle */}
          <div className="auth-mode-toggle" style={{ marginBottom: '16px' }}>
            <button className={`mode-btn ${form.role === 'patient' ? 'active' : ''}`} type="button" onClick={() => setForm({ ...form, role: 'patient' })}>
              🧑 Patient
            </button>
            <button className={`mode-btn ${form.role === 'doctor' ? 'active' : ''}`} type="button" onClick={() => setForm({ ...form, role: 'doctor' })}>
              👨‍⚕️ Doctor
            </button>
            <button className={`mode-btn ${form.role === 'hospital' ? 'active' : ''}`} type="button" onClick={() => setForm({ ...form, role: 'hospital' })}>
              🏥 Hospital
            </button>
          </div>

          <form onSubmit={handleRegister}>
            <div className="form-group"><label>{isHospital ? 'Hospital / Lab Name' : 'Full Name'} *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={isHospital ? 'City Diagnostics Lab' : 'Aryan Sharma'} required />
            </div>
            <div className="form-group"><label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={isHospital ? 'lab@hospital.com' : 'aryan@example.com'} required />
            </div>
            <div className="form-group"><label>Password *</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
            </div>

            <div className="form-row">
              <div className="form-group"><label>Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              {!isHospital && (
                <div className="form-group"><label>Aadhaar (12 digits)</label>
                  <input value={form.aadhaarId} onChange={e => setForm({ ...form, aadhaarId: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="XXXX XXXX XXXX" maxLength={12} />
                </div>
              )}
              {isHospital && (
                <div className="form-group"><label>Registration No.</label>
                  <input value={form.registrationNumber} onChange={e => setForm({ ...form, registrationNumber: e.target.value })} placeholder="MCI/State Reg #" />
                </div>
              )}
            </div>

            {!isDoctor && !isHospital && (
              <div className="form-row">
                <div className="form-group"><label>Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Age</label>
                  <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="28" min={0} max={120} />
                </div>
              </div>
            )}

            {isDoctor && (
              <>
                <div className="form-row">
                  <div className="form-group"><label>Specialty *</label>
                    <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="e.g., Cardiologist" required />
                  </div>
                  <div className="form-group"><label>Hospital</label>
                    <input value={form.hospital} onChange={e => setForm({ ...form, hospital: e.target.value })} placeholder="Hospital name" />
                  </div>
                </div>
                <div className="form-group"><label>Medical License No.</label>
                  <input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="MCI/NMC License Number" />
                </div>
                <div className="otp-demo-hint" style={{ marginBottom: '12px' }}>
                  ℹ️ After registration, you'll receive a unique <strong>DR-XXXX</strong> code. Share it with patients for easy access.
                </div>
              </>
            )}

            {isHospital && (
              <>
                <div className="form-group"><label>Lab Types (comma-separated)</label>
                  <input value={form.labTypes} onChange={e => setForm({ ...form, labTypes: e.target.value })} placeholder="Pathology, Radiology, Cardiology" />
                </div>
                <div className="form-group"><label>Address</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address of the lab or hospital" />
                </div>
                <div className="otp-demo-hint" style={{ marginBottom: '12px' }}>
                  ℹ️ After registration, you'll receive a unique <strong>LAB-XXXX</strong> code. Patients can search this code to link your reports.
                </div>
              </>
            )}

            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
              {loading ? 'Creating Account...' : `Create ${isDoctor ? 'Doctor' : isHospital ? 'Hospital' : 'Patient'} Account`}
            </button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
