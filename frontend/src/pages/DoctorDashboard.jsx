import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { FiExternalLink, FiCamera, FiMessageCircle, FiVideo } from 'react-icons/fi';
import jsQR from 'jsqr';
import DoctorSimulation from './DoctorSimulation';
import ChatModal from '../components/ChatModal';
import VideoModal from '../components/VideoModal';
import './Pages.css';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [activeTab, setActiveTab] = useState('records');
  const [loading, setLoading] = useState(true);
  const [viewError, setViewError] = useState('');
  const [noteForm, setNoteForm] = useState({ title: '', note: '', diagnosis: '', prescriptions: [{ name: '', dosage: '', frequency: 'once_daily', duration: '' }] });
  const [noteSuccess, setNoteSuccess] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mainTab, setMainTab] = useState('patients');
  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings] = useState({ consultationFee: 500, paymentUPI: '', availableDays: [], availableTimeStart: '09:00', availableTimeEnd: '17:00' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchUnreadCounts();
    const interval = setInterval(() => {
      fetchUnreadCounts();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCounts = async () => {
    try {
      const { data } = await API.get('/chat/unread');
      setUnreadCounts(data.senders || {});
    } catch (err) { /* ignore polling errors */ }
  };

  const fetchData = async () => {
    try {
      const [patientsRes, statsRes, apptRes] = await Promise.all([
        API.get('/doctor/my-patients'),
        API.get('/doctor/stats'),
        API.get('/appointments/my-appointments')
      ]);
      setPatients(patientsRes.data);
      setStats(statsRes.data);
      setAppointments(apptRes.data || []);
      setSettings({
         consultationFee: statsRes.data.consultationFee || 500,
         paymentUPI: statsRes.data.paymentUPI || '',
         availableDays: statsRes.data.availableDays && statsRes.data.availableDays.length > 0 ? statsRes.data.availableDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
         availableTimeStart: statsRes.data.availableTimeStart || '09:00',
         availableTimeEnd: statsRes.data.availableTimeEnd || '17:00'
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const viewPatientRecords = async (patientId) => {
    setViewError('');
    setRecords([]);
    setMedicines([]);
    try {
      const [recRes, medRes] = await Promise.all([
        API.get(`/doctor/patient/${patientId}/records`),
        API.get(`/doctor/patient/${patientId}/medicines`)
      ]);
      setRecords(recRes.data);
      setMedicines(medRes.data);
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load records.');
    }
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setActiveTab('records');
    setNoteSuccess('');
    viewPatientRecords(p.patient._id);
  };

  const addPrescriptionRow = () => {
    setNoteForm({ ...noteForm, prescriptions: [...noteForm.prescriptions, { name: '', dosage: '', frequency: 'once_daily', duration: '' }] });
  };

  const updatePrescription = (idx, field, val) => {
    const updated = [...noteForm.prescriptions];
    updated[idx][field] = val;
    setNoteForm({ ...noteForm, prescriptions: updated });
  };

  const removePrescription = (idx) => {
    setNoteForm({ ...noteForm, prescriptions: noteForm.prescriptions.filter((_, i) => i !== idx) });
  };

  const submitNote = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setNoteSuccess('');
    try {
      const payload = {
        ...noteForm,
        prescriptions: noteForm.prescriptions.filter(p => p.name.trim())
      };
      await API.post(`/doctor/patient/${selectedPatient.patient._id}/note`, payload);
      setNoteSuccess('✅ Consultation note added successfully!');
      setNoteForm({ title: '', note: '', diagnosis: '', prescriptions: [{ name: '', dosage: '', frequency: 'once_daily', duration: '' }] });
      viewPatientRecords(selectedPatient.patient._id);
    } catch (err) {
      setNoteSuccess('❌ ' + (err.response?.data?.message || 'Failed to add note.'));
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment for your patient?')) return;
    try {
      await API.post(`/appointments/${id}/cancel`);
      alert('Appointment cancelled successfully');
      fetchData(); // Refreshes appointments
    } catch (e) {
      alert(e.response?.data?.message || 'Error cancelling appointment');
    }
  };

  const handleRefund = async (id) => {
    if (!window.confirm('Are you sure you want to refund this payment to the patient?')) return;
    try {
      await API.post(`/appointments/${id}/refund`);
      alert('Refund processed successfully');
      fetchData(); // Refreshes appointments
    } catch (e) {
      alert(e.response?.data?.message || 'Error processing refund');
    }
  };



  const typeLabels = {
    lab_report: '🧪 Lab Report', prescription: '💊 Prescription', scan: '📷 Scan',
    vaccination: '💉 Vaccination', other: '📄 Other'
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };
  const last7Days = getLast7Days();

  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
            const response = await API.post('/access/grant-by-scan', { healthId: qrData.healthId });
            setScanMessage(`✅ Access granted for ${qrData.healthId}!`);
            fetchData(); // Refresh patient list
          } catch (err) {
            console.error('QR Scan Error:', err);
            const apiError = err.response?.data?.message;
            setScanMessage(`❌ ${apiError || err.message || 'Invalid QR Code format'}`);
          }
        } else {
          setScanMessage('❌ No QR code found in the image.');
        }
        setScanning(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>👨‍⚕️ Doctor Portal</h1>
          <p className="page-subtitle">View patient records granted to you – read-only & blockchain-logged</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="chip" style={{ background: 'var(--primary-accent)', color: '#333', fontWeight: 700, fontSize: '1rem', padding: '8px 16px' }}>
            {user?.doctorCode || 'DR-XXXX'}
          </div>
          {mainTab === 'patients' && (
            <>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleQRUpload} />
              <button className="btn-primary" style={{ background: '#333' }} onClick={() => fileInputRef.current.click()}>
                <FiCamera style={{ marginRight: '8px' }} /> Scan Patient QR
              </button>
            </>
          )}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        {['patients', 'appointments', 'settings'].map(t => {
          const badgeCount = t === 'appointments' ? appointments.filter(a => a.isNewForDoctor).length : 0;
          return (
            <button key={t} style={{ position: 'relative' }} className={`filter-chip ${mainTab === t ? 'active' : ''}`} onClick={async () => {
              setMainTab(t);
              setSelectedPatient(null);
              if (t === 'appointments') {
                // Clear badge instantly in UI
                setAppointments(prev => prev.map(a => ({ ...a, isNewForDoctor: false })));
                // Persist seen status to backend
                try { await API.patch('/appointments/mark-seen'); } catch (_) {}
              }
            }}>
              {t === 'patients' ? '🧑 My Patients' : t === 'appointments' ? '📅 Appointments' : '⚙️ Settings'}
              {badgeCount > 0 && <span className="chat-badge" style={{ position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: '50%', background: 'red', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{badgeCount}</span>}
            </button>
          );
        })}
      </div>

      {scanMessage && (
        <div style={{ padding: '12px', background: scanMessage.startsWith('✅') ? '#e8f5e9' : scanMessage.startsWith('❌') ? '#ffebee' : '#e3f2fd', color: '#333', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {scanMessage}
        </div>
      )}

      {/* Doctor Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card stat-card"><p className="stat-label">Your Code</p><p className="stat-value">{stats.doctorCode}</p></div>
          <div className="card stat-card"><p className="stat-label">Specialty</p><p className="stat-value">{stats.specialty || '—'}</p></div>
          <div className="card stat-card"><p className="stat-label">Active Patients</p><p className="stat-value">{stats.totalActivePatients}</p></div>
          <div className="card stat-card"><p className="stat-label">Consultations</p><p className="stat-value">{stats.totalConsultations}</p></div>
        </div>
      )}

      {mainTab === 'patients' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedPatient ? '300px 1fr' : '1fr', gap: 24 }}>
          {/* Patient List */}
          <div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px' }}>🧑 My Patients ({patients.length})</h3>
            {loading ? <p>Loading...</p> : patients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
                <p>No patients yet</p>
                <p style={{ fontSize: '0.85rem' }}>Share your code <strong>{user?.doctorCode}</strong> with patients so they can grant you access.</p>
              </div>
            ) : (
              patients.map(p => (
                <div
                  key={p.permissionId}
                  onClick={() => selectPatient(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                    borderRadius: 10, cursor: 'pointer', marginBottom: 8,
                    background: selectedPatient?.permissionId === p.permissionId ? 'var(--primary-accent)' : 'var(--surface-container-low)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {p.patient?.name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>{p.patient?.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {p.patient?.healthId} • {p.accessType}
                      </p>
                    </div>
                    {unreadCounts[p.patient?._id] > 0 && (
                      <span className="chat-badge">{unreadCounts[p.patient._id]}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Patient Detail Panel */}
        {selectedPatient && (
          <div>
            {/* Patient Info Header */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedPatient.patient?.name}</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {selectedPatient.patient?.healthId} • {selectedPatient.patient?.bloodGroup || 'N/A'} • Age: {selectedPatient.patient?.age || 'N/A'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setActiveChat({ id: selectedPatient.patient._id, name: selectedPatient.patient.name }); setUnreadCounts(prev => ({...prev, [selectedPatient.patient._id]: 0})); }} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMessageCircle size={14} /> Chat {unreadCounts[selectedPatient.patient?._id] > 0 ? `(${unreadCounts[selectedPatient.patient._id]})` : ''}
                  </button>
                  <span className="chip" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{selectedPatient.accessType} access</span>
                  <span className="chip">Score: {selectedPatient.patient?.healthScore || '—'}</span>
                </div>
              </div>
              {(selectedPatient.patient?.allergies?.length > 0 || selectedPatient.patient?.chronicIllnesses?.length > 0) && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedPatient.patient?.allergies?.map(a => <span key={a} className="chip" style={{ background: '#ffebee', color: '#c62828' }}>⚠️ {a}</span>)}
                  {selectedPatient.patient?.chronicIllnesses?.map(c => <span key={c} className="chip" style={{ background: '#fff3e0', color: '#e65100' }}>{c}</span>)}
                </div>
              )}
            </div>

            {viewError && <div className="auth-error" style={{ marginBottom: 16 }}>{viewError}</div>}

            {/* Tabs */}
            <div className="filter-bar" style={{ marginBottom: 16 }}>
              {['records', 'medicines', 'simulation', 'addNote'].map(t => (
                <button key={t} className={`filter-chip ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                  {t === 'records' ? '📄 Records' : t === 'medicines' ? '💊 Medicines' : t === 'simulation' ? '🕒 Health Simulator' : '📝 Add Note'}
                </button>
              ))}
            </div>

            {/* Records Tab */}
            {activeTab === 'records' && (
              <div>
                {records.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p>No records found for this patient.</p>
                  </div>
                ) : records.map(r => (
                  <div key={r._id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0 }}>
                          {r.title}
                          {r.isVerified && <span className="chip chip-success" style={{ fontSize: '0.7rem', marginLeft: 8 }}>✓ Verified</span>}
                          {r.source === 'ai_ocr' && <span className="chip" style={{ fontSize: '0.7rem', marginLeft: 4 }}>🧠 AI</span>}
                          {r.source === 'doctor_note' && <span className="chip" style={{ fontSize: '0.7rem', marginLeft: 4, background: '#e3f2fd', color: '#1565c0' }}>👨‍⚕️ Doctor Note</span>}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', margin: '4px 0', fontSize: '0.85rem' }}>{r.description}</p>
                      </div>
                      <span className="chip">{typeLabels[r.type] || r.type}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                      {new Date(r.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {r.fileUrl && (
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={r.fileUrl.startsWith('http') ? r.fileUrl : `http://localhost:5000${r.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline"
                          style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <FiExternalLink size={12} /> View Document
                        </a>
                      </div>
                    )}
                    {r.aiParsedData?.keyMetrics?.length > 0 && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        {r.aiParsedData.keyMetrics.map((m, i) => (
                          <div key={i} className="chip" style={{ fontSize: '0.75rem' }}>
                            {m.name}: {m.value} {m.unit} ({m.status})
                          </div>
                        ))}
                      </div>
                    )}
                    {r.aiParsedData?.diagnosis && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(52, 120, 246, 0.05)', borderRadius: 8, borderLeft: '4px solid #1565c0' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1565c0' }}>Diagnosis</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{r.aiParsedData.diagnosis}</p>
                      </div>
                    )}
                    {r.aiParsedData?.medicines?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Prescribed Medicines</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {r.aiParsedData.medicines.map((m, i) => (
                            <div key={i} className="chip" style={{ fontSize: '0.75rem', background: '#fff9c4' }}>
                              💊 {m.name} ({m.dosage}) - {m.frequency}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.aiParsedData?.summary && r.source === 'ai_ocr' && (
                      <div style={{ marginTop: 12, fontSize: '0.85rem', fontStyle: 'italic', borderTop: '1px solid var(--outline)', paddingTop: 8 }}>
                        <p style={{ margin: 0 }}><strong>AI Summary:</strong> {r.aiParsedData.summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Medicines Tab */}
            {activeTab === 'medicines' && (
              <div>
                {medicines.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p>No medicines found for this patient.</p>
                  </div>
                ) : (
                  <div className="card" style={{ padding: 16 }}>
                    <table className="med-table" style={{ width: '100%' }}>
                      <thead>
                        <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Status</th><th>Adherence (7d)</th></tr>
                      </thead>
                      <tbody>
                        {medicines.map(m => (
                          <tr key={m._id}>
                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                            <td>{m.dosage}</td>
                            <td>{m.frequency?.replace(/_/g, ' ')}</td>
                            <td><span className={`chip ${m.isActive ? 'chip-success' : ''}`}>{m.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>
                              {(() => {
                                let daysCount = 7;
                                if (m.notes) {
                                  const match = m.notes.match(/(\d+)\s*days?/i);
                                  if (match) daysCount = parseInt(match[1]);
                                }

                                const trackDays = [];
                                for (let i = daysCount - 1; i >= 0; i--) {
                                  const d = new Date();
                                  d.setDate(d.getDate() - i);
                                  trackDays.push(d.toISOString().split('T')[0]);
                                }

                                return (
                                  <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{daysCount} Days</div>
                                    <div style={{ display: 'flex', gap: '3px', width: '80px', flexWrap: 'wrap' }}>
                                      {trackDays.map(dateStr => {
                                        const wasTaken = (m.adherenceLog || []).some(log => log.date && log.date.substring(0, 10) === dateStr && log.taken);
                                        return (
                                          <div
                                            key={dateStr} title={dateStr}
                                            style={{
                                              flex: daysCount > 10 ? '0 0 calc(20% - 3px)' : 1,
                                              height: '8px', borderRadius: '3px',
                                              background: wasTaken ? '#4caf50' : '#e0e0e0',
                                              marginBottom: daysCount > 10 ? '3px' : 0
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Simulation Tab */}
            {activeTab === 'simulation' && (
              <DoctorSimulation
                patientId={selectedPatient.patient._id}
                patientName={selectedPatient.patient.name}
              />
            )}

            {/* Add Note Tab */}
            {activeTab === 'addNote' && (
              <div className="card" style={{ padding: 24 }}>
                <h3>📝 Add Consultation Note</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
                  This note will appear in {selectedPatient.patient?.name}'s vault with your credentials.
                </p>
                <form onSubmit={submitNote}>
                  <div className="form-group">
                    <label>Consultation Title *</label>
                    <input value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="e.g., Follow-up for seasonal asthma" required />
                  </div>
                  <div className="form-group">
                    <label>Diagnosis</label>
                    <input value={noteForm.diagnosis} onChange={e => setNoteForm({ ...noteForm, diagnosis: e.target.value })} placeholder="e.g., Mild bronchial asthma" />
                  </div>
                  <div className="form-group">
                    <label>Clinical Notes</label>
                    <textarea value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} placeholder="Patient observations, recommendations..." rows={4} style={{ width: '100%', resize: 'vertical' }} />
                  </div>

                  <h4 style={{ marginTop: 16 }}>💊 Prescriptions</h4>
                  <table className="med-table" style={{ width: '100%', marginBottom: 12 }}>
                    <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th></th></tr></thead>
                    <tbody>
                      {noteForm.prescriptions.map((p, i) => (
                        <tr key={i}>
                          <td><input value={p.name} onChange={e => updatePrescription(i, 'name', e.target.value)} placeholder="Medicine name" style={{ width: '100%' }} /></td>
                          <td><input value={p.dosage} onChange={e => updatePrescription(i, 'dosage', e.target.value)} placeholder="500mg" style={{ width: '100%' }} /></td>
                          <td>
                            <select value={p.frequency} onChange={e => updatePrescription(i, 'frequency', e.target.value)} style={{ width: '100%' }}>
                              <option value="once_daily">Once Daily</option>
                              <option value="twice_daily">Twice Daily</option>
                              <option value="thrice_daily">Thrice Daily</option>
                              <option value="as_needed">As Needed</option>
                            </select>
                          </td>
                          <td><input value={p.duration} onChange={e => updatePrescription(i, 'duration', e.target.value)} placeholder="7 days" style={{ width: '100%' }} /></td>
                          <td><button type="button" onClick={() => removePrescription(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>❌</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" onClick={addPrescriptionRow} style={{ background: 'none', border: '1px dashed var(--outline)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginBottom: 16, width: '100%' }}>
                    + Add Medicine Row
                  </button>

                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    📋 Submit Consultation Note
                  </button>
                </form>
                {noteSuccess && <p style={{ marginTop: 12, fontWeight: 600, color: noteSuccess.startsWith('✅') ? '#2e7d32' : '#c62828' }}>{noteSuccess}</p>}
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {mainTab === 'appointments' && (
        <div className="card" style={{ padding: 24 }}>
          <h3>📅 Upcoming Appointments</h3>
          {appointments.length === 0 ? (
            <p className="text-muted">No appointments scheduled.</p>
          ) : (
            <div className="access-grid">
              {appointments.filter(apt => apt.status === 'scheduled').map(apt => (
                <div key={apt._id} className="card access-card">
                  <div className="access-card-header">
                    <div className="access-info">
                      <strong>{apt.patient?.name}</strong>
                      <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>{apt.date} at {apt.timeSlot}</span>
                    </div>
                    {apt.status === 'scheduled' && (
                      <button 
                        className="btn-ghost" 
                        style={{ color: 'var(--error)', padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleCancelAppointment(apt._id)}
                      >
                        Cancel
                      </button>
                    )}
                    {apt.paymentStatus === 'paid' && (
                      <button 
                        className="btn-ghost" 
                        style={{ color: '#1b6968', padding: '4px 8px', fontSize: '0.75rem', marginLeft: '8px' }}
                        onClick={() => handleRefund(apt._id)}
                      >
                        Refund
                      </button>
                    )}
                  </div>

                  <div className="access-meta">
                    <span className="chip" style={{ background: apt.type === 'online' ? '#e3f2fd' : '#fff3e0' }}>
                      {apt.type === 'online' ? '🌐 Online' : '🏥 In-Person'}
                    </span>
                    <span className={`chip ${apt.paymentStatus === 'paid' ? 'chip-success' : 'chip-warning'}`}>
                      {apt.paymentStatus === 'paid' ? '💳 Paid' : '⏳ Pending'}
                    </span>
                    <span className={`chip ${apt.status === 'scheduled' ? 'chip-info' : 'chip-danger'}`} style={{ marginLeft: 'auto' }}>
                      {apt.status === 'scheduled' ? '📅 Scheduled' : '❌ Cancelled'}
                    </span>
                  </div>
                  {apt.type === 'online' && apt.paymentStatus === 'paid' && apt.status === 'scheduled' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button className="btn-outline" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }} onClick={() => { setActiveChat({ id: apt.patient._id, name: apt.patient.name }); setUnreadCounts(prev => ({...prev, [apt.patient._id]: 0})); }}>
                        <FiMessageCircle size={16} /> Chat
                      </button>
                      <button className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }} onClick={() => setActiveVideo({ id: apt._id, name: `Consultation with ${apt.patient.name}` })}>
                        <FiVideo size={16} /> Video
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

          )}
        </div>
      )}

      {mainTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.5fr) 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Settings */}
          <div className="card" style={{ padding: 24 }}>
            <h3>⚙️ Doctor Settings</h3>
            <p className="text-muted" style={{ marginBottom: 20 }}>Configure your consultation fees, payment QR, and working hours.</p>
            
            <div className="form-group">
              <label>Consultation Fee (₹)</label>
              <input type="number" value={settings.consultationFee} onChange={e => setSettings({...settings, consultationFee: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Payment UPI ID / Info</label>
              <input type="text" value={settings.paymentUPI} placeholder="doctor@upi" onChange={e => setSettings({...settings, paymentUPI: e.target.value})} />
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>Patients will use this UPI ID or a QR code generated for it.</p>
            </div>
            
            <div className="form-row">
               <div className="form-group">
                 <label>Working Hours Start</label>
                 <input type="time" value={settings.availableTimeStart} onChange={e => setSettings({...settings, availableTimeStart: e.target.value})} />
               </div>
               <div className="form-group">
                 <label>Working Hours End</label>
                 <input type="time" value={settings.availableTimeEnd} onChange={e => setSettings({...settings, availableTimeEnd: e.target.value})} />
               </div>
            </div>
            
            <div className="form-group">
               <label>Working Days</label>
               <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--surface-container-low)', borderRadius: 20, cursor: 'pointer' }}>
                      <input type="checkbox" checked={settings.availableDays.includes(day)} onChange={e => {
                         const newDays = e.target.checked 
                           ? [...settings.availableDays, day] 
                           : settings.availableDays.filter(d => d !== day);
                         setSettings({...settings, availableDays: newDays});
                      }} />
                      {day.substring(0, 3)}
                    </label>
                  ))}
               </div>
            </div>
            
            <button className="btn-primary" onClick={async () => {
               try {
                  await API.post('/doctor/settings', settings);
                  alert('Settings saved successfully!');
               } catch (e) { alert('Error saving settings'); }
            }} style={{ marginTop: 16 }}>Save Settings</button>
          </div>

          {/* Right Column: Appointment History */}
          <div className="card" style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>📜 Appointment History</h3>
            <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.85rem' }}>Full log of scheduled and cancelled consultations.</p>
            
            {appointments.length === 0 ? (
              <p className="text-muted">No appointment history found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...appointments].reverse().map(apt => (
                  <div key={apt._id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '12px', background: apt.status === 'cancelled' ? 'var(--surface-container-low)' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{apt.patient?.name || 'Patient'}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                           {apt.date} • {apt.timeSlot}
                        </p>
                      </div>
                      <span className={`chip ${apt.status === 'cancelled' ? 'chip-danger' : 'chip-info'}`} style={{ fontSize: '0.65rem' }}>
                        {apt.status === 'scheduled' ? 'Scheduled' : apt.status === 'cancelled' ? 'Cancelled' : apt.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                       <span className="text-muted">{apt.type === 'online' ? '🌐 Online' : '🏥 In-Person'}</span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>₹{apt.amountPaid || 500} • </span>
                          <span className={`chip ${apt.paymentStatus === 'refunded' ? 'chip-danger' : 'chip-success'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            {apt.paymentStatus.toUpperCase()}
                          </span>
                          {apt.paymentStatus === 'paid' && (
                            <button 
                              onClick={() => handleRefund(apt._id)}
                              className="btn-outline" 
                              style={{ fontSize: '0.65rem', padding: '2px 8px', borderColor: 'var(--error)', color: 'var(--error)' }}
                            >
                              Refund
                            </button>
                          )}
                       </div>
                    </div>
                  </div>

                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {activeChat && (
        <ChatModal
          partnerId={activeChat.id}
          partnerName={activeChat.name}
          partnerRole="patient"
          onClose={() => setActiveChat(null)}
        />
      )}

      {activeVideo && (
        <VideoModal
          roomId={activeVideo.id}
          title={activeVideo.name}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
