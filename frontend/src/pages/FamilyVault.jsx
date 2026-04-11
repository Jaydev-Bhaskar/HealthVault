import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoFamilyMembers, isDemoUser } from '../utils/demoData';
import API from '../utils/api';
import { FiPlus, FiActivity, FiHeart, FiAlertTriangle, FiFileText, FiClock, FiSettings } from 'react-icons/fi';
import './Pages.css';

const FamilyVault = () => {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [members, setMembers] = useState(isDemo ? demoFamilyMembers : []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', bloodGroup: '', age: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isDemo) fetchFamily();
  }, [isDemo]);

  const fetchFamily = async () => {
    try {
      // Upgraded Caregiver Intelligence endpoint
      const { data } = await API.get('/family/dashboard');
      setMembers(data.members || []);
    } catch { /* empty for new users */ }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post('/auth/family', form);
      setMembers(prev => [...prev, data]);
    } catch {
      const local = { _id: 'fam_' + Date.now(), ...form, healthId: 'HV-' + Math.random().toString(36).substring(2, 8).toUpperCase(), healthScore: 500 };
      setMembers(prev => [...prev, local]);
    }
    setForm({ name: '', bloodGroup: '', age: '' });
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>👨‍👩‍👧‍👦 Family Vault</h1>
          <p className="text-muted">Manage health records of your family members</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> Add Member</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Add Family Member</h4>
          <form onSubmit={handleAdd} className="inline-form">
            <div className="form-group"><label>Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
            </div>
            <div className="form-group"><label>Blood Group</label>
              <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Age</label>
              <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" min={0} max={120} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add'}</button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h3>👨‍👩‍👧‍👦 No Family Members</h3>
          <p className="text-muted" style={{ margin: '12px 0 20px' }}>Add family members to manage their health records from your dashboard.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Add First Member</button>
        </div>
      )}

      <div className="family-grid">
        {members.map(member => {
          // Determine risk badge color
          const badgeColors = {
            'LOW': { bg: '#e8f5e9', color: '#2e7d32' },
            'MEDIUM': { bg: '#fff8e1', color: '#f57f17' },
            'HIGH': { bg: '#ffebee', color: '#c62828' }
          };
          const riskTheme = badgeColors[member.riskLevel] || badgeColors['LOW'];

          return (
            <div key={member._id} className="card family-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="family-avatar" style={{ margin: 0 }}>
                    <span style={{ fontSize: '1.5rem', color: 'white' }}>{member.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{member.name}</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>{member.healthId || '—'}</p>
                  </div>
                </div>
                {member.riskLevel && (
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: riskTheme.bg, color: riskTheme.color, display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {member.riskLevel === 'HIGH' && <FiAlertTriangle />}
                    {member.riskLevel} RISK
                  </span>
                )}
              </div>

              <div className="family-stats" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                <div className="family-stat"><FiHeart size={14} color="var(--secondary)" /> {member.bloodGroup || '—'}</div>
                <div className="family-stat">Age: {member.age || '—'}</div>
                <div className="family-stat" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: '#2e7d32', fontWeight: 'bold' }}>
                  <FiActivity size={16} /> {member.healthScore || 500}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span className="text-muted"><FiFileText size={12} style={{ marginRight: '4px' }}/> Latest Record:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>
                    {member.latestRecord ? member.latestRecord.title : 'None uploaded'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span className="text-muted">💊 Active Medicines:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>
                    {member.medicines && member.medicines.length > 0 
                      ? `${member.medicines.length} prescribed` 
                      : 'No active routines'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FamilyVault;
