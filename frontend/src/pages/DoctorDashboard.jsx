import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, statsRes] = await Promise.all([
        API.get('/doctor/my-patients'),
        API.get('/doctor/stats')
      ]);
      setPatients(patientsRes.data);
      setStats(statsRes.data);
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

  const typeLabels = {
    lab_report: '🧪 Lab Report', prescription: '💊 Prescription', scan: '📷 Scan',
    vaccination: '💉 Vaccination', other: '📄 Other'
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>👨‍⚕️ Doctor Portal</h1>
          <p className="page-subtitle">View patient records granted to you – read-only & blockchain-logged</p>
        </div>
        <div className="chip" style={{ background: 'var(--primary-accent)', color: '#333', fontWeight: 700, fontSize: '1rem', padding: '8px 16px' }}>
          {user?.doctorCode || 'DR-XXXX'}
        </div>
      </div>

      {/* Doctor Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card stat-card"><p className="stat-label">Your Code</p><p className="stat-value">{stats.doctorCode}</p></div>
          <div className="card stat-card"><p className="stat-label">Specialty</p><p className="stat-value">{stats.specialty || '—'}</p></div>
          <div className="card stat-card"><p className="stat-label">Active Patients</p><p className="stat-value">{stats.totalActivePatients}</p></div>
          <div className="card stat-card"><p className="stat-label">Consultations</p><p className="stat-value">{stats.totalConsultations}</p></div>
        </div>
      )}

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
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>{p.patient?.name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {p.patient?.healthId} • {p.accessType}
                    </p>
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
                <div style={{ display: 'flex', gap: 8 }}>
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
              {['records', 'medicines', 'addNote'].map(t => (
                <button key={t} className={`filter-chip ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                  {t === 'records' ? '📄 Records' : t === 'medicines' ? '💊 Medicines' : '📝 Add Note'}
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
                    {r.aiParsedData?.keyMetrics?.length > 0 && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        {r.aiParsedData.keyMetrics.map((m, i) => (
                          <div key={i} className="chip" style={{ fontSize: '0.75rem' }}>
                            {m.name}: {m.value} {m.unit} ({m.status})
                          </div>
                        ))}
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
                        <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Status</th><th>Prescribed By</th></tr>
                      </thead>
                      <tbody>
                        {medicines.map(m => (
                          <tr key={m._id}>
                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                            <td>{m.dosage}</td>
                            <td>{m.frequency?.replace(/_/g, ' ')}</td>
                            <td><span className={`chip ${m.isActive ? 'chip-success' : ''}`}>{m.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>{m.prescribedBy || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
    </div>
  );
};

export default DoctorDashboard;
