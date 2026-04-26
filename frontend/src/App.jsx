import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerHome from './pages/CustomerHome';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import OperatorBooking from './pages/OperatorBooking';
import BookingPOS from './pages/BookingPOS';

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

          {/* Dedicated Operator Console */}
          <Route path="/operator/dashboard" element={<OperatorDashboard />} />

          {/* POS Selection Page (List of Journeys) */}
          <Route path="/operator/pos" element={<BookingPOS />} />

          {/* POS Terminal for Physical Bookings (Seat Map & Payment) */}
          <Route path="/operator/book/:scheduleId" element={<OperatorBooking />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;