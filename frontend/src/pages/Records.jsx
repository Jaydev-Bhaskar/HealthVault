import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoRecords, isDemoUser } from '../utils/demoData';
import API from '../utils/api';
import { FiUpload, FiFile, FiCamera, FiChevronDown, FiChevronUp, FiExternalLink } from 'react-icons/fi';
import './Pages.css';

const Records = () => {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [records, setRecords] = useState(isDemo ? demoRecords : []);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const fetchRecords = async () => {
    try {
      const { data } = await API.get('/records');
      setRecords(data || []);
    } catch (err) {
      console.log('Records fetch:', err.message);
    }
  };

  useEffect(() => {
    if (!isDemo) fetchRecords();
  }, [isDemo]);


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setScanResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    try {
      const { data } = await API.post('/ai/ocr-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      setScanResult(data);
      if (data.record) {
        setRecords(prev => [data.record, ...prev]);
      }
    } catch (err) {
      setScanResult({ error: err.response?.data?.message || 'OCR scan failed. Make sure backend is running and check your Gemini API key.' });
    }
    setUploading(false);
  };

  const typeLabels = {
    lab_report: '🧪 Lab Report', prescription: '💊 Prescription', scan: '📷 Scan / X-Ray',
    fitness: '🏃 Fitness Data', vaccination: '💉 Vaccination', other: '📄 Other'
  };

  const filtered = filter === 'all' ? records : records.filter(r => r.type === filter);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🔐 Health Vault</h1>
          <p className="text-muted">All your encrypted medical records in one place</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn-primary" onClick={() => setShowUpload(!showUpload)}>
            <FiCamera /> {showUpload ? 'Close' : 'Scan with AI'}
          </button>
        </div>
      </div>

      {/* AI OCR Upload Area */}
      {showUpload && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="upload-dropzone">
            {uploading ? (
              <div className="scan-loading">
                <div className="scan-spinner"></div>
                <h4>🧠 AI is analyzing your document...</h4>
                <p className="text-muted">Extracting medicines, metrics, and diagnosis using Gemini Vision AI</p>
              </div>
            ) : (
              <>
                <FiUpload size={40} color="var(--outline)" />
                <h4>📸 Scan Prescription or Report</h4>
                <p className="text-muted">Upload a photo of your prescription, lab report, or medical bill.<br/>AI will extract all information, store it digitally, and auto-add medicines to your reminders.</p>
                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} id="ocrFileInput" onChange={handleFileUpload} />
                <label htmlFor="ocrFileInput" className="btn-primary" style={{ marginTop: '12px', display: 'inline-block', cursor: 'pointer' }}>
                  Choose File / Take Photo
                </label>
              </>
            )}
          </div>

          {scanResult && !scanResult.error && (
            <div className="scan-result">
              <h4>✅ AI Scan Complete!</h4>
              <div className="scan-summary">
                <div className="scan-stat">
                  <span className="scan-stat-label">Document Type</span>
                  <span className="scan-stat-value">{typeLabels[scanResult.extractedData?.documentType] || '📄 Document'}</span>
                </div>
                {scanResult.extractedData?.doctorName && (
                  <div className="scan-stat">
                    <span className="scan-stat-label">Doctor</span>
                    <span className="scan-stat-value">👨‍⚕️ {scanResult.extractedData.doctorName}</span>
                  </div>
                )}
                <div className="scan-stat">
                  <span className="scan-stat-label">Medicines Found</span>
                  <span className="scan-stat-value">💊 {scanResult.medicinesCreated || 0} added to reminders</span>
                </div>
              </div>

              {scanResult.extractedData?.summary && (
                <div className="scan-detail"><strong>🧠 AI Summary:</strong> {scanResult.extractedData.summary}</div>
              )}

              {scanResult.extractedData?.medicines?.length > 0 && (
                <div className="scan-detail">
                  <strong>💊 Extracted Medicines:</strong>
                  <table className="med-table">
                    <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
                    <tbody>
                      {scanResult.extractedData.medicines.map((m, i) => (
                        <tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {scanResult.extractedData?.keyMetrics?.length > 0 && (
                <div className="scan-detail">
                  <strong>📊 Extracted Metrics:</strong>
                  <div className="metrics-grid">
                    {scanResult.extractedData.keyMetrics.map((m, i) => (
                      <div key={i} className="metric-card">
                        <span className="metric-name">{m.name}</span>
                        <span className="metric-value">{m.value} <small>{m.unit}</small></span>
                        <span className={`chip ${m.status === 'normal' ? 'chip-success' : m.status === 'high' ? 'chip-danger' : 'chip-warning'}`}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scanResult.extractedData?.warnings?.length > 0 && (
                <div className="scan-detail" style={{ background: '#ffebee', padding: '12px', borderRadius: '8px' }}>
                  <strong>⚠️ Warnings:</strong>
                  <ul>{scanResult.extractedData.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          {scanResult?.aiWarning && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '8px', color: '#e65100' }}>
              <strong>⚠️ Note:</strong> {scanResult.aiWarning}
            </div>
          )}
          {scanResult?.error && (
            <div className="auth-error" style={{ marginTop: '16px' }}>{scanResult.error}</div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        {['all', 'prescription', 'lab_report', 'scan', 'vaccination'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Records' : typeLabels[f]}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h3>📂 No Records Yet</h3>
          <p className="text-muted" style={{ margin: '12px 0 20px' }}>
            Upload your first prescription or lab report to build your digital health vault.
          </p>
          <button className="btn-primary" onClick={() => setShowUpload(true)}><FiCamera /> Scan Your First Report</button>
        </div>
      )}

      {/* Records List */}
      <div className="records-container">
        {filtered.map(record => (
          <div key={record._id} className="card record-card">
            <div className="record-card-header" onClick={() => setExpanded(expanded === record._id ? null : record._id)}>
              <div className="record-card-icon"><FiFile size={20} /></div>
              <div className="record-card-info">
                <div className="flex items-center gap-sm">
                  <strong>{record.title}</strong>
                  {record.isVerified && <span className="chip chip-success" style={{ fontSize: '0.7rem' }}>✓ Verified</span>}
                  {record.source === 'ai_ocr' && <span className="chip" style={{ fontSize: '0.7rem' }}>🧠 AI Parsed</span>}
                </div>
                <p className="text-muted">{record.description}</p>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {new Date(record.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="record-expand">{expanded === record._id ? <FiChevronUp /> : <FiChevronDown />}</div>
            </div>

            {expanded === record._id && (
              <div className="record-details">
                {record.fileUrl && (
                  <div className="detail-section" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <a 
                      href={`http://localhost:5000${record.fileUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-outline"
                      style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                    >
                      <FiExternalLink /> View Original Document
                    </a>
                  </div>
                )}
                {record.aiParsedData?.summary && (
                  <div className="detail-section"><h5>🧠 AI Summary</h5><p>{record.aiParsedData.summary}</p></div>
                )}
                {record.aiParsedData.medicines?.length > 0 && (
                  <div className="detail-section">
                    <h5>💊 Parsed Medications</h5>
                    <table className="med-table">
                      <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
                      <tbody>
                        {record.aiParsedData.medicines.map((m, i) => (
                          <tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {record.aiParsedData.keyMetrics?.length > 0 && (
                  <div className="detail-section">
                    <h5>📊 Key Metrics</h5>
                    <div className="metrics-grid">
                      {record.aiParsedData.keyMetrics.map((m, i) => (
                        <div key={i} className="metric-card">
                          <span className="metric-name">{m.name}</span>
                          <span className="metric-value">{m.value} <small>{m.unit}</small></span>
                          <span className={`chip ${m.status === 'normal' ? 'chip-success' : 'chip-warning'}`}>{m.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Records;
