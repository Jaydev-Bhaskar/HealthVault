import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoRecords, demoInsights, demoHealthTrends, demoPermissions, isDemoUser } from '../utils/demoData';
import API from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiActivity, FiShield, FiUpload, FiMessageCircle, FiStar, FiAlertTriangle, FiCheckCircle, FiInfo, FiSend, FiRefreshCw } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [insights, setInsights] = useState(isDemo ? demoInsights : []);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthScore, setHealthScore] = useState(user?.healthScore || 500);
  const [scoreLabel, setScoreLabel] = useState(healthScore >= 800 ? 'Excellent' : healthScore >= 600 ? 'Good' : 'Fair');
  const [records, setRecords] = useState(isDemo ? demoRecords : []);
  const [permissions, setPermissions] = useState(isDemo ? demoPermissions : []);
  const [healthTrends, setHealthTrends] = useState(isDemo ? demoHealthTrends : []);
  const [activeMedCount, setActiveMedCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your AI Health Assistant powered by Gemini. Ask me anything about your health in English, Hindi, or Marathi! Try: "Mera BP kaisa hai?" or "What medicines am I taking?"' }
  ]);

  // Fetch real data for non-demo users
  useEffect(() => {
    if (!isDemo) {
      fetchDashboardData();
    }
  }, [isDemo]);

  const fetchDashboardData = async () => {
    try {
      // Fetch records
      const recordsRes = await API.get('/records');
      setRecords(recordsRes.data || []);

      // Fetch permissions
      const permRes = await API.get('/access');
      setPermissions(permRes.data || []);

      // Fetch active medicines count
      const medRes = await API.get('/medicines/active');
      setActiveMedCount(medRes.data?.length || 0);

      // Build health trends from records metrics
      const metrics = [];
      recordsRes.data.forEach(r => {
        if (r.aiParsedData?.keyMetrics) {
          r.aiParsedData.keyMetrics.forEach(m => {
            metrics.push({ ...m, date: r.uploadedAt });
          });
        }
      });
      // If we have metrics, build a simple trend
      if (metrics.length > 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const trends = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          trends.push({ month: months[d.getMonth()], bp_sys: 0, sugar: 0, cholesterol: 0 });
        }
        setHealthTrends(trends.length > 0 ? trends : []);
      }
    } catch (err) {
      console.log('Dashboard data fetch (some features may use defaults):', err.message);
    }
  };

  const getScoreColor = (score) => score >= 800 ? '#2e7d32' : score >= 600 ? '#f57f17' : '#c62828';
  const getScoreStars = (score) => score >= 900 ? 5 : score >= 750 ? 4 : score >= 600 ? 3 : score >= 400 ? 2 : 1;

  // Real AI Chat
  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const msg = chatInput;
    setChatInput('');
    setChatLoading(true);

    try {
      const { data } = await API.post('/ai/chat', { message: msg });
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch {
      // Offline fallback only for demo
      if (isDemo) {
        setChatMessages(prev => [...prev, { role: 'assistant', text: getOfflineResponse(msg) }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Unable to reach AI service. Please check your internet connection and try again.' }]);
      }
    }
    setChatLoading(false);
  };

  const getOfflineResponse = (input) => {
    const lower = input.toLowerCase();
    if (lower.includes('bp') || lower.includes('blood pressure'))
      return '📊 Your BP trend: 128/84 → 118/77 mmHg over 6 months. Consistently in the healthy range!';
    if (lower.includes('sugar') || lower.includes('diabetes'))
      return '🩸 Fasting Blood Sugar: 96-105 mg/dL (last 6 months). Normal range. Consider reducing refined carbs.';
    if (lower.includes('medicine') || lower.includes('medication') || lower.includes('dawa'))
      return '💊 Current: Montelukast 10mg (daily). 95% adherence this month. Go to Medicine Manager for details.';
    if (lower.includes('hindi') || lower.includes('namaste') || lower.includes('mera') || lower.includes('kaise'))
      return '🌐 Namaste! Aapka health score 850/1000 hai - bahut accha! Aapka BP normal hai aur medicines time pe le rahe ho. Koi specific sawal ho toh puchiye! 😊';
    return '🤖 Your health metrics are in normal range. Health Score: 850/1000. Ask me about specific metrics, medications, or try asking in Hindi!';
  };

  // AI Full Analysis
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data } = await API.post('/ai/analyze');
      if (data.healthScore) { setHealthScore(data.healthScore); setScoreLabel(data.scoreLabel || 'Good'); }
      if (data.insights) setInsights(data.insights);
    } catch {
      if (isDemo) setInsights(demoInsights);
      else setChatMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Could not run AI analysis. Try again later.' }]);
    }
    setAnalyzing(false);
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive': return <FiCheckCircle color="#2e7d32" />;
      case 'warning': return <FiAlertTriangle color="#f57f17" />;
      default: return <FiInfo color="#1b6968" />;
    }
  };

  const pieData = [{ name: 'Verified', value: 75 }, { name: 'Pending', value: 15 }, { name: 'Flagged', value: 10 }];
  const COLORS = ['#1b6968', '#D4ED31', '#ff9800'];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')?.[0] || 'User'} 👋</h1>
          <p className="subtitle">Here's your health overview for today</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn-ghost" onClick={runAnalysis} disabled={analyzing}>
            <FiRefreshCw className={analyzing ? 'spin' : ''} /> {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
          <Link to="/records"><button className="btn-primary"><FiUpload /> Scan Report</button></Link>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-left">
          <div className="card profile-card">
            <div className="profile-avatar-lg">{user?.name?.charAt(0) || 'A'}</div>
            <h3>{user?.name}</h3>
            <p className="text-muted">{user?.email}</p>
            <div className="profile-stats">
              <div className="stat"><span className="stat-label">Blood Group</span><span className="stat-value">{user?.bloodGroup || '—'}</span></div>
              <div className="stat"><span className="stat-label">Age</span><span className="stat-value">{user?.age || '—'}</span></div>
              <div className="stat"><span className="stat-label">Health ID</span><span className="stat-value id">{user?.healthId || '—'}</span></div>
              {user?.aadhaarId && <div className="stat"><span className="stat-label">Aadhaar</span><span className="stat-value id">XXXX XXXX {user.aadhaarId.slice(-4)}</span></div>}
            </div>
          </div>

          <div className="card score-card">
            <div className="score-header"><FiActivity size={20} /><h4>AI Health Trust Score</h4></div>
            <div className="score-display pulse">
              <span className="score-number" style={{ color: getScoreColor(healthScore) }}>{healthScore}</span>
              <span className="score-max">/1000</span>
            </div>
            <span className="chip chip-success">{scoreLabel}</span>
            <p className="score-desc">You qualify for a <strong>{healthScore >= 800 ? '15%' : healthScore >= 600 ? '8%' : '3%'} insurance premium discount!</strong></p>
            <div className="score-stars">
              {[1,2,3,4,5].map(i => (
                <FiStar key={i} fill={i <= getScoreStars(healthScore) ? '#D4ED31' : 'none'} color="#D4ED31" size={20} />
              ))}
            </div>
          </div>

          {/* AI Chat */}
          <div className="card chat-card">
            <div className="chat-header">
              <FiMessageCircle size={18} /><h4>AI Health Assistant</h4>
              <span className="chip">Gemini AI</span>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>{msg.text}</div>
              ))}
              {chatLoading && <div className="chat-msg assistant typing">🤔 Thinking...</div>}
            </div>
            <form className="chat-input-form" onSubmit={handleChat}>
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask in English, Hindi, Marathi..." disabled={chatLoading} />
              <button type="submit" className="chat-send" disabled={chatLoading}><FiSend /></button>
            </form>
          </div>
        </div>

        {/* Center Column */}
        <div className="dashboard-center">
          {healthTrends.length > 0 && (
            <div className="card chart-card">
              <h4>Health Trends (6 Months)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={healthTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(199,201,174,0.3)" />
                  <XAxis dataKey="month" stroke="#777962" fontSize={12} />
                  <YAxis stroke="#777962" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="bp_sys" stroke="#1b6968" strokeWidth={2.5} name="BP Systolic" dot={{ fill: '#1b6968', r: 4 }} />
                  <Line type="monotone" dataKey="sugar" stroke="#D4ED31" strokeWidth={2.5} name="Blood Sugar" dot={{ fill: '#D4ED31', r: 4 }} />
                  <Line type="monotone" dataKey="cholesterol" stroke="#ff9800" strokeWidth={2} name="Cholesterol" dot={{ fill: '#ff9800', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty state for new users */}
          {!isDemo && records.length === 0 && insights.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <h3>🚀 Get Started!</h3>
              <p className="text-muted" style={{ margin: '12px 0 20px' }}>
                Upload your first medical report or prescription to unlock AI-powered health insights.
              </p>
              <Link to="/records"><button className="btn-primary"><FiUpload /> Scan Your First Report</button></Link>
            </div>
          )}

          {insights.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                <h4>🧠 AI Insights</h4>
                {analyzing && <span className="chip"><FiRefreshCw className="spin" size={12} /> Updating...</span>}
              </div>
              <div className="insights-list">
                {insights.map((insight, i) => (
                  <div key={i} className={`insight-item ${insight.type}`}>
                    <div className="insight-icon">{getInsightIcon(insight.type)}</div>
                    <div><strong>{insight.title}</strong><p>{insight.message}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {records.length > 0 && (
            <div className="card">
              <h4 style={{ marginBottom: '20px' }}>📋 Recent Records</h4>
              <div className="records-list">
                {records.slice(0, 3).map(record => (
                  <div key={record._id} className="record-item">
                    <div className="record-info">
                      <strong>{record.title}</strong>
                      <p className="text-muted">{record.description}</p>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(record.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="record-actions">
                      {record.isVerified && <span className="chip chip-success">✓ Verified</span>}
                      {record.source === 'ai_ocr' && <span className="chip">AI Parsed</span>}
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/records" style={{ textDecoration: 'none' }}>
                <button className="btn-ghost" style={{ width: '100%', marginTop: '12px' }}>View All Records →</button>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          <div className="card">
            <h4 style={{ marginBottom: '16px' }}>Quick Stats</h4>
            <div className="pie-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#1b6968' }}></span>Records: {records.length}</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#D4ED31' }}></span>Active Medicines: {isDemo ? 1 : activeMedCount}</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#ff9800' }}></span>Doctor Access: {permissions.filter(p => p.isActive).length}</div>
            </div>
          </div>

          {permissions.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <h4><FiShield size={16} /> Active Access</h4>
              </div>
              {permissions.slice(0, 3).map(perm => (
                <div key={perm._id} className="access-item">
                  <div>
                    <strong style={{ fontSize: '0.88rem' }}>{perm.doctorName}</strong>
                    {perm.doctorCode && <span className="chip" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>{perm.doctorCode}</span>}
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>{perm.doctorSpecialty}</p>
                  </div>
                  <div className={`toggle ${perm.isActive ? 'active' : ''}`}></div>
                </div>
              ))}
              <Link to="/access" style={{ textDecoration: 'none' }}>
                <button className="btn-ghost" style={{ width: '100%', marginTop: '8px', fontSize: '0.8rem' }}>Manage Access →</button>
              </Link>
            </div>
          )}

          <Link to="/medicines" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ width: '100%', padding: '16px' }}>💊 Medicine Reminders</button>
          </Link>
          <Link to="/access" style={{ textDecoration: 'none' }}>
            <button className="btn-primary emergency-btn pulse">🆘 Emergency QR Code</button>
          </Link>

          <div className="card outbreak-card">
            <span style={{ fontSize: '1.5rem' }}>📍</span>
            <div>
              <strong style={{ color: '#f57f17' }}>Dengue Alert - Pune</strong>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>23 cases reported in Shivajinagar area this week.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
