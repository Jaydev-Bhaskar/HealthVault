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
import DoctorDashboard from './pages/DoctorDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

function AppRoutes() {
  const { user } = useAuth();
  const role = user?.role;

  // Determine which dashboard to show based on role
  const getDashboard = () => {
    if (role === 'hospital') return <HospitalDashboard />;
    if (role === 'doctor') return <DoctorDashboard />;
    return <Dashboard />;
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Shared routes */}
      <Route path="/dashboard" element={<ProtectedRoute>{getDashboard()}</ProtectedRoute>} />
      <Route path="/blockchain" element={<ProtectedRoute><BlockchainLedger /></ProtectedRoute>} />

      {/* Patient-only routes */}
      <Route path="/records" element={<ProtectedRoute allowedRoles={['patient']}><Records /></ProtectedRoute>} />
      <Route path="/family" element={<ProtectedRoute allowedRoles={['patient']}><FamilyVault /></ProtectedRoute>} />
      <Route path="/access" element={<ProtectedRoute allowedRoles={['patient']}><AccessControl /></ProtectedRoute>} />
      <Route path="/medicines" element={<ProtectedRoute allowedRoles={['patient']}><Medicines /></ProtectedRoute>} />

      {/* Role-specific direct routes */}
      <Route path="/doctor" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/hospital" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />

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
