import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoPermissions, isDemoUser } from '../utils/demoData';
import API from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { FiPlus, FiShield, FiSearch, FiTrash2, FiAlertCircle, FiEdit2, FiMessageCircle } from 'react-icons/fi';
import ChatModal from '../components/ChatModal';
import './Pages.css';

const AccessControl = () => {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [permissions, setPermissions] = useState(isDemo ? demoPermissions : []);
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [emergencyQR, setEmergencyQR] = useState(null);
  const [form, setForm] = useState({ doctorCode: '', doctorName: '', doctorSpecialty: '', hospital: '', accessType: 'limited', allowedRecords: [], allowMedicines: false });
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userRecords, setUserRecords] = useState([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    if (!isDemo) fetchPermissions();
  }, [isDemo]);

  const fetchPermissions = async () => {
    try {
      const [permRes, recordsRes] = await Promise.all([
        API.get('/access'),
        API.get('/records')
      ]);
      setPermissions(permRes.data || []);
      setUserRecords(recordsRes.data || []);
    } catch { /* empty for new users */ }
  };

  // Search doctors by code or name
  const handleDoctorSearch = async (query) => {
    setForm({ ...form, doctorCode: query });
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await API.get(`/auth/doctors/search?q=${query}`);
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const selectDoctor = (doctor) => {
    setForm({
      doctorCode: doctor.doctorCode || '',
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty || '',
      hospital: doctor.hospital || '',
      accessType: form.accessType,
      doctorId: doctor._id
    });
    setSearchResults([]);
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!form.doctorName.trim() && !editMode) return;
    setSaving(true);
    try {
      if (editMode) {
        const { data } = await API.put(`/access/${editId}/edit`, { accessType: form.accessType, allowedRecords: form.allowedRecords, allowMedicines: form.allowMedicines });
        setPermissions(prev => prev.map(p => p._id === editId ? data : p));
      } else {
        const { data } = await API.post('/access/grant', form);
        setPermissions(prev => [data, ...prev]);
      }
    } catch {
      if (!editMode) {
        const local = { _id: 'perm_' + Date.now(), ...form, isActive: true, grantedAt: new Date().toISOString() };
        setPermissions(prev => [local, ...prev]);
      }
    }
    setForm({ doctorCode: '', doctorName: '', doctorSpecialty: '', hospital: '', accessType: 'limited', allowedRecords: [], allowMedicines: false });
    setShowForm(false);
    setEditMode(false);
    setEditId(null);
    setSaving(false);
  };

  const handleEdit = (perm) => {
    setForm({
      doctorCode: perm.doctorCode || '',
      doctorName: perm.doctorName || '',
      doctorSpecialty: perm.doctorSpecialty || '',
      hospital: perm.hospital || '',
      accessType: perm.accessType,
      allowedRecords: perm.allowedRecords || [],
      allowMedicines: perm.allowMedicines || false
    });
    setEditMode(true);
    setEditId(perm._id);
    setShowForm(true);
  };

  const handleRecordSelection = (recordId) => {
    setForm(prev => {
      const current = prev.allowedRecords || [];
      if (current.includes(recordId)) {
        return { ...prev, allowedRecords: current.filter(id => id !== recordId) };
      } else {
        return { ...prev, allowedRecords: [...current, recordId] };
      }
    });
  };

  const togglePermission = async (id) => {
    setPermissions(prev => prev.map(p => p._id === id ? { ...p, isActive: !p.isActive } : p));
    try { await API.put(`/access/${id}/toggle`); } catch { /* toggled locally */ }
  };

  const revokePermission = async (id) => {
    setPermissions(prev => prev.filter(p => p._id !== id));
    try { await API.delete(`/access/${id}`); } catch { /* removed locally */ }
  };

  const generateEmergencyQR = async () => {
    setShowQR(true);
    try {
      const { data } = await API.get('/access/emergency-qr');
      setEmergencyQR(data);
    } catch {
      // Fallback for demo
      setEmergencyQR({
        data: {
          healthId: user?.healthId || 'HV-DEMO',
          name: user?.name || 'User',
          bloodGroup: user?.bloodGroup || '—',
          allergies: user?.allergies || [],
          conditions: user?.chronicIllnesses || [],
          medications: user?.currentMedications || []
        }
      });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🔐 Access Control</h1>
          <p className="text-muted">Manage who can access your health records</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn-ghost" onClick={() => { setShowForm(!showForm); setEditMode(false); }}><FiPlus /> Grant Access</button>
          <button className="btn-primary emergency-btn" onClick={generateEmergencyQR}>🆘 Emergency QR</button>
        </div>
      </div>

      {/* Emergency QR */}
      {showQR && emergencyQR && (
        <div className="card qr-card">
          <div className="qr-content">
            <div className="qr-code">
              {emergencyQR.qrCode ? (
                <img src={emergencyQR.qrCode} alt="Emergency QR" style={{ width: '200px', height: '200px' }} />
              ) : (
                <QRCodeSVG value={JSON.stringify(emergencyQR.data)} size={200} fgColor="#1b6968" />
              )}
            </div>
            <div className="qr-info">
              <h3>🆘 Emergency Medical QR Code</h3>
              <p className="text-muted" style={{ marginBottom: '12px' }}>Show this to any medical professional for instant access to critical info.</p>
              <ul>
                <li>🏷️ Health ID: <strong>{emergencyQR.data?.healthId}</strong></li>
                <li>🩸 Blood Group: <strong>{emergencyQR.data?.bloodGroup || '—'}</strong></li>
                <li>⚠️ Allergies: <strong>{emergencyQR.data?.allergies?.join(', ') || 'None'}</strong></li>
                <li>🏥 Conditions: <strong>{emergencyQR.data?.conditions?.join(', ') || 'None'}</strong></li>
                <li>💊 Medications: <strong>{emergencyQR.data?.medications?.join(', ') || 'None'}</strong></li>
                {emergencyQR.data?.emergencyContact && (
                  <li>📞 Emergency Contact: <strong>{emergencyQR.data.emergencyContact.name} ({emergencyQR.data.emergencyContact.phone})</strong></li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Grant Access Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>{editMode ? 'Edit Access Profile' : 'Grant Doctor Access'}</h4>
          <form onSubmit={handleGrant}>
            {!editMode && (
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Search Doctor (by code, name, or specialty)</label>
                <div className="flex items-center gap-sm">
                  <FiSearch size={16} color="var(--outline)" />
                  <input
                    value={form.doctorCode}
                    onChange={e => handleDoctorSearch(e.target.value)}
                    placeholder="Type DR-XXXX or doctor name..."
                    autoComplete="off"
                  />
                </div>
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="doctor-search-results">
                    {searchResults.map(doc => (
                      <div key={doc._id} className="doctor-result" onClick={() => selectDoctor(doc)}>
                        <strong>{doc.name}</strong>
                        <span className="chip" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>{doc.doctorCode}</span>
                        <p className="text-muted" style={{ fontSize: '0.78rem' }}>{doc.specialty} · {doc.hospital}</p>
                      </div>
                    ))}
                  </div>
                )}
                {searching && <p className="text-muted" style={{ fontSize: '0.78rem' }}>Searching...</p>}
              </div>
            )}

            <div className="form-row">
              <div className="form-group"><label>Doctor Name *</label>
                <input value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Full Name" disabled={editMode} required />
              </div>
              <div className="form-group"><label>Specialty</label>
                <input value={form.doctorSpecialty} onChange={e => setForm({ ...form, doctorSpecialty: e.target.value })} disabled={editMode} placeholder="e.g., Cardiologist" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Hospital</label>
                <input value={form.hospital} onChange={e => setForm({ ...form, hospital: e.target.value })} disabled={editMode} placeholder="Hospital / Clinic name" />
              </div>
              <div className="form-group"><label>Access Level</label>
                <select value={form.accessType} onChange={e => setForm({ ...form, accessType: e.target.value })}>
                  <option value="full">Full Access</option>
                  <option value="limited">Limited (Lab Reports Only)</option>
                  <option value="emergency">Emergency Only</option>
                  <option value="custom">Custom (Select Specific Records)</option>
                </select>
              </div>
            </div>

            {form.accessType === 'custom' && (
              <div className="form-group" style={{ marginTop: '16px', background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ margin: 0, fontWeight: 600 }}>Select Specific Records</label>
                  {userRecords.length > 0 && (
                    <div style={{ position: 'relative', width: '200px' }}>
                      <FiSearch size={14} color="var(--outline)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text" 
                        placeholder="Search records..." 
                        value={recordSearch}
                        onChange={e => setRecordSearch(e.target.value)}
                        style={{ paddingLeft: '32px', margin: 0, height: '32px', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>
                
                {userRecords.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>No records found in your vault.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '12px 8px', borderRadius: '6px', backgroundColor: form.allowMedicines ? '#fff59d' : '#f5f5f5', borderBottom: '2px solid var(--border)', transition: 'background-color 0.2s', marginBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={form.allowMedicines}
                        onChange={(e) => setForm({ ...form, allowMedicines: e.target.checked })}
                        style={{ margin: 0, width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.95rem', color: '#f57f17' }}>💊 Include Active Prescriptions & Medications</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Allow this doctor to view your current pharmacy records and adherence.</span>
                      </div>
                    </label>

                    {userRecords.filter(r => r.title.toLowerCase().includes(recordSearch.toLowerCase()) || (r.aiParsedData?.summary || '').toLowerCase().includes(recordSearch.toLowerCase())).map(record => (
                      <label key={record._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500', cursor: 'pointer', padding: '8px', borderRadius: '6px', backgroundColor: (form.allowedRecords || []).includes(record._id) ? '#e0f2f1' : 'transparent', transition: 'background-color 0.2s' }}>
                        <input
                          type="checkbox"
                          checked={(form.allowedRecords || []).includes(record._id)}
                          onChange={() => handleRecordSelection(record._id)}
                          style={{ margin: 0, width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{record.title}</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(record.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        {record.source === 'ai_ocr' && <span className="chip" style={{ fontSize: '0.65rem' }}>🧠 AI Parsed</span>}
                      </label>
                    ))}
                    {userRecords.filter(r => r.title.toLowerCase().includes(recordSearch.toLowerCase()) || (r.aiParsedData?.summary || '').toLowerCase().includes(recordSearch.toLowerCase())).length === 0 && (
                       <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No matches found for "{recordSearch}"</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : (editMode ? '💾 Update Access' : '🔓 Grant Access')}</button>
              {editMode && <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {/* Empty State */}
      {permissions.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h3>🔐 No Access Granted</h3>
          <p className="text-muted" style={{ margin: '12px 0 20px' }}>Grant doctors access to your health records securely.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Grant Your First Access</button>
        </div>
      )}

      {/* Permissions Grid */}
      <div className="access-grid">
        {permissions.map(perm => (
          <div key={perm._id} className={`card access-card ${perm.isActive ? '' : 'inactive'}`}>
            <div className="access-card-header">
              <div className="access-avatar">
                <span>{perm.doctorName?.charAt(0) || 'D'}</span>
              </div>
              <div className="access-info">
                <strong>
                  {perm.doctorName}
                  {perm.doctorCode && <span className="chip" style={{ marginLeft: '6px', fontSize: '0.68rem' }}>{perm.doctorCode}</span>}
                </strong>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{perm.doctorSpecialty}</p>
                {perm.hospital && <p className="text-muted" style={{ fontSize: '0.75rem' }}>🏥 {perm.hospital}</p>}
              </div>
              <div className={`toggle ${perm.isActive ? 'active' : ''}`} onClick={() => togglePermission(perm._id)}></div>
            </div>
            <div className="access-meta">
              <span className={`chip ${perm.accessType === 'full' ? 'chip-success' : perm.accessType === 'emergency' ? 'chip-danger' : perm.accessType === 'custom' ? 'chip-warning' : ''}`}>
                {perm.accessType === 'full' ? '🔓 Full' : perm.accessType === 'emergency' ? '🆘 Emergency' : perm.accessType === 'custom' ? '🎯 Custom' : '📄 Limited'}
              </span>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                Since {new Date(perm.grantedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                {perm.isActive && (
                  <button onClick={() => setActiveChat({ id: perm.doctor || perm.doctorId, name: perm.doctorName })} title="Chat with Doctor" style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', color: 'white', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                    <FiMessageCircle size={14} /> Chat
                  </button>
                )}
                <button onClick={() => handleEdit(perm)} title="Edit Access" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }}>
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => revokePermission(perm._id)} title="Revoke Access" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '4px' }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeChat && (
        <ChatModal
          partnerId={activeChat.id}
          partnerName={activeChat.name}
          partnerRole="doctor"
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
};

export default AccessControl;
