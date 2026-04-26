import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Ticket, Bus, MapPin, Clock, Banknote, 
  Smartphone, Check, Loader2, User, Phone, ArrowRight 
} from 'lucide-react';
import api from '../api';

export default function BookingPOS() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get('schedules/admin_list/');
        // Only show upcoming/scheduled journeys
        const upcoming = (res.data.results || res.data).filter(s => s.status === 'SCHEDULED');
        setSchedules(upcoming);
      } catch (err) {
        console.error("Failed to fetch schedules");
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const filteredSchedules = schedules.filter(s => 
    s.bus_details.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.destination_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <Ticket className="text-purple-500" size={36} /> Booking POS
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] mt-2">Ticket Issuing Terminal</p>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search Destination or Plate..." 
              className="w-full bg-slate-900 border border-white/5 p-5 pl-12 rounded-[2rem] outline-none focus:border-purple-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={40} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchedules.map((s) => (
              <div 
                key={s.id} 
                onClick={() => navigate(`/operator/book/${s.id}`)}
                className="bg-slate-900/40 border border-white/5 p-6 rounded-[32px] hover:bg-slate-900 hover:border-purple-500/50 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 blur-3xl -z-10"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 text-purple-400 group-hover:scale-110 transition-transform">
                    <Bus size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Plate Number</p>
                    <p className="font-mono font-black text-lg">{s.bus_details.bus_number}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-300">
                    <MapPin size={18} className="text-purple-500" />
                    <span className="font-bold text-sm uppercase tracking-wider">{s.origin_name} → {s.destination_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Clock size={18} />
                    <span className="text-xs font-bold">{new Date(s.departure_time).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fare</p>
                    <p className="text-xl font-black text-emerald-500">KES {s.price}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:translate-x-1 transition-transform">
                    <ArrowRight size={20} />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredSchedules.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[40px] border border-dashed border-white/5">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No journeys found for booking.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}