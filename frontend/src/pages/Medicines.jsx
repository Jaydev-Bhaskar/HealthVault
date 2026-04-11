import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { isDemoUser } from '../utils/demoData';
import { FiPlus, FiClock, FiCheck, FiAlertCircle, FiBell, FiTrash2, FiCalendar, FiMinus } from 'react-icons/fi';
import API from '../utils/api';
import './Pages.css';

const demoMedicines = [
  { _id: 'm1', name: 'Montelukast', dosage: '10mg', frequency: 'once_daily', timings: ['09:00 PM'], isActive: true, prescribedBy: 'Dr. Rohit Sharma', notes: 'For asthma', startDate: '2026-01-15', refillDate: '2026-04-20', adherenceLog: [], sideEffects: ['Headache'] },
  { _id: 'm2', name: 'Cetirizine', dosage: '5mg', frequency: 'once_daily', timings: ['10:00 AM'], isActive: true, prescribedBy: 'Dr. Rohit Sharma', notes: 'As needed for allergies', startDate: '2026-03-28', refillDate: null, adherenceLog: [], sideEffects: [] },
  { _id: 'm3', name: 'Vitamin D3', dosage: '60000 IU', frequency: 'weekly', timings: ['After Breakfast'], isActive: true, prescribedBy: 'Dr. Priya Desai', notes: 'Weekly supplement', startDate: '2026-02-01', refillDate: '2026-04-15', adherenceLog: [], sideEffects: [] },
];

const EMPTY_MED = { name: '', dosage: '', frequency: 'once_daily', timings: ['09:00 AM'] };

