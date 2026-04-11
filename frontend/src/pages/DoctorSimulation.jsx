import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import SimulationChart from '../components/SimulationChart';

const DoctorSimulation = ({ patientId, patientName }) => {
  const [days, setDays] = useState(30);
  const [mode, setMode] = useState('compare'); // 'current', 'improved', 'compare'
  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (patientId) {
      handleSimulate();
    }
  }, [patientId, days, mode]);

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'compare') {
        const res = await API.post('/doctor/compare-simulation', { patientId, days });
        setSimulationData(res.data);
      } else {
        const res = await API.post('/doctor/simulate-health', { patientId, days, mode });
        setSimulationData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate simulation.');
    }
    setLoading(false);
  };

  if (!patientId) return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Please select a patient to start simulation.</div>;

  const current = mode === 'compare' ? simulationData?.current : simulationData;
  const improved = mode === 'compare' ? simulationData?.improved : null;

  const risks = current?.risks || {};
  const improvedRisks = improved?.risks || {};
  const suggestions = current?.suggestions || [];

  const getRiskColor = (level) => {
    if (level === 'High') return '#ff5252';
    if (level === 'Moderate') return '#fb8c00';
    return '#4caf50';
  };

  const RiskCard = ({ label, currentRisk, targetRisk, icon }) => {
    const isImproved = targetRisk && currentRisk !== targetRisk;
    return (
      <div className="card" style={{ padding: 16, borderLeft: `6px solid ${getRiskColor(currentRisk)}`, flex: 1 }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{label}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
          <div>
            <h3 style={{ margin: 0, display: 'inline-block' }}>{currentRisk}</h3>
            {isImproved && (
              <div style={{ fontSize: '0.8rem', color: '#2e7d32', marginTop: 4, fontWeight: 600 }}>
                → Target: {targetRisk} 📈
              </div>
            )}
          </div>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>🕒 Health Time-Travel Simulator</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Predicting future health for <strong>{patientName}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <select 
              value={days} 
              onChange={(e) => setDays(e.target.value)}
              className="chip"
              style={{ border: '1px solid var(--outline)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <option value={30}>Next 30 Days</option>
              <option value={60}>Next 60 Days</option>
              <option value={90}>Next 90 Days</option>
            </select>
            <div style={{ display: 'flex', background: 'var(--surface-container-high)', borderRadius: '12px', padding: '4px' }}>
              <button 
                onClick={() => setMode('compare')} 
                style={{ 
                  padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  background: mode === 'compare' ? 'white' : 'transparent',
                  boxShadow: mode === 'compare' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: mode === 'compare' ? 600 : 400
                }}
              >Compare</button>
              <button 
                onClick={() => setMode('current')} 
                style={{ 
                  padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  background: mode === 'current' ? 'white' : 'transparent',
                  boxShadow: mode === 'current' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: mode === 'current' ? 600 : 400
                }}
              >Current Path</button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="auth-error">{error}</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="loader"></div>
            <p>Analyzing trends and predicting outcomes...</p>
          </div>
        ) : simulationData ? (
          <div>
            {/* Risk Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <RiskCard label="Predicted BP Risk" currentRisk={risks.bpRisk} targetRisk={improvedRisks.bpRisk} icon="🫀" />
              <RiskCard label="Predicted Diabetes Risk" currentRisk={risks.diabetesRisk} targetRisk={improvedRisks.diabetesRisk} icon="🩸" />
              <RiskCard label="Predicted Fatigue Risk" currentRisk={risks.fatigueRisk} targetRisk={improvedRisks.fatigueRisk} icon="💤" />
            </div>

            {/* AI Explanation / Solution */}
            <div style={{ display: 'grid', gridTemplateColumns: mode === 'compare' ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 24 }}>
              <div className="card" style={{ padding: 20, background: 'rgba(52, 120, 246, 0.05)', border: '1px solid rgba(52, 120, 246, 0.2)' }}>
                <h4 style={{ margin: '0 0 8px', color: '#1565c0' }}>🧠 {mode === 'compare' ? 'Current Observation' : 'AI Health Insight'}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>{current?.explanation}</p>
              </div>
              {mode === 'compare' && (
                <div className="card" style={{ padding: 20, background: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#2e7d32' }}>✅ Recommended Solution</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>{improved?.explanation}</p>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ margin: 0 }}>Timeline Prediction</h4>
              <SimulationChart data={current?.timeline || []} improvedData={improved?.timeline} />
            </div>

            {/* Integrated Records */}
            {current?.integratedRecords?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ margin: '0 0 12px' }}>📄 Integrated Clinical Records</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {current.integratedRecords.map((title, i) => (
                    <div key={i} className="chip" style={{ background: '#e3f2fd', color: '#1565c0', border: '1px solid #bbdefb', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem' }}>
                      🔬 {title}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  * Metrics extracted from these reports have been merged with daily logs to update trends.
                </p>
              </div>
            )}

            {/* Suggestions */}
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 12px' }}>👨‍⚕️ Preventive Recommendations</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {suggestions.map((s, i) => (
                  <div key={i} className="chip" style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid var(--outline)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', flex: '1 1 300px' }}>
                    💡 {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DoctorSimulation;
