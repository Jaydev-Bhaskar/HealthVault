import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoPermissions, isDemoUser } from '../utils/demoData';
import API from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { FiPlus, FiShield, FiSearch, FiTrash2, FiAlertCircle, FiEdit2, FiMessageCircle, FiVideo } from 'react-icons/fi';
import ChatModal from '../components/ChatModal';
import VideoModal from '../components/VideoModal';
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
  const [activeVideo, setActiveVideo] = useState(null);
  const [myAppointments, setMyAppointments] = useState([]);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingForm, setBookingForm] = useState({ date: '', timeSlot: '', type: 'online' });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!isDemo) fetchPermissions();
  }, [isDemo]);

  const fetchPermissions = async () => {
    try {
      const [permRes, recordsRes, apptRes] = await Promise.all([
        API.get('/access'),
        API.get('/records'),
        API.get('/appointments/my-appointments').catch(() => ({ data: [] }))
      ]);
      setPermissions(permRes.data || []);
      setUserRecords(recordsRes.data || []);
      setMyAppointments(apptRes.data || []);
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

  const loadSlots = async (docId, date) => {
    try {
       const { data } = await API.get(`/appointments/doctor/${docId}/slots?date=${date}`);
       setAvailableSlots(data.slots || []);
    } catch (e) {
       setAvailableSlots([]);
    }
  };

  // Fetch live doctor settings (fee, UPI) before opening booking
  const openBooking = async (docId, fallback) => {
    try {
      const { data } = await API.get(`/auth/doctors/search?q=${fallback.name || ''}`);
      const found = data.find(d => d._id === docId) || fallback;
      setBookingDoctor({
        _id: docId,
        name: found.name || fallback.name,
        specialty: found.specialty || fallback.specialty,
        hospital: found.hospital || fallback.hospital,
        consultationFee: found.consultationFee || 500,
        paymentUPI: found.paymentUPI || 'doctor@upi'
      });
    } catch {
      setBookingDoctor({ ...fallback, consultationFee: fallback.consultationFee || 500, paymentUPI: fallback.paymentUPI || 'doctor@upi' });
    }
    setBookingForm({ date: '', timeSlot: '', type: 'online' });
    setShowForm(false);
    setShowPayment(false);
  };

  const handleBooking = async () => {
    setSaving(true);
    try {
      await API.post('/appointments/book', {
         doctorId: bookingDoctor._id,
         date: bookingForm.date,
         timeSlot: bookingForm.timeSlot,
         type: bookingForm.type,
         amount: bookingDoctor.consultationFee,
         transactionId: 'UPI_' + Date.now()
      });
      setShowPayment(false);
      setBookingDoctor(null);
      await fetchPermissions(); // Refreshes appointments
      setToastMsg('Payment done Successfully');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (e) { alert('Error booking appointment'); }
    setSaving(false);
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setSaving(true);
    try {
      await API.post(`/appointments/${id}/cancel`);
      setToastMsg('Appointment cancelled successfully');
      setTimeout(() => setToastMsg(''), 3000);
      await fetchPermissions(); // Refreshes appointments
    } catch (e) {
      alert(e.response?.data?.message || 'Error cancelling appointment');
    }
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
                      <div key={doc._id} className="doctor-result" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div onClick={() => selectDoctor(doc)} style={{ flex: 1 }}>
                          <strong>{doc.name}</strong>
                          <span className="chip" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>{doc.doctorCode}</span>
                          <p className="text-muted" style={{ fontSize: '0.78rem' }}>{doc.specialty} · {doc.hospital}</p>
                          <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--primary)' }}>Fee: ₹{doc.consultationFee || 500}</p>
                        </div>
                        <button type="button" className="btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => { setBookingDoctor(doc); setBookingForm({ date: '', timeSlot: '', type: 'online' }); setShowForm(false); }}>
                          Book
                        </button>
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

      {/* Booking Modal & Payment Overlay */}
      {bookingDoctor && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <h3 style={{ margin: 0 }}>{showPayment ? '💳 Complete Payment' : '📅 Book Appointment'}</h3>
               <button type="button" onClick={() => { setBookingDoctor(null); setShowPayment(false); }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
             </div>
             
             {!showPayment ? (
               <>
                 <div style={{ padding: '12px', background: 'var(--surface-container-low)', borderRadius: '8px', marginBottom: 16 }}>
                   <strong>{bookingDoctor.name}</strong>
                   <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{bookingDoctor.specialty} • ₹{bookingDoctor.consultationFee || 500}</p>
                 </div>
                 <div className="form-group">
                   <label>Consultation Type</label>
                   <select value={bookingForm.type} onChange={e => setBookingForm({...bookingForm, type: e.target.value})}>
                     <option value="online">🌐 Online Video / Chat</option>
                     <option value="in-person">🏥 In-Person at Hospital</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Select Date</label>
                   <input type="date" min={new Date().toISOString().split('T')[0]} value={bookingForm.date} onChange={e => {
                      setBookingForm({...bookingForm, date: e.target.value, timeSlot: ''});
                      loadSlots(bookingDoctor._id, e.target.value);
                   }} />
                 </div>
                 {bookingForm.date && (
                   <div className="form-group">
                     <label>Select Time Slot</label>
                     {availableSlots.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>No slots available for this date.</p>
                     ) : (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {availableSlots.map(slot => (
                             <button key={slot} type="button" className={`chip ${bookingForm.timeSlot === slot ? 'chip-success' : ''}`} onClick={() => setBookingForm({...bookingForm, timeSlot: slot})}>
                               {slot}
                             </button>
                          ))}
                        </div>
                     )}
                   </div>
                 )}
                 <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={!bookingForm.timeSlot} onClick={() => setShowPayment(true)}>
                   💳 Pay to Proceed ₹{bookingDoctor?.consultationFee || 500}
                 </button>
               </>
             ) : (
               <div style={{ textAlign: 'center' }}>
                 <p className="text-muted" style={{ marginBottom: 16 }}>Scan the QR Code using any UPI app to pay Dr. {bookingDoctor.name.split(' ')[1] || bookingDoctor.name}</p>
                 <div style={{ background: 'white', padding: 16, display: 'inline-block', borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}>
                   <QRCodeSVG value={`upi://pay?pa=${bookingDoctor.paymentUPI || 'doctor@ybl'}&am=${bookingDoctor.consultationFee || 500}&cu=INR`} size={200} />
                 </div>
                 <p style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 24 }}>Amount: ₹{bookingDoctor.consultationFee || 500}</p>
                 <div style={{ display: 'flex', gap: 12 }}>
                   <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowPayment(false)}>Back</button>
                   <button className="btn-primary" style={{ flex: 2, background: '#2e7d32' }} onClick={handleBooking} disabled={saving}>
                     {saving ? 'Confirming...' : '✅ I Have Paid'}
                   </button>
                 </div>
               </div>
             )}
           </div>
        </div>
      )}

      {/* Appointments Grid */}
      {myAppointments.length > 0 && !showForm && !bookingDoctor && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>📅 Upcoming Consultations</h3>
          <div className="access-grid">
            {myAppointments.filter(apt => apt && apt.doctor && apt.status === 'scheduled').map(apt => {
               const doc = apt.doctor;
               return (
                 <div key={apt._id} className="card access-card">
                  <div className="access-card-header">
                    <div className="access-info">
                      <strong>{doc?.name || 'Doctor'}</strong>
                      <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>{apt.date} at {apt.timeSlot}</span>
                    </div>
                    {apt.status === 'scheduled' && (
                      <button 
                        className="btn-ghost" 
                        style={{ color: 'var(--error)', padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleCancelAppointment(apt._id)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="access-meta">
                    <span className="chip" style={{ background: apt.type === 'online' ? '#e3f2fd' : '#fff3e0' }}>
                      {apt.type === 'online' ? '🌐 Online' : '🏥 In-Person'}
                    </span>
                    <span className={`chip ${apt.paymentStatus === 'paid' ? 'chip-success' : apt.paymentStatus === 'refunded' ? 'chip-danger' : 'chip-warning'}`}>
                      {apt.paymentStatus === 'paid' ? '💳 Paid' : apt.paymentStatus === 'refunded' ? '💸 Refunded' : '⏳ Pending'}
                    </span>

                    <span className={`chip ${apt.status === 'scheduled' ? 'chip-info' : 'chip-danger'}`} style={{ marginLeft: 'auto' }}>
                      {apt.status === 'scheduled' ? '📅 Scheduled' : '❌ Cancelled'}
                    </span>
                  </div>
                  {apt.type === 'online' && apt.paymentStatus === 'paid' && apt.status === 'scheduled' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button className="btn-outline" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }} onClick={() => setActiveChat({ id: doc?._id, name: doc?.name || 'Doctor' })}>
                        <FiMessageCircle size={16} /> Chat
                      </button>
                      <button className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }} onClick={() => setActiveVideo({ id: apt._id, name: `Consultation with Dr. ${doc?.name || ''}` })}>
                        <FiVideo size={16} /> Video
                      </button>
                    </div>
                  )}
                 </div>
               );
            })}

          </div>
        </div>
      )}

      {/* Permissions Grid */}
      {permissions.length > 0 && !showForm && !bookingDoctor && (
        <>
          <h3 style={{ marginBottom: '16px', marginTop: '16px' }}>🔐 Active Access Permissions</h3>
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
                  <>
                    <button onClick={() => setActiveChat({ id: perm.doctor || perm.doctorId, name: perm.doctorName })} title="Chat with Doctor" style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      💬 Chat
                    </button>
                    <button onClick={() => openBooking(perm.doctor || perm.doctorId, {
                          name: perm.doctorName,
                          specialty: perm.doctorSpecialty,
                          hospital: perm.hospital
                      })} title="Book Appointment" style={{ background: 'var(--primary-dark)', border: 'none', cursor: 'pointer', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      📅 Book
                    </button>
                  </>
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
        </>
      )}

      {activeChat && (
        <ChatModal
          partnerId={activeChat.id}
          partnerName={activeChat.name}
          partnerRole="doctor"
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

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#2e7d32', color: '#fff', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10000, transition: 'all 0.3s ease' }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default AccessControl;
