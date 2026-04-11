import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerHome from './pages/CustomerHome';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        <Routes>
          {/* Public Customer View - No Login Required */}
          <Route path="/" element={<CustomerHome />} />
          
          {/* Operator Login */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Operator Dashboard */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;