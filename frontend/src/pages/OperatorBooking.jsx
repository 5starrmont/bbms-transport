import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Banknote, Smartphone, Check, Loader2, 
  User, Phone, Ticket, Bus, Armchair 
} from 'lucide-react';
import api from '../api';
import SeatMap from '../components/SeatMap';

export default function OperatorBooking() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [passengerDetails, setPassengerDetails] = useState({ 
    name: '', 
    phone: '', 
    seat: null, 
    paymentMethod: 'CASH' 
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await api.get(`schedules/${scheduleId}/`);
        setSchedule(res.data);
      } catch (err) {
        console.error("Failed to fetch schedule");
        navigate('/operator/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [scheduleId, navigate]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!passengerDetails.seat) return alert("Please select a seat on the map!");
    
    setBookingLoading(true);
    try {
      const res = await api.post('bookings/', {
        schedule: scheduleId,
        passenger_name: passengerDetails.name,
        passenger_phone: passengerDetails.phone,
        seat_number: passengerDetails.seat,
        status: passengerDetails.paymentMethod === 'CASH' ? 'PAID' : 'PENDING'
      });

      if (passengerDetails.paymentMethod === 'MPESA') {
        await api.post('payments/stk_push/', {
          booking_id: res.data.id,
          phone_number: passengerDetails.phone,
          amount: schedule.price
        });
        alert("STK Push initiated!");
      } else {
        alert("Cash booking successful!");
      }
      navigate('/operator/dashboard');
    } catch (err) {
      alert("Booking failed: " + (err.response?.data?.error || "Unknown error"));
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-purple-500" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate('/operator/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={20} />
          <span className="font-black uppercase tracking-widest text-[10px]">Cancel & Exit</span>
        </button>
        <div className="text-right">
          <h1 className="text-xl font-black italic uppercase tracking-tighter">POS Terminal</h1>
          <p className="text-purple-400 font-bold text-[10px] uppercase tracking-widest">{schedule?.bus_details.bus_number} • {schedule?.destination_name}</p>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left: Scrollable Seat Map */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-hide bg-slate-950">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-10 text-center">Select Passenger Seat</h3>
            <SeatMap 
              capacity={schedule.bus_details.capacity} 
              selectedSeat={passengerDetails.seat} 
              onSelectSeat={(seat) => setPassengerDetails({...passengerDetails, seat})} 
              bookedSeats={schedule.booked_seats} 
            />
          </div>
        </div>

        {/* Right: Checkout Sidebar */}
        <aside className="w-full lg:w-[450px] bg-slate-900/40 border-l border-white/5 p-8 overflow-y-auto">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">Ticket Details</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-loose">Collect passenger information and payment mode.</p>
            </div>

            <form onSubmit={handleBooking} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Full Name</label>
                  <input 
                    required 
                    className="w-full bg-slate-950 border border-white/10 p-5 rounded-3xl outline-none focus:border-purple-500 transition-all font-bold" 
                    placeholder="Passenger Name" 
                    value={passengerDetails.name} 
                    onChange={e => setPassengerDetails({...passengerDetails, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Phone Number</label>
                  <input 
                    required 
                    className="w-full bg-slate-950 border border-white/10 p-5 rounded-3xl outline-none focus:border-purple-500 transition-all font-bold" 
                    placeholder="07..." 
                    value={passengerDetails.phone} 
                    onChange={e => setPassengerDetails({...passengerDetails, phone: e.target.value})} 
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-6 rounded-[32px] border border-white/5 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-black uppercase tracking-widest">Selected Seat</span>
                  <span className={`text-xl font-mono font-black ${passengerDetails.seat ? 'text-purple-400' : 'text-slate-700 italic'}`}>
                    {passengerDetails.seat || '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-4 border-t border-white/5">
                  <span className="text-slate-500 font-black uppercase tracking-widest">Total Fare</span>
                  <span className="text-2xl font-black text-emerald-500 tracking-tighter">KES {schedule.price}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Payment Method</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setPassengerDetails({...passengerDetails, paymentMethod: 'CASH'})} 
                    className={`p-6 rounded-3xl border flex flex-col items-center gap-3 transition-all ${passengerDetails.paymentMethod === 'CASH' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-white/5 text-slate-500 hover:bg-white/5'}`}
                  >
                    <Banknote size={24}/> 
                    <span className="text-[10px] font-black uppercase">Cash sale</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPassengerDetails({...passengerDetails, paymentMethod: 'MPESA'})} 
                    className={`p-6 rounded-3xl border flex flex-col items-center gap-3 transition-all ${passengerDetails.paymentMethod === 'MPESA' ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-slate-950 border-white/5 text-slate-500 hover:bg-white/5'}`}
                  >
                    <Smartphone size={24}/> 
                    <span className="text-[10px] font-black uppercase">M-Pesa POS</span>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={bookingLoading || !passengerDetails.seat} 
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 py-7 rounded-[32px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95"
              >
                {bookingLoading ? <Loader2 className="animate-spin" /> : <><Check size={20}/> Complete Sale</>}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}