import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  QrCode, Truck, CreditCard, Bus, MapPin, Loader2, 
  CheckCircle2, XCircle, LayoutDashboard, LogOut, User, Menu, ChevronLeft, Plus, Calendar, Search, Camera, Edit2, ArrowRightCircle, CheckCircle, ArrowLeftCircle, History, X, Filter, ArrowUpDown, Globe,
  TrendingUp, Users, Activity, Clock, Banknote, Ticket, Smartphone, ArrowRight, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '../api';
import SeatMap from '../components/SeatMap';

export default function OperatorDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [boardData, setBoardData] = useState({ departures: [], arrivals: [], station: '' });
  const [allSchedules, setAllSchedules] = useState([]); 
  const [busesAtStation, setBusesAtStation] = useState([]); 
  const [availableBuses, setAvailableBuses] = useState([]); 
  const [payments, setPayments] = useState([]);
  const [userData, setUserData] = useState({ username: 'User', is_operator: false, station: '', station_id: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [paymentStats, setPaymentStats] = useState({ today_revenue: 0, today_count: 0 });
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [boardingSchedule, setBoardingSchedule] = useState(''); 
  const navigate = useNavigate();
  
  const [posStep, setPosStep] = useState('list');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [posLoading, setPosLoading] = useState(false);
  const [posPassenger, setPosPassenger] = useState({ name: '', phone: '', seat: null, paymentMethod: 'CASH' });
  const [posBookingId, setPosBookingId] = useState(null);
  const [posPaymentStatus, setPosPaymentStatus] = useState('WAITING');

  const [filters, setFilters] = useState({ origin: '', destination: '', date: '', bus_number: '' });
  const [historyFilters, setHistoryFilters] = useState({ bus_number: '', destination: '', direction: '', date: '' });
  const [newSchedule, setNewSchedule] = useState({ bus: '', destination: '', departure_time: '', price: '' });
  const [stations, setStations] = useState([]); 

  const [lockedStatuses, setLockedStatuses] = useState(() => {
    const saved = localStorage.getItem('op_locked_statuses');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('op_locked_statuses', JSON.stringify(lockedStatuses));
  }, [lockedStatuses]);

  useEffect(() => {
    let interval;
    if (posStep === 'waiting' && posBookingId && posPaymentStatus === 'WAITING') {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`bookings/${posBookingId}/`);
          if (res.data.status === 'PAID') {
            setPosPaymentStatus('PAID');
            setPosStep('paid');
            clearInterval(interval);
            fetchData();
          }
        } catch (err) {
          console.error("POS polling error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [posStep, posBookingId, posPaymentStatus]);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, boardRes, statsRes, paymentRes, stationRes, historyRes] = await Promise.all([
        api.get('user/profile/'),
        api.get('schedules/station_board/'),
        api.get('payments/stats/'),
        api.get('payments/'),
        api.get('stations/'),
        api.get('schedules/admin_list/')
      ]);
      
      const user = userRes.data;
      setUserData(user);
      setPaymentStats(statsRes.data);
      setPayments(paymentRes.data.results || paymentRes.data);
      setStations(stationRes.data.results || stationRes.data);
      
      const historyData = historyRes.data.results || historyRes.data || [];
      setAllSchedules(historyData);

      const incomingDepartures = boardRes.data?.departures || [];
      const incomingArrivals = boardRes.data?.arrivals || [];

      setBoardData({
        station: boardRes.data?.station || '',
        departures: incomingDepartures.map(item => ({
          ...item,
          status: lockedStatuses[item.id] || item.status
        })),
        arrivals: incomingArrivals.map(item => ({
          ...item,
          status: lockedStatuses[item.id] || item.status
        }))
      });

      if (user.station_id) {
        const localBusesRes = await api.get(`buses/?at_station=${user.station_id}`);
        const localBuses = localBusesRes.data.results || localBusesRes.data;
        const scheduledBusIds = historyData
          .filter(s => s.status === 'SCHEDULED')
          .map(s => s.bus);
        const trulyAvailable = localBuses.filter(bus => !scheduledBusIds.includes(bus.id));
        setBusesAtStation(trulyAvailable);
        setAvailableBuses(trulyAvailable);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  }, [lockedStatuses]);

  useEffect(() => { 
    fetchData(); 
  }, [activeTab, fetchData]);

  const handleUpdateStatus = async (id, newStatus) => {
    setLockedStatuses(prev => ({ ...prev, [id]: newStatus }));
    try {
      await api.post(`schedules/${id}/update_status/`, { status: newStatus });
      await fetchData();
    } catch (err) {
      alert("Status update failed");
      setLockedStatuses(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handlePOSBooking = async (e) => {
    if (e) e.preventDefault();
    if (!posPassenger.seat) return alert("Please select a seat first!");
    
    setPosLoading(true);
    try {
      const bookingRes = await api.post('bookings/', {
        schedule: selectedSchedule.id,
        passenger_name: posPassenger.name,
        passenger_phone: posPassenger.phone,
        seat_number: posPassenger.seat,
        status: posPassenger.paymentMethod === 'CASH' ? 'PAID' : 'PENDING'
      });
      
      if (bookingRes.status === 201) {
        setPosBookingId(bookingRes.data.id);

        if (posPassenger.paymentMethod === 'MPESA') {
          setPosPaymentStatus('WAITING');
          const paymentRes = await api.post('payments/stk_push/', {
            booking_id: bookingRes.data.id,
            phone_number: posPassenger.phone,
            amount: selectedSchedule.price
          });
          if (paymentRes.data.ResponseCode === '0') {
            setPosStep('waiting');
          } else {
            alert("M-Pesa STK Push failed. Please try again.");
          }
        } else {
          // ✅ CASH: straight to success screen, no window.print()
          setPosStep('paid');
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed.");
    } finally {
      setPosLoading(false);
    }
  };

  const resetPOS = () => {
    setPosStep('list');
    setSelectedSchedule(null);
    setPosPassenger({ name: '', phone: '', seat: null, paymentMethod: 'CASH' });
    setPosBookingId(null);
    setPosPaymentStatus('WAITING');
  };

  const handleCreateSchedule = async (e) => {
    if (e) e.preventDefault();
    try {
      await api.post('schedules/', newSchedule);
      setNewSchedule({ bus: '', destination: '', departure_time: '', price: '' });
      await fetchData();
      setActiveTab('dashboard'); 
    } catch (err) { alert("Dispatch failed."); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Cancel this trip?")) return;
    try {
      await api.delete(`schedules/${id}/`);
      fetchData();
    } catch (err) { alert("Failed to cancel trip."); }
  };

  const checkStatus = (s, target) => {
    if (!s || !s.status) return target === 'SCHEDULED';
    return s.status.toString().trim().toUpperCase() === target.toUpperCase();
  };

  const isToday = (dateString) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    return (
      targetDate.getDate() === today.getDate() &&
      targetDate.getMonth() === today.getMonth() &&
      targetDate.getFullYear() === today.getFullYear()
    );
  };

  const getFilteredSchedules = (isHistory = false) => {
    return allSchedules.filter(s => {
      if (!isHistory) {
        if (s.origin_name !== userData.station) return false;
        if (checkStatus(s, 'ARRIVED')) return false; 
        const currentFilters = filters;
        const busNum = s.bus_details?.bus_number || "";
        const matchesBus = busNum.toLowerCase().includes(currentFilters.bus_number?.toLowerCase() || '');
        const matchesDest = currentFilters.destination ? parseInt(s.destination) === parseInt(currentFilters.destination) : true;
        const matchesDate = currentFilters.date ? s.departure_time.startsWith(currentFilters.date) : true;
        return matchesBus && matchesDest && matchesDate;
      }
      
      const currentFilters = historyFilters;
      const busNum = s.bus_details?.bus_number || "";
      const matchesBus = busNum.toLowerCase().includes(currentFilters.bus_number?.toLowerCase() || '');
      const destSource = currentFilters.destination;
      const matchesDest = destSource ? s.destination_name === destSource : true;
      const dateSource = currentFilters.date;
      const matchesDate = dateSource ? s.departure_time.startsWith(dateSource) : true;

      let matchesDirection = true;
      if (historyFilters.direction) {
        if (historyFilters.direction === 'OUTBOUND') {
          matchesDirection = s.origin_name === userData.station;
        } else if (historyFilters.direction === 'INBOUND') {
          matchesDirection = s.destination_name === userData.station;
        } else if (historyFilters.direction === 'TRANSIT') {
          matchesDirection = s.status === 'DEPARTED';
        } else if (historyFilters.direction === 'SCHEDULED') {
          matchesDirection = s.status === 'SCHEDULED';
        }
      }
      return matchesBus && matchesDest && matchesDate && matchesDirection;
    });
  };

  const onScanSuccess = async (decodedText) => {
    try {
      let bookingId = decodedText;
      if (decodedText.includes('/')) {
          const parts = decodedText.split('/');
          bookingId = parts.filter(p => p !== "").find((p, i, arr) => arr[i-1] === 'bookings' || !isNaN(p));
      }
      const res = await api.post(`bookings/${bookingId}/verify_ticket/`, { schedule_id: boardingSchedule });
      setIsScanning(false);
      setScanResult({ success: true, data: res.data });
    } catch (err) {
      setIsScanning(false);
      setScanResult({ success: false, error: err.response?.data?.error || "Invalid QR Code" });
    }
  };

  useEffect(() => {
    let scanner = null;
    if (activeTab === 'scanner' && isScanning) {
      const timer = setTimeout(() => {
        scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE]
        }, false);
        scanner.render(onScanSuccess, (err) => {});
      }, 150);
      return () => { clearTimeout(timer); if (scanner) scanner.clear().catch(e => {}); };
    }
  }, [activeTab, isScanning]);

  const tabs = [
    { id: 'dashboard', label: 'Station Board', icon: LayoutDashboard },
    { id: 'booking_pos', label: 'Booking POS', icon: Ticket },
    { id: 'departures', label: 'Departures', icon: ArrowRightCircle },
    { id: 'arrivals', label: 'Arrivals', icon: ArrowLeftCircle },
    { id: 'fleet', label: 'Fleet Control', icon: Bus },
    { id: 'schedules', label: 'Trips History', icon: History },
    { id: 'dispatch', label: 'New Dispatch', icon: Truck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'scanner', label: 'Scanner', icon: QrCode },
  ];

  const quickActions = [
    { id: 'scanner', label: 'Scanner', icon: QrCode, color: 'bg-blue-600', desc: 'Scan Tickets' },
    { id: 'booking_pos', label: 'Ticket POS', icon: Ticket, color: 'bg-emerald-600', desc: 'Station Sale' },
    { id: 'dispatch', label: 'Dispatch', icon: Truck, color: 'bg-purple-600', desc: 'New Trip' },
    { id: 'payments', label: 'Revenue', icon: CreditCard, color: 'bg-orange-600', desc: 'Daily Stats' },
  ];

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900/40 border-r border-white/5 backdrop-blur-xl flex flex-col transition-all duration-300 shrink-0`}>
        <div className="p-6 border-b border-white/5 flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="bg-purple-600 p-2 rounded-xl shrink-0"><Bus size={20} /></div>
          {isSidebarOpen && <span className="text-xl font-black tracking-tighter text-white">TwendeOps</span>}
        </div>
        <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); resetPOS(); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
              <tab.icon size={20} className="shrink-0" />
              {isSidebarOpen && <span className="text-sm">{tab.label}</span>}
            </button>
          ))}
        </nav>
        <button onClick={() => { localStorage.clear(); navigate('/admin/login'); }} className="m-4 flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-500/10 transition-all overflow-hidden">
          <LogOut size={20} className="shrink-0" />
          {isSidebarOpen && <span className="text-sm">Sign Out</span>}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-2xl font-black tracking-tight capitalize">{userData.station} {activeTab.replace('_', ' ')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none">{userData.username}</p>
              <p className="text-[10px] text-purple-400 font-bold uppercase mt-1 tracking-widest leading-none">{userData.station || 'Operator'}</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10"><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-500/10 rounded-2xl text-green-500"><TrendingUp size={24} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Today</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter text-green-500">KES {paymentStats.today_revenue}</p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><Users size={24} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tickets Sold</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter">{paymentStats.today_count}</p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500"><Calendar size={24} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter">{boardData.departures.filter(s => checkStatus(s, 'SCHEDULED')).length}</p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Clock size={24} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">In Transit</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter">
                    {allSchedules.filter(s => checkStatus(s, 'DEPARTED') && (s.origin_name === userData.station || s.destination_name === userData.station)).length}
                  </p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Bus size={24} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Buses at Station</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter">{busesAtStation.length}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 px-2">Quick Navigation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {quickActions.map((action) => (
                    <button 
                      key={action.id}
                      onClick={() => { setActiveTab(action.id); resetPOS(); }}
                      className="group bg-slate-900/40 p-6 rounded-[32px] border border-white/5 text-left hover:bg-slate-900 transition-all relative overflow-hidden"
                    >
                      <div className={`${action.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}><action.icon size={24} /></div>
                      <h4 className="text-lg font-black tracking-tight mb-1">{action.label}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{action.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 h-fit">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><ArrowRightCircle size={16} className="text-purple-500"/> Today's Departures</h3>
                    <div className="space-y-3">
                        {boardData.departures.filter(s => checkStatus(s, 'SCHEDULED') && isToday(s.departure_time)).map(s => (
                            <div key={s.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                <div><p className="font-bold text-sm">To {s.destination_name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{s.bus_details?.bus_number} • {new Date(s.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                                <button onClick={() => handleUpdateStatus(s.id, 'DEPARTED')} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest">Depart</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 h-fit">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><ArrowLeftCircle size={16} className="text-green-500"/> Expected Arrivals</h3>
                    <div className="space-y-3">
                        {boardData.arrivals.filter(s => checkStatus(s, 'DEPARTED')).map(s => (
                            <div key={s.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                <div><p className="font-bold text-sm">From {s.origin_name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{s.bus_details?.bus_number}</p></div>
                                <button onClick={() => handleUpdateStatus(s.id, 'ARRIVED')} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all">Mark Arrived</button>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'booking_pos' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">

              {posStep === 'list' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3"><Ticket className="text-purple-500" size={32} /> POS Selection</h3>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input placeholder="Filter Plate..." className="bg-slate-900 border border-white/10 p-4 pl-12 rounded-2xl text-sm w-64 outline-none focus:border-purple-500 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allSchedules.filter(s => checkStatus(s, 'SCHEDULED') && s.origin_name === userData.station).map(s => (
                      <div key={s.id} onClick={() => { setSelectedSchedule(s); setPosStep('details'); }} className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] hover:border-emerald-500/50 cursor-pointer transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl -z-10"></div>
                        <div className="flex justify-between mb-6">
                          <div className="p-3 bg-slate-950 rounded-2xl text-purple-400 group-hover:scale-110 transition-transform"><Bus size={24} /></div>
                          <p className="font-mono font-black text-xl">{s.bus_details.bus_number}</p>
                        </div>
                        <p className="font-black text-base uppercase tracking-wider">{s.origin_name} → {s.destination_name}</p>
                        <p className="text-xs text-slate-500 font-bold mt-2">{new Date(s.departure_time).toLocaleString([], {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</p>
                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-emerald-500 font-black text-xl">
                          KES {s.price} <ArrowRight size={24} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {posStep === 'details' && (
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 bg-slate-900/60 p-10 rounded-[50px] border border-white/10 shadow-2xl relative">
                  <div>
                    <button onClick={() => setPosStep('list')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 text-xs font-black uppercase transition-all tracking-widest"><ArrowLeftCircle size={24}/> Return to list</button>
                    <div className="bg-slate-950/50 p-8 rounded-[40px] border border-white/5 shadow-inner">
                      <SeatMap 
                        capacity={selectedSchedule.bus_details.capacity} 
                        selectedSeat={posPassenger.seat} 
                        onSelectSeat={(seat) => setPosPassenger({...posPassenger, seat})} 
                        bookedSeats={selectedSchedule.booked_seats} 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 flex items-center gap-4">
                      <User className="text-purple-500" size={32}/> Ticket Issue
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mb-10">Collecting payment for {selectedSchedule.bus_details.bus_number}</p>
                    
                    <form onSubmit={handlePOSBooking} className="space-y-8 flex-1">
                      <div className="space-y-5">
                        <input required className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold" placeholder="Passenger Full Name" value={posPassenger.name} onChange={e => setPosPassenger({...posPassenger, name: e.target.value})} />
                        <input required className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold" placeholder="Phone Number" value={posPassenger.phone} onChange={e => setPosPassenger({...posPassenger, phone: e.target.value})} />
                      </div>

                      <div className="bg-slate-950 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Seat Number</span><span className="text-2xl font-mono font-black text-purple-400">{posPassenger.seat || '--'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Total Fare</span><span className="text-3xl font-black text-emerald-500">KES {selectedSchedule.price}</span></div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Payment Mode</p>
                        <div className="grid grid-cols-2 gap-6">
                          <button type="button" onClick={() => setPosPassenger({...posPassenger, paymentMethod: 'CASH'})} className={`p-6 rounded-3xl border flex flex-col items-center gap-2 transition-all ${posPassenger.paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-600/10 text-emerald-500 shadow-lg' : 'border-white/5 bg-slate-950 text-slate-500'}`}>
                            <Banknote size={28}/> <span className="text-[10px] font-black uppercase">Cash</span>
                          </button>
                          <button type="button" onClick={() => setPosPassenger({...posPassenger, paymentMethod: 'MPESA'})} className={`p-6 rounded-3xl border flex flex-col items-center gap-2 transition-all ${posPassenger.paymentMethod === 'MPESA' ? 'border-blue-500 bg-blue-600/10 text-blue-500 shadow-lg' : 'border-white/5 bg-slate-950 text-slate-500'}`}>
                            <Smartphone size={28}/> <span className="text-[10px] font-black uppercase">M-Pesa</span>
                          </button>
                        </div>
                      </div>

                      <button type="submit" disabled={posLoading || !posPassenger.seat} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-700 py-7 rounded-[40px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4">
                        {posLoading ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24}/> Confirm & Issue Ticket</>}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {posStep === 'waiting' && (
                <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-14 rounded-[50px] text-center shadow-2xl animate-in fade-in duration-500">
                  <Loader2 className="w-20 h-20 text-purple-500 animate-spin mx-auto mb-8" />
                  <h2 className="text-3xl font-black mb-3 uppercase italic tracking-tighter">Awaiting Payment</h2>
                  <p className="text-slate-400 font-bold mb-2">STK Push sent to passenger.</p>
                  <p className="text-slate-500 text-sm">
                    Ask them to enter their M-Pesa PIN for <span className="text-emerald-400 font-black">KES {selectedSchedule?.price}</span>.
                  </p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-8 animate-pulse">Polling for confirmation...</p>
                  <button onClick={resetPOS} className="mt-10 w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 transition-all">
                    Cancel & Start Over
                  </button>
                </div>
              )}

              {/* ✅ CASH + MPESA both land here */}
              {posStep === 'paid' && (
                <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-14 rounded-[50px] text-center shadow-2xl animate-in fade-in duration-500">
                  <CheckCircle2 className="text-green-400 w-20 h-20 mx-auto mb-8" />
                  <h2 className="text-4xl font-black mb-3 uppercase italic tracking-tighter text-green-400">Success!</h2>
                  <p className="text-slate-400 font-bold mb-1">
                    {posPassenger.paymentMethod === 'MPESA' ? 'M-Pesa payment confirmed.' : 'Cash payment recorded.'}
                  </p>
                  <p className="text-slate-500 text-sm mb-10">
                    Ticket issued for <span className="text-white font-bold">{posPassenger.name}</span> — Seat <span className="text-purple-400 font-black">{posPassenger.seat}</span>
                  </p>
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => window.open(`${api.defaults.baseURL}bookings/${posBookingId}/download_ticket/`, '_blank')}
                      className="w-full bg-green-600 hover:bg-green-500 py-5 rounded-2xl font-black uppercase tracking-widest text-white shadow-lg transition-all"
                    >
                      Download Ticket
                    </button>
                    <button onClick={resetPOS} className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-black uppercase tracking-widest transition-all">
                      New Booking
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'arrivals' && (
            <div className="space-y-12 animate-in fade-in duration-500">
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 px-2 flex items-center gap-3">Upcoming Arrivals</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {boardData.arrivals.filter(s => checkStatus(s, 'DEPARTED')).map(s => (
                            <div key={s.id} className="p-6 rounded-[24px] border border-green-500/20 bg-green-500/5 flex justify-between items-center">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center text-white"><ArrowLeftCircle size={24} /></div>
                                    <div><p className="font-black text-lg">{s.bus_details?.bus_number}</p><p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{new Date(s.departure_time).toLocaleDateString()} • {s.origin_name} → {userData.station}</p></div>
                                </div>
                                <button onClick={() => handleUpdateStatus(s.id, 'ARRIVED')} className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl text-xs font-black uppercase shadow-lg text-white tracking-widest">Mark Arrived</button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="animate-in fade-in duration-500">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 px-2 flex items-center gap-3">Fleet Currently at {userData.station}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {busesAtStation.length > 0 ? busesAtStation.map(bus => (
                    <div key={bus.id} className="p-8 bg-slate-900/40 border border-white/5 rounded-[32px] flex flex-col items-center text-center group hover:bg-purple-600/5 transition-all">
                      <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-purple-500/30 transition-all shadow-xl"><Bus size={32} className="text-purple-500" /></div>
                      <p className="font-mono font-black text-2xl tracking-tighter text-white mb-2">{bus.bus_number}</p>
                      <button onClick={() => { setNewSchedule({...newSchedule, bus: bus.id}); setActiveTab('dispatch'); }} className="w-full bg-slate-950 hover:bg-purple-600 border border-white/10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Dispatch Now</button>
                    </div>
                  )) : <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[40px] border border-dashed border-white/5"><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No available buses at station.</p></div>}
                </div>
            </div>
          )}

          {activeTab === 'departures' && (
            <div className="space-y-12 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-6 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-2xl flex-1"><Search size={18} className="text-slate-500" /><input placeholder="Search Plate..." className="bg-transparent outline-none text-sm w-full" onChange={(e) => setFilters({...filters, bus_number: e.target.value})} /></div>
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-2xl flex-1"><Filter size={18} className="text-slate-500" /><select className="bg-transparent border-none outline-none text-sm w-full text-slate-300" onChange={(e) => setFilters({...filters, destination: e.target.value})}><option value="">All Destinations</option>{stations.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}</select></div>
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-2xl flex-1"><Calendar size={18} className="text-slate-500" /><input type="date" className="bg-transparent border-none outline-none text-sm w-full [color-scheme:dark]" onChange={(e) => setFilters({...filters, date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {getFilteredSchedules().filter(s => checkStatus(s, 'SCHEDULED')).map(s => (
                    <div key={s.id} className="p-6 rounded-[24px] border border-white/5 bg-slate-900/60 flex justify-between items-center">
                      <div className="flex items-center gap-6"><div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center"><ArrowRightCircle size={24} /></div><div><p className="font-black text-lg">{s.bus_details?.bus_number}</p><p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{new Date(s.departure_time).toLocaleDateString()} • {s.origin_name} → {s.destination_name}</p></div></div>
                      <button onClick={() => handleUpdateStatus(s.id, 'DEPARTED')} className="bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-xl text-xs font-black uppercase shadow-lg tracking-widest">Mark Departed</button>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1"><Search size={18} className="text-slate-500" /><input type="text" placeholder="Plate No..." className="bg-transparent border-none outline-none text-sm w-full" value={historyFilters.bus_number} onChange={(e) => setHistoryFilters({...historyFilters, bus_number: e.target.value})} /></div>
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1"><ArrowUpDown size={18} className="text-slate-500" /><select className="bg-transparent border-none outline-none text-sm w-full text-slate-300" value={historyFilters.direction} onChange={(e) => setHistoryFilters({...historyFilters, direction: e.target.value})}><option value="">All Status</option><option value="OUTBOUND">Departures</option><option value="INBOUND">Arrivals</option><option value="TRANSIT">In Transit</option><option value="SCHEDULED">Scheduled</option></select></div>
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1"><Filter size={18} className="text-slate-500" /><select className="bg-transparent border-none outline-none text-sm w-full text-slate-300" value={historyFilters.destination} onChange={(e) => setHistoryFilters({...historyFilters, destination: e.target.value})}><option value="">Station...</option>{stations.map(st => <option key={st.id} value={st.name}>{st.name}</option>)}</select></div>
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1"><Calendar size={18} className="text-slate-500" /><input type="date" className="bg-transparent border-none outline-none text-sm w-full text-slate-300 [color-scheme:dark]" value={historyFilters.date} onChange={(e) => setHistoryFilters({...historyFilters, date: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {getFilteredSchedules(true).length > 0 ? getFilteredSchedules(true).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-6 rounded-3xl border border-white/5 bg-slate-900/40 group">
                      <div className="flex items-center gap-6"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.origin_name === userData.station ? 'bg-purple-600/20 text-purple-400' : 'bg-green-600/20 text-green-400'}`}>{s.origin_name === userData.station ? <ArrowRightCircle size={20}/> : <ArrowLeftCircle size={20}/>}</div><div><p className="font-bold text-lg font-mono">{s.bus_details?.bus_number}</p><p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{s.origin_name} → {s.destination_name}</p><p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{new Date(s.departure_time).toLocaleString()}</p></div></div>
                      <div className="flex items-center gap-6"><div className="text-right"><p className="text-sm font-black text-green-500">KES {s.price}</p><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${checkStatus(s, 'ARRIVED') ? 'bg-green-500/10 text-green-500' : checkStatus(s, 'DEPARTED') ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 'bg-purple-500/10 text-purple-400'}`}>{s.status === 'DEPARTED' ? 'IN TRANSIT' : s.status}</span></div><button onClick={() => handleDeleteSchedule(s.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 transition-all"><XCircle size={20} /></button></div>
                    </div>
                )) : <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-3xl">No matching records found.</div>}
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="max-w-5xl bg-slate-900/60 p-10 rounded-[40px] border border-white/5 animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black mb-1 uppercase italic tracking-tighter flex items-center gap-4"><Truck className="text-purple-500" size={32} /> New Journey Dispatch</h3>
              <p className="text-[10px] text-slate-500 font-bold mb-10 uppercase tracking-widest px-1">Available at {userData.station} station only</p>
              <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <select required className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white font-bold" value={newSchedule.bus} onChange={e => setNewSchedule({...newSchedule, bus: e.target.value})}><option value="">Select Available Bus...</option>{availableBuses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}</select>
                <select required className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white font-bold" value={newSchedule.destination} onChange={e => setNewSchedule({...newSchedule, destination: e.target.value})}><option value="">Destination Station...</option>{stations.filter(s => s.id !== userData.station_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <input required type="datetime-local" className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white font-bold" value={newSchedule.departure_time} onChange={e => setNewSchedule({...newSchedule, departure_time: e.target.value})} />
                <input required type="number" placeholder="Fare" className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white font-bold" value={newSchedule.price} onChange={e => setNewSchedule({...newSchedule, price: e.target.value})} />
                <button type="submit" className="md:col-span-2 bg-purple-600 py-6 rounded-[32px] font-black text-lg hover:bg-purple-500 transition-all uppercase tracking-[0.2em] shadow-2xl active:scale-[0.99]">Dispatch Fleet Member</button>
              </form>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 animate-in fade-in duration-500 overflow-x-auto shadow-2xl">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead><tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest"><th className="px-6 pb-2">Receipt / ID</th><th className="px-6 pb-2">Passenger</th><th className="px-6 pb-2">Amount</th><th className="px-6 pb-2 text-right">Timestamp</th></tr></thead>
                  <tbody>{payments.map((p) => (
                    <tr key={p.id} className="bg-slate-950/50 hover:bg-slate-900 transition-all group">
                      <td className="px-6 py-5 rounded-l-3xl font-mono text-purple-400 font-bold group-hover:text-purple-300 transition-colors">{p.transaction_id || p.id}</td>
                      <td className="px-6 py-5 text-sm font-bold text-white uppercase tracking-tight">{p.passenger_name || 'Walk-in'}</td>
                      <td className="px-6 py-5 text-sm font-black text-green-500">KES {p.amount}</td>
                      <td className="px-6 py-5 rounded-r-3xl text-[10px] font-bold text-slate-500 text-right">{new Date(p.paid_at || p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-500">
              {!isScanning && !scanResult && (
                <div className="bg-slate-900/60 p-12 rounded-[50px] border border-white/10 text-center w-full shadow-2xl">
                  <h3 className="text-3xl font-black mb-4 uppercase italic tracking-tighter">Ticket Verification</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Scan customer QR codes for boarding</p>
                  <select value={boardingSchedule} onChange={(e) => setBoardingSchedule(e.target.value)} className="w-full bg-slate-950 border border-white/10 p-6 rounded-2xl outline-none focus:border-purple-500 mb-8 text-white font-bold appearance-none text-center">
                    <option value="">Select Boarding Journey...</option>
                    {boardData.departures.map(s => <option key={s.id} value={s.id}>{s.bus_details?.bus_number} | To {s.destination_name}</option>)}
                  </select>
                  <button disabled={!boardingSchedule} onClick={() => setIsScanning(true)} className="w-full bg-purple-600 py-7 rounded-[40px] font-black text-xl flex items-center justify-center gap-4 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-700 shadow-2xl transition-all active:scale-95"><Camera size={32} /> OPEN SCANNER</button>
                </div>
              )}
              {isScanning && <div className="w-full bg-slate-900 p-10 rounded-[50px] border border-white/10 overflow-hidden shadow-2xl"><div id="reader" className="rounded-[32px] overflow-hidden border-4 border-slate-950 shadow-inner"></div><button onClick={() => setIsScanning(false)} className="mt-10 w-full py-5 text-slate-500 font-black uppercase text-xs tracking-[0.3em] hover:text-white transition-colors">Abort Scanning</button></div>}
              {scanResult && (
                <div className={`w-full p-12 rounded-[50px] border-2 shadow-2xl transition-all ${scanResult.success ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'}`}><div className="flex flex-col items-center text-center">
                    {scanResult.success ? <CheckCircle2 size={80} className="text-emerald-500 mb-8 animate-bounce" /> : <XCircle size={80} className="text-red-500 mb-8" />}
                    <h3 className={`text-4xl font-black mb-4 uppercase italic tracking-tighter ${scanResult.success ? 'text-emerald-500' : 'text-red-500'}`}>{scanResult.success ? "Ticket Valid" : "Access Denied"}</h3>
                    <p className="text-slate-400 text-lg font-bold mb-10 uppercase tracking-widest">{scanResult.success ? scanResult.data.passenger : scanResult.error}</p>
                    <button onClick={() => { setScanResult(null); setIsScanning(true); }} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-200 transition-colors">Clear & Next Scan</button>
                </div></div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}