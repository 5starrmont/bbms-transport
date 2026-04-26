import React, { useState, useEffect, useCallback } from 'react';
import { 
  QrCode, Truck, CreditCard, Bus, MapPin, Loader2, 
  CheckCircle2, XCircle, LayoutDashboard, LogOut, User, Menu, ChevronLeft, Plus, Calendar, Search, Camera, Edit2, ArrowRightCircle, CheckCircle, ArrowLeftCircle, History, X, Filter, ArrowUpDown, Globe,
  TrendingUp, Users, Activity, Clock, Banknote, Ticket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '../api';

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
    { id: 'departures', label: 'POS Sale', icon: Banknote, color: 'bg-emerald-600', desc: 'Station Sale' },
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
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
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
              {/* STATS OVERVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-500/10 rounded-2xl text-green-500"><TrendingUp size={24} /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Today</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter">KES {paymentStats.today_revenue}</p>
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
                      onClick={() => setActiveTab(action.id)}
                      className="group bg-slate-900/40 p-6 rounded-[32px] border border-white/5 text-left hover:bg-slate-900 hover:border-white/10 transition-all relative overflow-hidden"
                    >
                      <div className={`${action.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        <action.icon size={24} />
                      </div>
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
                                <div className="flex gap-2">
                                  <button onClick={() => navigate(`/operator/book/${s.id}`)} className="bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all">Book</button>
                                  <button onClick={() => handleUpdateStatus(s.id, 'DEPARTED')} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest">Depart</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 h-fit">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><ArrowLeftCircle size={16} className="text-green-500"/> Expected Arrivals</h3>
                    <div className="space-y-3">
                        {boardData.arrivals.filter(s => checkStatus(s, 'DEPARTED')).map(s => (
                            <div key={s.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                <div><p className="font-bold text-sm">From {s.origin_name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{s.bus_details?.bus_number} • Est. {new Date(s.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                                <button onClick={() => handleUpdateStatus(s.id, 'ARRIVED')} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all">Mark Arrived</button>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
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
                                <button onClick={() => handleUpdateStatus(s.id, 'ARRIVED')} className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg">Mark Arrived</button>
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
                  )) : (
                    <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[40px] border border-dashed border-white/5">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No available buses at station.</p>
                    </div>
                  )}
                </div>
            </div>
          )}

          {activeTab === 'departures' && (
            <div className="space-y-12 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-6 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                    <Search size={18} className="text-slate-500" />
                    <input placeholder="Search Plate No..." className="bg-transparent outline-none text-sm text-white w-full" value={filters.bus_number || ''} onChange={(e) => setFilters({...filters, bus_number: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                    <Filter size={18} className="text-slate-500" />
                    <select className="bg-transparent border-none outline-none text-sm w-full text-slate-300" value={filters.destination || ''} onChange={(e) => setFilters({...filters, destination: e.target.value})}>
                      <option value="">All Destinations</option>
                      {stations.filter(st => st.name !== userData.station).map(st => (
                        <option key={st.id} value={st.id} className="bg-slate-900">{st.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                    <Calendar size={18} className="text-slate-500" />
                    <input type="date" className="bg-transparent border-none outline-none text-sm w-full text-slate-300 [color-scheme:dark]" value={filters.date || ''} onChange={(e) => setFilters({...filters, date: e.target.value})} />
                  </div>
                </div>
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 px-2 flex items-center gap-3">Upcoming Departures</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {getFilteredSchedules(false).filter(s => checkStatus(s, 'SCHEDULED')).length > 0 ? (
                          getFilteredSchedules(false).filter(s => checkStatus(s, 'SCHEDULED')).map(s => (
                            <div key={s.id} className="p-6 rounded-[24px] border border-white/5 bg-slate-900/60 flex justify-between items-center">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center"><ArrowRightCircle size={24} /></div>
                                    <div>
                                        <p className="font-black text-lg">{s.bus_details?.bus_number}</p>
                                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{new Date(s.departure_time).toLocaleDateString()} • {s.origin_name} → {s.destination_name}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                  <button onClick={() => navigate(`/operator/book/${s.id}`)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg transition-all"><Banknote size={16}/> Cash Book</button>
                                  <button onClick={() => handleUpdateStatus(s.id, 'DEPARTED')} className="bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-xl text-xs font-black uppercase shadow-lg">Depart</button>
                                </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-10 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px] border border-dashed border-white/5 rounded-2xl">No matching upcoming trips</div>
                        )}
                    </div>
                </section>
                <section>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6 px-2">Recently Departed</h3>
                    <div className="grid grid-cols-1 gap-4 opacity-70">
                        {getFilteredSchedules(false).filter(s => checkStatus(s, 'DEPARTED')).map(s => (
                            <div key={s.id} className="p-6 rounded-[24px] border border-purple-500/10 bg-purple-900/5 flex justify-between items-center">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center"><CheckCircle size={24} /></div>
                                    <div><p className="font-black text-lg text-slate-300">{s.bus_details?.bus_number}</p><p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{new Date(s.departure_time).toLocaleDateString()} • {s.origin_name} → {s.destination_name}</p></div>
                                </div>
                                <span className="text-purple-400 font-black text-[10px] uppercase tracking-widest">DEPARTED</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                  <Search size={18} className="text-slate-500" />
                  <input type="text" placeholder="Plate No..." className="bg-transparent border-none outline-none text-sm w-full" value={historyFilters.bus_number} onChange={(e) => setHistoryFilters({...historyFilters, bus_number: e.target.value})} />
                </div>
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                  <ArrowUpDown size={18} className="text-slate-500" />
                  <select className="bg-transparent border-none outline-none text-sm w-full text-slate-300" value={historyFilters.direction} onChange={(e) => setHistoryFilters({...historyFilters, direction: e.target.value})}>
                    <option value="">All Trip Status</option>
                    <option value="OUTBOUND" className="bg-slate-900">Departures from here</option>
                    <option value="INBOUND" className="bg-slate-900">Arrivals to here</option>
                    <option value="TRANSIT" className="bg-slate-900">In Transit (Departed)</option>
                    <option value="SCHEDULED" className="bg-slate-900">Scheduled (Upcoming)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                  <Filter size={18} className="text-slate-500" />
                  <select className="bg-transparent border-none outline-none text-sm w-full text-slate-300" value={historyFilters.destination} onChange={(e) => setHistoryFilters({...historyFilters, destination: e.target.value})}>
                    <option value="">Station...</option>
                    {stations.map(st => (
                      <option key={st.id} value={st.name} className="bg-slate-900">{st.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-4 py-3 rounded-2xl flex-1">
                  <Calendar size={18} className="text-slate-500" />
                  <input type="date" className="bg-transparent border-none outline-none text-sm w-full text-slate-300 [color-scheme:dark]" value={historyFilters.date} onChange={(e) => setHistoryFilters({...historyFilters, date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {getFilteredSchedules(true).length > 0 ? getFilteredSchedules(true).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-6 rounded-3xl border border-white/5 bg-slate-900/40 group">
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.origin_name === userData.station ? 'bg-purple-600/20 text-purple-400' : 'bg-green-600/20 text-green-400'}`}>
                           {s.origin_name === userData.station ? <ArrowRightCircle size={20}/> : <ArrowLeftCircle size={20}/>}
                        </div>
                        <div>
                          <p className="font-bold text-lg font-mono">{s.bus_details?.bus_number}</p>
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{s.origin_name} → {s.destination_name}</p>
                          <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{new Date(s.departure_time).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-black text-green-500">KES {s.price}</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            checkStatus(s, 'ARRIVED') ? 'bg-green-500/10 text-green-500' : 
                            checkStatus(s, 'DEPARTED') ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 
                            checkStatus(s, 'SCHEDULED') ? 'bg-yellow-500/10 text-yellow-500' : 
                            'bg-purple-500/10 text-purple-400'
                          }`}>
                            {s.status === 'DEPARTED' ? 'IN TRANSIT' : s.status}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteSchedule(s.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 transition-all"><XCircle size={20} /></button>
                      </div>
                    </div>
                )) : (
                   <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-3xl">
                      No matching records found.
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="max-w-5xl bg-slate-900/60 p-10 rounded-[40px] border border-white/5 animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black mb-1 flex items-center gap-3 tracking-tight uppercase italic"><Truck className="text-purple-500" /> New Dispatch</h3>
              <p className="text-[10px] text-slate-500 font-bold mb-8 uppercase tracking-widest px-1">Available at {userData.station} station only</p>
              <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <select required className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white" value={newSchedule.bus} onChange={e => setNewSchedule({...newSchedule, bus: e.target.value})}>
                  <option value="">Select Bus...</option>
                  {availableBuses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                </select>
                <select required className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white" value={newSchedule.destination} onChange={e => setNewSchedule({...newSchedule, destination: e.target.value})}>
                  <option value="">Select Destination Station...</option>
                  {stations.filter(s => s.id !== userData.station_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input required type="datetime-local" className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white" value={newSchedule.departure_time} onChange={e => setNewSchedule({...newSchedule, departure_time: e.target.value})} />
                <input required type="number" placeholder="Fare" className="bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 text-white" value={newSchedule.price} onChange={e => setNewSchedule({...newSchedule, price: e.target.value})} />
                <button type="submit" className="md:col-span-2 bg-purple-600 py-6 rounded-2xl font-black text-lg hover:bg-purple-500 transition-all uppercase tracking-widest shadow-2xl">Launch Trip</button>
              </form>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 animate-in fade-in duration-500 overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead><tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest"><th className="px-6 pb-4">Receipt</th><th className="px-6 pb-4">Passenger</th><th className="px-6 pb-4">Amount</th><th className="px-6 pb-4">Timestamp</th></tr></thead>
                  <tbody>{payments.map((p) => (
                    <tr key={p.id} className="bg-slate-950/50 hover:bg-slate-900/50 transition-all">
                      <td className="px-6 py-4 rounded-l-2xl font-mono text-purple-400 font-bold">{p.transaction_id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">{p.passenger_name || 'Anonymous'}</td>
                      <td className="px-6 py-4 rounded-r-2xl text-sm font-black text-green-500">KES {p.amount}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(p.paid_at).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-500">
              {!isScanning && !scanResult && (
                <div className="bg-slate-900/60 p-12 rounded-[40px] border border-white/5 text-center w-full">
                  <h3 className="text-2xl font-black mb-4 uppercase tracking-tight italic">Boarding Check</h3>
                  <select value={boardingSchedule} onChange={(e) => setBoardingSchedule(e.target.value)} className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-purple-600 mb-6 text-white">
                    <option value="">Select Trip...</option>
                    {boardData.departures.map(s => <option key={s.id} value={s.id}>{s.bus_details?.bus_number} | To {s.destination_name}</option>)}
                  </select>
                  <button disabled={!boardingSchedule} onClick={() => setIsScanning(true)} className="w-full bg-purple-600 py-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-purple-500 disabled:bg-slate-800 transition-all active:scale-95"><Camera size={24} /> OPEN SCANNER</button>
                </div>
              )}
              {isScanning && (
                <div className="w-full bg-slate-900 p-8 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl"><div id="reader" className="rounded-3xl overflow-hidden"></div><button onClick={() => setIsScanning(false)} className="mt-8 w-full py-4 text-slate-500 font-black uppercase text-xs">Cancel</button></div>
              )}
              {scanResult && (
                <div className={`w-full p-10 rounded-[40px] border ${scanResult.success ? 'bg-green-600/10 border-green-500/20' : 'bg-red-600/10 border-red-500/20'}`}><div className="flex flex-col items-center text-center">
                    {scanResult.success ? <CheckCircle2 size={64} className="text-green-500 mb-6" /> : <XCircle size={64} className="text-red-500 mb-6" />}
                    <h3 className={`text-3xl font-black mb-2 uppercase italic ${scanResult.success ? 'text-green-500' : 'text-red-500'}`}>{scanResult.success ? "Verified" : "Denied"}</h3>
                    <p className="text-slate-400 text-sm font-bold mb-8 uppercase">{scanResult.success ? scanResult.data.passenger : scanResult.error}</p>
                    <button onClick={() => { setScanResult(null); setIsScanning(true); }} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase">Next</button>
                </div></div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}