const Medicines = () => {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [medicines, setMedicines] = useState(isDemo ? demoMedicines : []);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);
  const [takenMap, setTakenMap] = useState({});
  const [prescribedBy, setPrescribedBy] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [batchMeds, setBatchMeds] = useState([{ ...EMPTY_MED }, { ...EMPTY_MED }, { ...EMPTY_MED }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isDemo) fetchMedicines();
  }, [isDemo]);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  const fetchMedicines = async () => {
    try {
      const { data } = await API.get('/medicines');
      setMedicines(data || []);
    } catch { /* empty for new users */ }
  };

  const addRow = () => setBatchMeds([...batchMeds, { ...EMPTY_MED }]);
  const removeRow = (i) => setBatchMeds(batchMeds.filter((_, idx) => idx !== i));

  const updateBatchMed = (index, field, value) => {
    const updated = [...batchMeds];
    updated[index] = { ...updated[index], [field]: value };
    setBatchMeds(updated);
  };

  const handleBatchAdd = async (e) => {
    e.preventDefault();
    const validMeds = batchMeds.filter(m => m.name.trim() && m.dosage.trim());
    if (validMeds.length === 0) return;

    setSaving(true);
    const payload = validMeds.map(m => ({
      ...m,
      prescribedBy,
      notes: batchNotes
    }));

    try {
      const { data } = await API.post('/medicines/batch', { medicines: payload });
      setMedicines(prev => [...(data.medicines || []), ...prev]);
    } catch {
      // Fallback: add locally
      const local = payload.map((m, i) => ({ _id: 'local_' + Date.now() + i, ...m, isActive: true, startDate: new Date().toISOString(), adherenceLog: [], sideEffects: [] }));
      setMedicines(prev => [...local, ...prev]);
    }

    setBatchMeds([{ ...EMPTY_MED }, { ...EMPTY_MED }, { ...EMPTY_MED }]);
    setPrescribedBy('');
    setBatchNotes('');
    setShowForm(false);
    setSaving(false);
  };

  const markTaken = async (medId, timing) => {
    const key = `${medId}_${timing}`;
    setTakenMap(prev => ({ ...prev, [key]: true }));
    try { await API.post(`/medicines/${medId}/taken`, { timing }); } catch { /* marked locally */ }
  };

  const deleteMedicine = async (medId) => {
    setMedicines(prev => prev.filter(m => m._id !== medId));
    try { await API.delete(`/medicines/${medId}`); } catch { /* already removed */ }
  };

  const toggleActive = async (medId) => {
    setMedicines(prev => prev.map(m => m._id === medId ? { ...m, isActive: !m.isActive } : m));
    try {
      const med = medicines.find(m => m._id === medId);
      await API.put(`/medicines/${medId}`, { isActive: !med.isActive });
    } catch { /* toggled locally */ }
  };

  const freqLabels = { once_daily: 'Once Daily', twice_daily: 'Twice Daily', thrice_daily: '3x Daily', weekly: 'Weekly', as_needed: 'As Needed' };
  const timingOptions = ['06:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '06:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', 'After Breakfast', 'After Lunch', 'After Dinner', 'Before Bed'];

  const activeMeds = medicines.filter(m => m.isActive);
  const inactiveMeds = medicines.filter(m => !m.isActive);

  const needsRefill = medicines.filter(m => {
    if (!m.refillDate) return false;
    const diff = new Date(m.refillDate) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>💊 Medicine Manager</h1>
          <p className="text-muted">Track your medications, never miss a dose</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> Add Medicines</button>
      </div>

      {/* Refill Alerts */}
      {needsRefill.length > 0 && (
        <div className="card" style={{ background: '#fff8e1', borderLeft: '4px solid #f57f17', marginBottom: '24px' }}>
          <div className="flex items-center gap-sm">
            <FiAlertCircle color="#f57f17" size={20} />
            <div>
              <strong style={{ color: '#f57f17' }}>Refill Reminder!</strong>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                {needsRefill.map(m => m.name).join(', ')} — refill needed within 7 days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Reminders */}
      {activeMeds.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}><FiBell size={16} /> Today's Schedule</h4>
          <div className="reminder-grid">
            {activeMeds.map(med => (
              <div key={med._id} className="reminder-slots">
                {(med.timings || ['09:00 AM']).map((timing, i) => {
                  const key = `${med._id}_${timing}`;
                  const isTaken = takenMap[key];
                  return (
                    <div key={i} className={`reminder-slot ${isTaken ? 'taken' : ''}`}>
                      <div className="slot-time"><FiClock size={12} /> {timing}</div>
                      <div className="slot-med">
                        <strong>{med.name}</strong>
                        <span>{med.dosage}</span>
                      </div>
                      <button className={isTaken ? 'btn-taken' : 'btn-take'} onClick={() => !isTaken && markTaken(med._id, timing)} disabled={isTaken}>
                        {isTaken ? <><FiCheck /> Taken</> : 'Mark Taken'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BATCH Add Medicine Form */}
      {showForm && (
        <div ref={formRef} className="card" style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '4px' }}>Add Multiple Medicines at Once</h4>
          <p className="text-muted" style={{ marginBottom: '16px', fontSize: '0.82rem' }}>Add all medicines from a prescription in one go</p>
          <form onSubmit={handleBatchAdd}>
            {/* Shared fields */}
            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div className="form-group"><label>Prescribed By</label>
                <input value={prescribedBy} onChange={e => setPrescribedBy(e.target.value)} placeholder="Doctor name or code" />
              </div>
              <div className="form-group"><label>Notes</label>
                <input value={batchNotes} onChange={e => setBatchNotes(e.target.value)} placeholder="e.g., After food, for 7 days" />
              </div>
            </div>

            {/* Medicine table */}
            <table className="med-table" style={{ marginBottom: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Medicine Name *</th>
                  <th style={{ width: '15%' }}>Dosage *</th>
                  <th style={{ width: '18%' }}>Frequency</th>
                  <th style={{ width: '22%' }}>Timing</th>
                  <th style={{ width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {batchMeds.map((med, i) => (
                  <tr key={i}>
                    <td><input id={`med-name-${i}`} value={med.name} onChange={e => updateBatchMed(i, 'name', e.target.value)} placeholder="e.g., Paracetamol" style={{ width: '100%', margin: 0 }} /></td>
                    <td><input id={`med-dosage-${i}`} value={med.dosage} onChange={e => updateBatchMed(i, 'dosage', e.target.value)} placeholder="500mg" style={{ width: '100%', margin: 0 }} /></td>
                    <td>
                      <select id={`med-frequency-${i}`} value={med.frequency} onChange={e => updateBatchMed(i, 'frequency', e.target.value)} style={{ width: '100%', margin: 0 }}>
                        <option value="once_daily">Once Daily</option>
                        <option value="twice_daily">Twice Daily</option>
                        <option value="thrice_daily">3x Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="as_needed">As Needed</option>
                      </select>
                    </td>
                    <td>
                      <select id={`med-timing-${i}`} value={med.timings[0]} onChange={e => updateBatchMed(i, 'timings', [e.target.value])} style={{ width: '100%', margin: 0 }}>
                        {timingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {batchMeds.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '4px' }}>
                          <FiMinus size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-sm" style={{ marginBottom: '16px' }}>
              <button type="button" className="btn-ghost" onClick={addRow}><FiPlus size={12} /> Add Another Row</button>
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : `💊 Save ${batchMeds.filter(m => m.name && m.dosage).length} Medicine(s)`}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {medicines.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h3>💊 No Medicines Added</h3>
          <p className="text-muted" style={{ margin: '12px 0 20px' }}>
            Add your current medications or scan a prescription to auto-import medicines.
          </p>
          <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Add Medicines</button>
        </div>
      )}

      {/* Active Medicines */}
      {activeMeds.length > 0 && (
        <>
          <h3 style={{ marginBottom: '16px' }}>Active Medications ({activeMeds.length})</h3>
          <div className="med-grid">
            {activeMeds.map(med => (
              <div key={med._id} className="card med-card">
                <div className="med-card-header">
                  <div>
                    <strong>{med.name}</strong>
                    <span className="chip" style={{ marginLeft: '8px' }}>{med.dosage}</span>
                  </div>
                  <div className={`toggle ${med.isActive ? 'active' : ''}`} onClick={() => toggleActive(med._id)}></div>
                </div>
                <div className="med-card-body">
                  <div className="med-detail"><FiClock size={12} /> {freqLabels[med.frequency] || med.frequency}</div>
                  <div className="med-detail"><FiBell size={12} /> {(med.timings || []).join(', ')}</div>
                  {med.prescribedBy && <div className="med-detail">👨‍⚕️ {med.prescribedBy}</div>}
                  {med.notes && <div className="med-detail" style={{ fontStyle: 'italic', color: 'var(--outline)' }}>📝 {med.notes}</div>}
                  {med.refillDate && (
                    <div className="med-detail" style={{ color: new Date(med.refillDate) < new Date(Date.now() + 7*24*60*60*1000) ? '#f57f17' : 'var(--outline)' }}>
                      <FiCalendar size={12} /> Refill: {new Date(med.refillDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
                <button className="btn-ghost" style={{ width: '100%', marginTop: '12px', fontSize: '0.8rem', color: 'var(--error)' }} onClick={() => deleteMedicine(med._id)}>
                  <FiTrash2 size={12} /> Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Inactive */}
      {inactiveMeds.length > 0 && (
        <>
          <h3 style={{ margin: '32px 0 16px', opacity: 0.6 }}>Past Medications ({inactiveMeds.length})</h3>
          <div className="med-grid">
            {inactiveMeds.map(med => (
              <div key={med._id} className="card med-card" style={{ opacity: 0.5 }}>
                <strong>{med.name}</strong> <span className="chip">{med.dosage}</span>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                  {freqLabels[med.frequency] || med.frequency} · {med.prescribedBy || 'Self'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Medicines;
