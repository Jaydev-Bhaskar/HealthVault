import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isDemoUser, demoBlockchain } from '../utils/demoData';
import API from '../utils/api';
import './Pages.css';

const BlockchainLedger = () => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (isDemoUser(user)) {
      setBlocks(demoBlockchain.ledger);
      setStats(demoBlockchain.stats);
      setLoading(false);
      return;
    }
    try {
      const [ledgerRes, statsRes] = await Promise.all([
        API.get('/blockchain/ledger'),
        API.get('/blockchain/stats')
      ]);
      setBlocks(ledgerRes.data);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    if (isDemoUser(user)) {
      setTimeout(() => {
        setVerification({ valid: true, blockCount: demoBlockchain.ledger.length });
        setVerifying(false);
      }, 1500);
      return;
    }
    try {
      const { data } = await API.get('/blockchain/verify');
      setVerification(data);
    } catch (err) { console.error(err); }
    setVerifying(false);
  };

  const actionIcons = {
    ACCESS_GRANTED: '🔓', ACCESS_REVOKED: '🔒', RECORD_UPLOADED: '📄',
    RECORD_VIEWED: '👁️', MEDICINE_ADDED: '💊', EMERGENCY_ACCESS: '🚨', GENESIS: '⛓️'
  };

  const actionColors = {
    ACCESS_GRANTED: '#4caf50', ACCESS_REVOKED: '#f44336', RECORD_UPLOADED: '#2196f3',
    RECORD_VIEWED: '#ff9800', MEDICINE_ADDED: '#9c27b0', EMERGENCY_ACCESS: '#e91e63', GENESIS: '#607d8b'
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>⛓️ Blockchain Ledger</h1>
          <p className="page-subtitle">Tamper-proof audit trail of all health data access</p>
        </div>
        <button className="btn-primary" onClick={handleVerify} disabled={verifying}>
          {verifying ? '⏳ Verifying...' : '🔍 Verify Chain Integrity'}
        </button>
      </div>

      {/* Verification Result */}
      {verification && (
        <div className="card" style={{ marginBottom: 24, padding: 20, borderLeft: `4px solid ${verification.valid ? '#4caf50' : '#f44336'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>{verification.valid ? '✅' : '❌'}</span>
            <div>
              <h3 style={{ margin: 0 }}>{verification.valid ? 'Chain Integrity Verified' : 'Chain Tampered!'}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {verification.valid
                  ? `All ${verification.blockCount} blocks have valid SHA-256 hash linkage.`
                  : `Integrity broken at block ${verification.brokenAt}: ${verification.reason}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chain Stats */}
      {stats && (
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card stat-card">
            <p className="stat-label">Total Blocks</p>
            <p className="stat-value">{stats.totalBlocks}</p>
          </div>
          <div className="card stat-card">
            <p className="stat-label">Your Transactions</p>
            <p className="stat-value">{stats.yourTransactions}</p>
          </div>
          <div className="card stat-card">
            <p className="stat-label">Latest Block #</p>
            <p className="stat-value">#{stats.latestBlockIndex}</p>
          </div>
          <div className="card stat-card">
            <p className="stat-label">Latest Hash</p>
            <p className="stat-value" style={{ fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {stats.latestBlockHash ? stats.latestBlockHash.substring(0, 16) + '...' : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Block List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Loading blocks...</div>
      ) : blocks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h3>⛓️ No Transactions Yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Start using HealthVault to see blockchain-logged activities here.</p>
        </div>
      ) : (
        <div className="block-list">
          {blocks.map((block, i) => (
            <div key={block._id || i} className="card block-card" style={{ marginBottom: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.5rem' }}>{actionIcons[block.action] || '📦'}</span>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>
                      <span className="chip" style={{ background: actionColors[block.action] + '22', color: actionColors[block.action], marginRight: 8 }}>
                        {block.action.replace(/_/g, ' ')}
                      </span>
                      Block #{block.index}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{block.details}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}>{new Date(block.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface-container-low)', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--secondary-accent)', fontWeight: 600 }}>HASH: </span>{block.hash}
                <br />
                <span style={{ color: '#9c27b0', fontWeight: 600 }}>PREV: </span>{block.previousHash}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockchainLedger;
