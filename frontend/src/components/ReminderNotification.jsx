import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiX, FiCheck } from 'react-icons/fi';
import API from '../utils/api';

const ReminderNotification = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  
  // For demo: automatically trigger a reminder 10 seconds after logging in
  useEffect(() => {
    if (!user || user.role !== 'patient') return;

    let demoTimeout;

    const fetchMedsAndCheck = async () => {
      try {
        const { data } = await API.get('/medicines');
        const active = data.filter(m => m.isActive);
        
        // Let's pretend it's time for the first active medicine!
        if (active.length > 0) {
           setReminders([
             { id: 'demo1', med: active[0], time: active[0].timings[0] || 'Now' }
           ]);
        }
      } catch (err) {
        console.error("Reminder fetch failed");
      }
    };

    // Live demo: Trigger the alert a few seconds after the user loads the app
    demoTimeout = setTimeout(() => {
      fetchMedsAndCheck();
    }, 5000);

    return () => clearTimeout(demoTimeout);
  }, [user]);

  const dismiss = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const markTaken = async (r) => {
    setReminders(prev => prev.filter(item => item.id !== r.id));
    try {
      await API.post(`/medicines/${r.med._id}/taken`, { timing: r.time });
      window.dispatchEvent(new CustomEvent('medicineTaken', { detail: { medId: r.med._id, timing: r.time } }));
    } catch (err) {
      console.error("Failed to mark taken via popup", err);
    }
  };

  if (reminders.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      {reminders.map(r => (
        <div key={r.id} style={{
          background: 'var(--surface-container)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '16px', width: '320px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f57f17', fontWeight: 600 }}>
              <FiBell /> Time for your Medicine!
            </div>
            <button onClick={() => dismiss(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}>
              <FiX size={16} />
            </button>
          </div>
          
          <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{r.med.name}</h4>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Dosage: {r.med.dosage} • Scheduled: {r.time}
          </p>

          <button 
            onClick={() => markTaken(r)}
            style={{
              width: '100%', background: '#2e7d32', color: 'white', border: 'none',
              padding: '10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <FiCheck /> Mark as Taken
          </button>
        </div>
      ))}
    </div>
  );
};

export default ReminderNotification;
