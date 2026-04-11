import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { FiCamera } from 'react-icons/fi';
import jsQR from 'jsqr';
import './Pages.css';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [patient, setPatient] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [uploadForm, setUploadForm] = useState({ title: '', type: 'lab_report', description: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [recentUploads, setRecentUploads] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const fileInputRef = useRef(null);

  const searchPatient = async () => {
    if (!searchQuery.trim()) return;
    setSearchError(''); setPatient(null);
    try {
      // Search by Health ID
      const { data } = await API.get(`/auth/patient/search?q=${searchQuery}`);
      if (data) {
        setPatient(data);
      } else {
        setSearchError('No patient found with that Health ID.');
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Patient not found. Please check the Health ID.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!patient) return;
    setUploading(true); setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('type', uploadForm.type);
      formData.append('description', uploadForm.description);
      formData.append('patientHealthId', patient.healthId);
      formData.append('uploadedBy', user.name);
      formData.append('uploadedByCode', user.labCode || '');
      if (file) formData.append('file', file);

      await API.post('/records/hospital-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(`✅ Report uploaded successfully to ${patient.name}'s vault!`);
      setRecentUploads(prev => [{
        title: uploadForm.title, type: uploadForm.type,
        patientName: patient.name, time: new Date().toLocaleString()
      }, ...prev]);
      setUploadForm({ title: '', type: 'lab_report', description: '' });
      setFile(null);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Upload failed.');
    }
    setUploading(false);
  };

  const handleQRUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setScanning(true);
    setScanMessage('Scanning QR Code...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          try {
            const qrData = JSON.parse(code.data);
            if (!qrData.healthId) throw new Error('Invalid QR Data');

            setScanMessage('QR recognized! Requesting access...');
            // Also call grant-by-scan so the hospital has persistent access if needed
            await API.post('/access/grant-by-scan', { healthId: qrData.healthId });
            setScanMessage(`✅ Access granted for ${qrData.healthId}!`);
            
            // Auto-fill search and execute
            setSearchQuery(qrData.healthId);
            setSearchError(''); setPatient(null);
            const { data } = await API.get(`/auth/patient/search?q=${qrData.healthId}`);
            if (data) setPatient(data);
            
          } catch (err) {
            setScanMessage('❌ Invalid QR Code format or network error.');
          }
        } else {
          setScanMessage('❌ No QR code found in the image.');
        }
        setScanning(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(uploadedFile);
    e.target.value = null; // reset input
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🏥 Hospital / Lab Portal</h1>
          <p className="page-subtitle">Upload reports directly to patient vaults</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="chip" style={{ background: 'var(--primary-accent)', color: '#333', fontWeight: 700, fontSize: '1rem', padding: '8px 16px' }}>
            {user?.labCode || 'LAB-XXXX'}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleQRUpload} />
          <button className="btn-primary" style={{ background: '#333' }} onClick={() => fileInputRef.current.click()}>
            <FiCamera style={{ marginRight: '8px' }} /> Scan Patient QR
          </button>
        </div>
      </div>

      {scanMessage && (
        <div style={{ padding: '12px', background: scanMessage.startsWith('✅') ? '#e8f5e9' : scanMessage.startsWith('❌') ? '#ffebee' : '#e3f2fd', color: '#333', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {scanMessage}
        </div>
      )}

      {/* Lab Info Card */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ margin: 0 }}>{user?.name}</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0' }}>{user?.email}</p>
        </div>
        {user?.labTypes?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {user.labTypes.map(t => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        )}
        {user?.registrationNumber && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reg: {user.registrationNumber}</p>
        )}
      </div>

      {/* Patient Search */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3>🔍 Find Patient by Health ID</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          Enter the patient's Health ID (e.g., HV-M2X9K7PL) to upload reports to their vault.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Enter Health ID (e.g., HV-M2X9K7PL)"
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && searchPatient()}
          />
          <button className="btn-primary" onClick={searchPatient}>Search</button>
        </div>
        {searchError && <p style={{ color: '#c62828', marginTop: 12 }}>{searchError}</p>}

        {patient && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--surface-container-low)', borderRadius: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--secondary-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
              {patient.name?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, margin: 0 }}>{patient.name}</p>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                {patient.healthId} • {patient.bloodGroup} • Age: {patient.age}
              </p>
            </div>
            <span className="chip" style={{ background: '#e8f5e9', color: '#2e7d32' }}>✅ Verified</span>
          </div>
        )}
      </div>

      {/* Upload Form */}
      {patient && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3>📄 Upload Report to {patient.name}'s Vault</h3>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>Report Title *</label>
              <input
                value={uploadForm.title}
                onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g., Complete Blood Count Panel"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Report Type</label>
                <select value={uploadForm.type} onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}>
                  <option value="lab_report">Lab Report</option>
                  <option value="scan">Scan / Imaging</option>
                  <option value="prescription">Prescription</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="vaccination">Vaccination Record</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Attach File (PDF/Image)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} />
              </div>
            </div>
            <div className="form-group">
              <label>Description / Notes</label>
              <textarea
                value={uploadForm.description}
                onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Optional notes about the report..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={uploading} style={{ width: '100%' }}>
              {uploading ? '⏳ Uploading...' : `📤 Upload to ${patient.name}'s Vault`}
            </button>
          </form>
          {uploadSuccess && <p style={{ color: '#2e7d32', marginTop: 12, fontWeight: 600 }}>{uploadSuccess}</p>}
        </div>
      )}

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3>📋 Recent Uploads This Session</h3>
          {recentUploads.map((up, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>{up.title}</p>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                  For: {up.patientName} • Type: {up.type.replace(/_/g, ' ')}
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{up.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;
