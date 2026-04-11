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
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchFamilyData = async () => {
    try {
      // Upgraded Caregiver Intelligence endpoint
      const { data } = await API.get('/family/dashboard');
      setMembers(data.members || []);
      const [famRes, reqRes] = await Promise.all([
        API.get('/auth/family'),
        API.get('/auth/family/requests')
      ]);
      setMembers(famRes.data || []);
      setRequests(reqRes.data || []);
    } catch { /* empty for new users */ }
  };

  useEffect(() => {
    if (!isDemo) fetchFamilyData();
  }, [isDemo]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data } = await API.post('/auth/family/request', { identifier: identifier.trim() });
      setSuccessMsg(data.message || 'Request sent successfully!');
      setIdentifier('');
      setTimeout(() => { setShowForm(false); setSuccessMsg(null); }, 3000);
    } catch (err) {
      if (isDemo) {
        setErrorMsg('Search is disabled in Demo Mode. You cannot add real users.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to send request. Ensure Health ID is correct.');
      }
    }
    setSaving(false);
  };

  const handleAcceptRequest = async (id) => {
    try {
      await API.post('/auth/family/accept', { requesterId: id });
      fetchFamilyData(); // refresh lists
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting request');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await API.post('/auth/family/reject', { requesterId: id });
      setRequests(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error rejecting request');
    }
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
          <h4 style={{ marginBottom: '16px' }}>Link Real Family Member</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Enter their exact Name, Health ID, or Email. They must already be registered on HealthVault.</p>
          <form onSubmit={handleAdd} className="inline-form" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '300px' }}>
              <label>Search Identifier *</label>
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="e.g. HV-A1B2 or email address" required />
              {errorMsg && <div style={{ color: '#d32f2f', fontSize: '0.8rem', marginTop: '6px' }}>{errorMsg}</div>}
              {successMsg && <div style={{ color: '#2e7d32', fontSize: '0.8rem', marginTop: '6px' }}>{successMsg}</div>}
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '24px' }} disabled={saving}>{saving ? 'Sending...' : 'Send Request'}</button>
          </form>
        </div>
      )}

      {/* Incoming Requests Section */}
      {requests.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4>🔔 Pending Family Requests</h4>
          <div className="family-grid" style={{ marginTop: '12px' }}>
            {requests.map(req => (
              <div key={req._id} className="card family-card" style={{ border: '2px solid #D4ED31' }}>
                <div className="family-avatar"><span style={{ fontSize: '1.5rem', color: 'white' }}>{req.name?.charAt(0)}</span></div>
                <h3>{req.name}</h3>
                <p className="text-muted">{req.healthId || req.email}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%', justifyContent: 'center' }}>
                  <button onClick={() => handleAcceptRequest(req._id)} className="btn-primary" style={{ flex: 1, padding: '8px' }}>Accept</button>
                  <button onClick={() => handleRejectRequest(req._id)} className="btn-ghost" style={{ flex: 1, padding: '8px', border: '1px solid #d32f2f', color: '#d32f2f' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
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
