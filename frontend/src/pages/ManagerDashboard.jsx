import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Bus, History, CreditCard, Users, Plus, Search, 
  TrendingUp, ArrowUpRight, DollarSign, MapPin, 
  Download, Loader2, LogOut, Menu, ChevronLeft, User, CheckCircle2, 
  ArrowRightCircle, ArrowLeftCircle, Phone, BadgeCheck, Check, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [boardData, setBoardData] = useState({ departures: [], arrivals: [] });
  const [fleet, setFleet] = useState([]); 
  const [payments, setPayments] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [userData, setUserData] = useState({ username: 'Manager' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [paymentStats, setPaymentStats] = useState({ today_revenue: 0, today_count: 0, total_revenue: 0, active_tickets: 0 });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [historyFilters, setHistoryFilters] = useState({ bus_number: '' });
  const [stations, setStations] = useState([]); 

  const [newBus, setNewBus] = useState({ 
    bus_number: '', capacity: 40, current_location: '', driver_name: '', driver_phone: '', driver_license_number: ''
  });
  const [busSubmitLoading, setBusSubmitLoading] = useState(false);

  // 1. ROLE GUARD & SESSION SYNC
  useEffect(() => {
    const checkAuth = () => {
      const role = localStorage.getItem('user_role');
      if (role !== 'manager') {
        navigate('/admin/login');
      }
    };

    checkAuth();
    
    // Listener to detect if another tab logs in as Operator
    const syncSession = (e) => {
      if (e.key === 'user_role') window.location.reload();
    };

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, [navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, bRes, sRes, pRes, stRes, hRes, fRes] = await Promise.all([
        api.get('user/profile/'),
        api.get('schedules/station_board/'), 
        api.get('payments/stats/'),
        api.get('payments/'),
        api.get('stations/'),
        api.get('schedules/admin_list/'), 
        api.get('buses/') 
      ]);
      
      const extract = (res) => res.data.results || res.data || [];
      
      setUserData(uRes.data);
      setPaymentStats(sRes.data);
      setPayments(extract(pRes));
      setStations(extract(stRes));
      setFleet(extract(fRes));
      setAllSchedules(extract(hRes));
      
      setBoardData({
        departures: bRes.data?.departures || [],
        arrivals: bRes.data?.arrivals || []
      });

    } catch (err) {
      console.error("Manager Sync Error:", err);
      if (err.response?.status === 401) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [activeTab, fetchData]);

  const handleRegisterBus = async (e) => {
    e.preventDefault();
    setBusSubmitLoading(true);
    try {
      await api.post('buses/', newBus);
      setNewBus({ bus_number: '', capacity: 40, current_location: '', driver_name: '', driver_phone: '', driver_license_number: '' });
      fetchData();
      alert("Bus Registered Successfully");
    } catch (err) {
      alert("Error: " + (err.response?.data?.bus_number?.[0] || "Failed to register"));
    } finally { setBusSubmitLoading(false); }
  };

  const tabs = [
    { id: 'dashboard', label: 'Global Board', icon: LayoutDashboard },
    { id: 'fleet', label: 'Fleet Control', icon: Bus },
    { id: 'history', label: 'Company History', icon: History },
    { id: 'payments', label: 'Financial Ledger', icon: CreditCard },
  ];

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900/40 border-r border-white/5 backdrop-blur-xl flex flex-col transition-all duration-300 shrink-0`}>
        <div className="p-6 border-b border-white/5 flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="bg-purple-600 p-2 rounded-xl shrink-0"><Bus size={20} /></div>
          {isSidebarOpen && <span className="text-xl font-black tracking-tighter text-white uppercase italic">TwendeOps</span>}
        </div>
        <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
              <tab.icon size={20} className="shrink-0" />
              {isSidebarOpen && <span className="text-sm font-black uppercase italic tracking-tighter">{tab.label}</span>}
            </button>
          ))}
        </nav>
        <button onClick={() => { localStorage.clear(); navigate('/admin/login'); }} className="m-4 flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-500/10 transition-all overflow-hidden">
          <LogOut size={20} /> {isSidebarOpen && <span className="text-sm font-black uppercase italic tracking-tighter">Exit HQ</span>}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-2xl font-black tracking-tight uppercase italic">Manager Console</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none">{userData.username}</p>
              <p className="text-[10px] text-purple-400 font-bold uppercase mt-1 tracking-widest leading-none">Global Administrator</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10"><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 italic">System Total Revenue</span>
                    <p className="text-3xl font-black text-green-500 tracking-tighter italic">KES {paymentStats.total_revenue || 0}</p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 italic">Total Fleet</span>
                    <p className="text-3xl font-black text-white tracking-tighter italic">{fleet.length}</p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 italic">Global Sales Today</span>
                    <p className="text-3xl font-black text-purple-400 tracking-tighter italic">KES {paymentStats.today_revenue || 0}</p>
                </div>
                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 italic">Unchecked Tickets</span>
                    <p className="text-3xl font-black text-orange-500 tracking-tighter italic">{paymentStats.active_tickets || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 h-fit shadow-2xl">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 italic"><ArrowRightCircle size={16} className="text-purple-500"/> Global Departures</h3>
                    <div className="space-y-3">
                        {boardData.departures.length > 0 ? boardData.departures.map(s => (
                            <div key={s.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group transition-all hover:bg-slate-900">
                                <div><p className="font-black text-base italic uppercase">{s.origin_name} → {s.destination_name}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.bus_details?.bus_number} • {new Date(s.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-md ${s.status === 'DEPARTED' ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 'bg-purple-500/10 text-purple-400'}`}>{s.status === 'DEPARTED' ? 'TRANSIT' : s.status}</span>
                            </div>
                        )) : <p className="text-center py-4 text-slate-600 uppercase font-black text-[10px] italic">No active departures</p>}
                    </div>
                </div>
                <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 h-fit shadow-2xl">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 italic"><ArrowLeftCircle size={16} className="text-green-500"/> Global Arrivals</h3>
                    <div className="space-y-3">
                        {boardData.arrivals.length > 0 ? boardData.arrivals.map(s => (
                            <div key={s.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group transition-all hover:bg-slate-900">
                                <div><p className="font-black text-base italic uppercase">{s.origin_name} → {s.destination_name}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.bus_details?.bus_number} • {new Date(s.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400`}>{s.status}</span>
                            </div>
                        )) : <p className="text-center py-4 text-slate-600 uppercase font-black text-[10px] italic">No recent arrivals</p>}
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="bg-slate-900/60 p-10 rounded-[40px] border border-white/10 h-fit shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -z-10"></div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3"><Plus className="text-purple-500" /> New Fleet Entry</h3>
                <form onSubmit={handleRegisterBus} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <input required placeholder="Plate No." className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl outline-none focus:border-purple-500 font-bold text-sm" value={newBus.bus_number} onChange={e => setNewBus({...newBus, bus_number: e.target.value})} />
                    <input required type="number" placeholder="Capacity" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl outline-none focus:border-purple-500 font-bold text-sm" value={newBus.capacity} onChange={e => setNewBus({...newBus, capacity: e.target.value})} />
                  </div>
                  <input required placeholder="Driver Full Name" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl outline-none focus:border-purple-500 font-bold text-sm" value={newBus.driver_name} onChange={e => setNewBus({...newBus, driver_name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input required placeholder="Driver Phone" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl outline-none focus:border-purple-500 font-bold text-sm" value={newBus.driver_phone} onChange={e => setNewBus({...newBus, driver_phone: e.target.value})} />
                    <input required placeholder="License No." className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl outline-none focus:border-purple-500 font-bold text-sm" value={newBus.driver_license_number} onChange={e => setNewBus({...newBus, driver_license_number: e.target.value})} />
                  </div>
                  <select required className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl outline-none focus:border-purple-500 font-bold text-sm uppercase" value={newBus.current_location} onChange={e => setNewBus({...newBus, current_location: e.target.value})}>
                    <option value="">Base Station...</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="submit" disabled={busSubmitLoading} className="w-full bg-purple-600 py-6 rounded-[32px] font-black uppercase italic tracking-widest hover:bg-purple-500 transition-all shadow-2xl flex items-center justify-center gap-3">
                    {busSubmitLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24}/> Confirm Registration</>}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 grid md:grid-cols-2 gap-6 h-fit">
                {fleet.length > 0 ? fleet.map(bus => (
                  <div key={bus.id} className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 flex flex-col group relative overflow-hidden shadow-xl hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-purple-500 border border-white/5 shadow-inner group-hover:scale-110 transition-transform"><Bus size={32}/></div>
                        <div>
                          <p className="text-2xl font-black font-mono tracking-tighter italic">{bus.bus_number}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> {bus.current_location_name || 'Global Ops'}</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 px-4 py-1.5 rounded-full border border-white/5 text-[10px] font-black text-purple-400 italic">#{bus.capacity} SEATS</div>
                    </div>
                    <div className="space-y-3 bg-slate-950/50 p-6 rounded-[30px] border border-white/5 shadow-inner">
                       <div className="flex items-center gap-3 text-slate-300 italic"><User size={16} className="text-purple-500"/><p className="text-xs font-black uppercase">{bus.driver_name || 'Unassigned'}</p></div>
                       <div className="flex items-center gap-3 text-slate-300"><Phone size={16} className="text-purple-500"/><p className="text-xs font-mono font-bold tracking-tighter">{bus.driver_phone || '--'}</p></div>
                       <div className="flex items-center gap-3 text-slate-300"><BadgeCheck size={16} className="text-purple-500"/><p className="text-[9px] font-black uppercase opacity-60 tracking-[0.1em]">DL: {bus.driver_license_number || '--'}</p></div>
                    </div>
                  </div>
                )) : <div className="col-span-2 py-20 text-center text-slate-600 uppercase font-black italic tracking-widest border border-dashed border-white/10 rounded-[40px]">No vehicles found in fleet</div>}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 animate-in fade-in duration-500 overflow-x-auto shadow-2xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8 italic px-6">System Transaction Ledger</h3>
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead><tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic px-8"><th className="pb-2">Receipt</th><th className="pb-2">Passenger</th><th className="pb-2">Station</th><th className="pb-2">Amount</th><th className="pb-2 text-right">Timestamp</th></tr></thead>
                  <tbody>{payments.length > 0 ? payments.map((p) => (
                    <tr key={p.id} className="bg-slate-950/50 hover:bg-slate-900 transition-all group">
                      <td className="px-8 py-5 rounded-l-3xl font-mono text-purple-400 font-black italic">{p.transaction_id || p.id}</td>
                      <td className="px-8 py-5 text-sm font-black italic uppercase">{p.passenger_name || 'Walk-in'}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">{p.origin_name || 'HQ'}</td>
                      <td className="px-8 py-5 text-lg font-black text-green-500 italic">KES {p.amount}</td>
                      <td className="px-8 py-5 rounded-r-3xl text-[10px] font-black text-slate-600 text-right uppercase tracking-widest">{new Date(p.paid_at || p.created_at).toLocaleString()}</td>
                    </tr>
                  )) : <tr><td colSpan="5" className="text-center py-10 text-slate-600 uppercase font-black italic">No transactions found</td></tr>}</tbody>
                </table>
            </div>
          )}

          {activeTab === 'history' && (
             <div className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 animate-in fade-in duration-500 shadow-2xl overflow-hidden">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead><tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic px-8"><th className="pb-2">Bus</th><th className="pb-2">Log Path</th><th className="pb-2">Departure</th><th className="pb-2">Status</th><th className="pb-2 text-right">Fare</th></tr></thead>
                  <tbody>{allSchedules.length > 0 ? allSchedules.map((s) => (
                    <tr key={s.id} className="bg-slate-950/50 hover:bg-slate-900 transition-all group">
                      <td className="px-8 py-6 rounded-l-[30px] font-mono text-purple-400 font-black italic text-lg tracking-tighter">{s.bus_details?.bus_number}</td>
                      <td className="px-8 py-6 text-sm font-black italic uppercase tracking-wider">{s.origin_name} → {s.destination_name}</td>
                      <td className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(s.departure_time).toLocaleString()}</td>
                      <td className="px-8 py-6"><span className={`text-[10px] font-black px-4 py-1.5 rounded-full italic tracking-widest ${s.status === 'ARRIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-400'}`}>{s.status}</span></td>
                      <td className="px-8 py-6 rounded-r-[30px] text-lg font-black text-right italic tracking-tighter">KES {s.price}</td>
                    </tr>
                  )) : <tr><td colSpan="5" className="text-center py-10 text-slate-600 uppercase font-black italic">No history records found</td></tr>}</tbody>
                </table>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}