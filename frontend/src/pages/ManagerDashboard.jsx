import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Bus, History, CreditCard, Users, Plus, Search, 
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, MapPin, 
  Filter, Download, Loader2, LogOut, Menu, ChevronLeft, User, CheckCircle2, AlertCircle, Phone, BadgeCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Data States
  const [stats, setStats] = useState({ total_revenue: 0, total_trips: 0, total_buses: 0, active_tickets: 0 });
  const [fleet, setFleet] = useState([]);
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stations, setStations] = useState([]);

  // Form States
  const [newBus, setNewBus] = useState({ 
    bus_number: '', 
    capacity: 40, 
    current_location: '',
    driver_name: '',
    driver_phone: '',
    driver_license_number: ''
  });
  const [busSubmitLoading, setBusSubmitLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, fleetRes, tripsRes, payRes, stationRes] = await Promise.all([
        api.get('payments/stats/'),
        api.get('buses/'),
        api.get('schedules/'),
        api.get('payments/'),
        api.get('stations/')
      ]);

      setStats(statsRes.data);
      setFleet(fleetRes.data.results || fleetRes.data);
      setTrips(tripsRes.data.results || tripsRes.data);
      setPayments(payRes.data.results || payRes.data);
      setStations(stationRes.data.results || stationRes.data);
    } catch (err) {
      console.error("Manager fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegisterBus = async (e) => {
    e.preventDefault();
    setBusSubmitLoading(true);
    try {
      await api.post('buses/', newBus);
      setNewBus({ 
        bus_number: '', 
        capacity: 40, 
        current_location: '',
        driver_name: '',
        driver_phone: '',
        driver_license_number: ''
      });
      fetchData();
      alert("Bus & Driver registered successfully!");
    } catch (err) {
      alert("Failed to register bus.");
    } finally {
      setBusSubmitLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Global Overview', icon: LayoutDashboard },
    { id: 'fleet', label: 'Fleet Management', icon: Bus },
    { id: 'history', label: 'Company History', icon: History },
    { id: 'finances', label: 'Financial Ledger', icon: CreditCard },
  ];

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900/40 border-r border-white/5 backdrop-blur-xl flex flex-col transition-all duration-300 shrink-0`}>
        <div className="p-6 border-b border-white/5 flex items-center gap-3 overflow-hidden">
          <div className="bg-emerald-600 p-2 rounded-xl shrink-0"><TrendingUp size={20} /></div>
          {isSidebarOpen && <span className="text-xl font-black tracking-tighter uppercase italic">TwendeManager</span>}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
              <tab.icon size={20} />
              {isSidebarOpen && <span className="text-sm">{tab.label}</span>}
            </button>
          ))}
        </nav>

        <button onClick={() => { localStorage.clear(); navigate('/admin/login'); }} className="m-4 flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-500/10 transition-all overflow-hidden">
          <LogOut size={20} />
          {isSidebarOpen && <span className="text-sm">Manager Exit</span>}
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-2xl font-black tracking-tight uppercase italic">{activeTab} Dashboard</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20"><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
               <Loader2 className="animate-spin text-emerald-500" size={40} />
               <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Aggregating Global Data...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              
              {activeTab === 'overview' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Revenue', value: `KES ${stats.total_revenue || 0}`, icon: DollarSign, color: 'text-emerald-500' },
                      { label: 'Total Fleet', value: fleet.length, icon: Bus, color: 'text-blue-500' },
                      { label: 'Trips Completed', value: trips.filter(t => t.status === 'ARRIVED').length, icon: CheckCircle2, color: 'text-purple-500' },
                      { label: 'Pending Bookings', value: stats.active_tickets || 0, icon: AlertCircle, color: 'text-orange-500' },
                    ].map((s, i) => (
                      <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 bg-slate-950 rounded-2xl ${s.color}`}><s.icon size={24} /></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                        </div>
                        <p className="text-3xl font-black tracking-tighter">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-[3rem] p-8">
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Recent Company Revenue</h3>
                       <div className="space-y-4">
                          {payments.slice(0, 6).map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><ArrowUpRight size={18}/></div>
                                 <div><p className="font-bold text-sm">{p.passenger_name || 'Walk-in'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{p.transaction_id}</p></div>
                               </div>
                               <p className="font-black text-emerald-500">KES {p.amount}</p>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-8">
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Fleet Status</h3>
                       <div className="space-y-6">
                          <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">In Transit</span><span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg font-black">{trips.filter(t => t.status === 'DEPARTED').length}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Scheduled</span><span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg font-black">{trips.filter(t => t.status === 'SCHEDULED').length}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Maintenance</span><span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg font-black">0</span></div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fleet' && (
                <div className="grid lg:grid-cols-3 gap-10">
                  {/* REGISTER FORM */}
                  <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-white/10 h-fit shadow-2xl">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3"><Plus className="text-emerald-500" /> New Fleet Entry</h3>
                    <form onSubmit={handleRegisterBus} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Plate Number</label>
                          <input required placeholder="KDP 441G" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold mt-1" value={newBus.bus_number} onChange={e => setNewBus({...newBus, bus_number: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Capacity</label>
                          <input required type="number" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold mt-1" value={newBus.capacity} onChange={e => setNewBus({...newBus, capacity: e.target.value})} />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Assigned Driver Name</label>
                        <input required placeholder="Full Name" className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold mt-1" value={newBus.driver_name} onChange={e => setNewBus({...newBus, driver_name: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Driver Phone</label>
                          <input required placeholder="07..." className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold mt-1" value={newBus.driver_phone} onChange={e => setNewBus({...newBus, driver_phone: e.target.value})} />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-2">License No.</label>
                          <input required placeholder="DL-..." className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold mt-1" value={newBus.driver_license_number} onChange={e => setNewBus({...newBus, driver_license_number: e.target.value})} />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Assigned Station</label>
                        <select required className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold mt-1" value={newBus.current_location} onChange={e => setNewBus({...newBus, current_location: e.target.value})}>
                          <option value="">Select Station...</option>
                          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={busSubmitLoading} className="w-full bg-emerald-600 py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95">
                        {busSubmitLoading ? <Loader2 className="animate-spin" /> : 'Register Fleet Member'}
                      </button>
                    </form>
                  </div>

                  {/* FLEET LIST */}
                  <div className="lg:col-span-2 grid md:grid-cols-2 gap-6 h-fit">
                    {fleet.map(bus => (
                      <div key={bus.id} className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 flex flex-col group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-emerald-500 border border-white/5 shadow-inner"><Bus size={28}/></div>
                            <div>
                              <p className="text-2xl font-black font-mono tracking-tighter">{bus.bus_number}</p>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> {bus.current_location_name || 'In Transit'}</p>
                            </div>
                          </div>
                          <div className="bg-slate-950 px-3 py-1 rounded-full border border-white/5 text-[10px] font-black text-emerald-400">{bus.capacity} SEATS</div>
                        </div>

                        <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                           <div className="flex items-center gap-3 text-slate-300">
                             <User size={16} className="text-emerald-500"/>
                             <p className="text-xs font-bold uppercase tracking-wide">{bus.driver_name || 'No Driver Assigned'}</p>
                           </div>
                           <div className="flex items-center gap-3 text-slate-300">
                             <Phone size={16} className="text-emerald-500"/>
                             <p className="text-xs font-mono">{bus.driver_phone || '--'}</p>
                           </div>
                           <div className="flex items-center gap-3 text-slate-300">
                             <BadgeCheck size={16} className="text-emerald-500"/>
                             <p className="text-[10px] font-black uppercase opacity-60">DL: {bus.driver_license_number || '--'}</p>
                           </div>
                        </div>

                        <button className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Edit Details</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="bg-slate-900/40 rounded-[3rem] border border-white/5 p-8 overflow-hidden shadow-2xl">
                    <div className="flex flex-wrap gap-4 mb-8">
                       <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/><input placeholder="Search journeys..." className="w-full bg-slate-950 border border-white/5 p-4 pl-12 rounded-2xl outline-none focus:border-emerald-500 text-sm" /></div>
                       <button className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-slate-400 hover:text-white transition-all"><Filter size={20}/></button>
                       <button className="bg-emerald-600 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg"><Download size={18}/> Export CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead><tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest"><th className="px-6 pb-2">Bus</th><th className="px-6 pb-2">Route</th><th className="px-6 pb-2">Departure</th><th className="px-6 pb-2">Status</th><th className="px-6 pb-2 text-right">Fare</th></tr></thead>
                        <tbody>{trips.map((t) => (
                          <tr key={t.id} className="bg-slate-950/50 hover:bg-slate-900 transition-all group">
                            <td className="px-6 py-5 rounded-l-3xl font-mono text-emerald-400 font-bold">{t.bus_details?.bus_number}</td>
                            <td className="px-6 py-5 text-sm font-bold">{t.origin_name} → {t.destination_name}</td>
                            <td className="px-6 py-5 text-[10px] font-bold text-slate-500">{new Date(t.departure_time).toLocaleString()}</td>
                            <td className="px-6 py-5"><span className={`text-[9px] font-black px-3 py-1 rounded-full ${t.status === 'ARRIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>{t.status}</span></td>
                            <td className="px-6 py-5 rounded-r-3xl text-sm font-black text-right">KES {t.price}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                </div>
              )}

              {activeTab === 'finances' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2 bg-slate-900/40 rounded-[3rem] border border-white/5 p-8 shadow-2xl">
                         <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-8">Global Transaction Ledger</h3>
                         <div className="space-y-3">
                            {payments.map((p, i) => (
                              <div key={i} className="flex items-center justify-between p-5 bg-slate-950/50 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all group">
                                 <div className="flex items-center gap-6">
                                    <div className="p-3 bg-slate-900 rounded-2xl text-slate-500 group-hover:text-emerald-500 transition-colors"><CreditCard size={20}/></div>
                                    <div>
                                       <p className="font-black text-white">{p.passenger_name || 'Walk-in Passenger'}</p>
                                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{p.origin_name} | {p.transaction_id}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-xl font-black text-emerald-500">KES {p.amount}</p>
                                    <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(p.paid_at || p.created_at).toLocaleString()}</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                      
                      <div className="space-y-6">
                         <div className="bg-emerald-600 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={140}/></div>
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Total Net Capital</h4>
                            <p className="text-4xl font-black tracking-tighter">KES {stats.total_revenue || 0}</p>
                            <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                               <span>Daily Growth</span>
                               <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg"><ArrowUpRight size={14}/> +12%</span>
                            </div>
                         </div>
                         <div className="bg-slate-900/40 rounded-[3rem] p-8 border border-white/5">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Revenue by Station</h4>
                            <div className="space-y-6">
                               {stations.map(s => (
                                 <div key={s.id}>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>{s.name}</span><span>KES 0.00</span></div>
                                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[0%]"></div></div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Edit2(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>; }