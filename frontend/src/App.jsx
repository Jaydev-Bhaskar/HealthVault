import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import FamilyVault from './pages/FamilyVault';
import AccessControl from './pages/AccessControl';
import Medicines from './pages/Medicines';
import BlockchainLedger from './pages/BlockchainLedger';
import HospitalDashboard from './pages/HospitalDashboard';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

function AppRoutes() {
  const { user } = useAuth();
  const isHospital = user?.role === 'hospital';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {isHospital ? <HospitalDashboard /> : <Dashboard />}
        </ProtectedRoute>
      } />
      <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
      <Route path="/family" element={<ProtectedRoute><FamilyVault /></ProtectedRoute>} />
      <Route path="/access" element={<ProtectedRoute><AccessControl /></ProtectedRoute>} />
      <Route path="/medicines" element={<ProtectedRoute><Medicines /></ProtectedRoute>} />
      <Route path="/blockchain" element={<ProtectedRoute><BlockchainLedger /></ProtectedRoute>} />
      <Route path="/hospital" element={<ProtectedRoute><HospitalDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
