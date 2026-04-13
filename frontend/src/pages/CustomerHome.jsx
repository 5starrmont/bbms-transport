import { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import ScheduleList from '../components/ScheduleList';
import SeatMap from '../components/SeatMap';
import api from '../api';
import { Bus, MapPin, ArrowLeft, CheckCircle2, Search as SearchIcon, ArrowDown, Loader2, Download, Mail, Phone, Ticket } from 'lucide-react';

export default function CustomerHome() {
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState(''); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('WAITING'); // WAITING, PAID
  const [currentBookingId, setCurrentBookingId] = useState(null);

  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  const bookingContentRef = useRef(null);

  // PAYMENT POLLING LOGIC
  useEffect(() => {
    let interval;
    if (isBooked && currentBookingId && paymentStatus === 'WAITING') {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`bookings/${currentBookingId}/`);
          if (res.data.status === 'PAID') {
            setPaymentStatus('PAID');
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isBooked, currentBookingId, paymentStatus]);

  const executeScroll = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // If a schedule is already selected, reset it so we can see the search list again
    if (selectedSchedule) setSelectedSchedule(null);
    
    bookingContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSeat) return alert("Please select a seat first!");
    
    setLoading(true);
    try {
      const bookingRes = await api.post('bookings/', {
        schedule: selectedSchedule.id,
        passenger_name: passengerName,
        passenger_email: passengerEmail || null,
        seat_number: selectedSeat,
        status: 'PENDING'
      });
      
      if (bookingRes.status === 201) {
        setCurrentBookingId(bookingRes.data.id);
        const paymentRes = await api.post('payments/stk_push/', {
          booking_id: bookingRes.data.id,
          phone_number: phoneNumber,
          amount: selectedSchedule.price
        });
        
        if (paymentRes.data.ResponseCode === '0') {
            setIsBooked(true); 
        } else {
            alert("M-Pesa STK Push failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Process failed:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setSelectedSchedule(null);
    setSelectedSeat(null);
    setIsBooked(false);
    setPaymentStatus('WAITING');
    setCurrentBookingId(null);
    setPassengerName('');
    setPassengerEmail('');
    setPhoneNumber('');
  };

  const handleDownload = () => {
    window.open(`${api.defaults.baseURL}bookings/${currentBookingId}/download_ticket/`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans relative overflow-x-hidden">
      
      {/* NAVBAR WITH BOOK NOW SECTION */}
      <nav className="p-6 flex justify-between items-center fixed top-0 w-full z-[100] backdrop-blur-md bg-white/10 border-b border-white/5 pointer-events-auto">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={resetFlow}>
          <div className="bg-purple-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-lg">
            <Bus className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-black">TwendeBus</span>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
            {/* Nav CTA - Only show if not currently booking */}
            {!selectedSchedule && (
              <button 
                onClick={executeScroll}
                className="hidden md:flex items-center gap-2 bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-purple-600 transition-all active:scale-95"
              >
                <Ticket size={14} /> Book Now
              </button>
            )}
            
            <a href="/admin/login" className="text-sm text-slate-900 hover:text-purple-600 transition-colors font-bold">
              Operator Login
            </a>
        </div>
      </nav>

      {/* 3D HERO AREA */}
      {!selectedSchedule && !isBooked && (
        <div className="relative w-full h-[100vh] z-0 overflow-hidden bg-slate-950">
          <div className="w-full h-full scale-105">
            <Spline scene="https://prod.spline.design/tnGiPs0kikO0g3AP/scene.splinecode" />
          </div>

          <div className="absolute inset-0 flex flex-col items-center pointer-events-none">
            <button 
                onClick={executeScroll}
                className="absolute bottom-[22%] px-24 py-7 bg-[#0f172a] border border-slate-700 rounded-full font-black text-white text-xl hover:bg-purple-600 hover:border-purple-400 transition-all shadow-[0_0_60px_rgba(0,0,0,1)] backdrop-blur-md flex items-center gap-3 pointer-events-auto active:scale-95 group z-50 cursor-pointer ring-2 ring-slate-800/50"
            >
                Book Now <ArrowDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>

          {/* HARMONIZED BRAND FOOTER MASK - Matching Spline Colors */}
          <div className="absolute bottom-0 left-0 right-0 h-28 z-20 flex flex-col items-center justify-center bg-gradient-to-t from-[#020617] via-[#020617] to-purple-950/30">
             {/* Glowing Horizon Line using Spline hues */}
             <div className="absolute top-0 w-2/3 h-[2px] bg-gradient-to-r from-transparent via-pink-500/80 to-transparent blur-[1px]" />
             <div className="absolute top-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
             
             <span style={{ fontFamily: "'Pacifico', cursive" }} className="text-purple-200 text-3xl tracking-wide opacity-90 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                Your Journey, Simplified
             </span>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-[#020617] z-10 pointer-events-none" />
        </div>
      )}

      <main className="flex-1 relative z-10 w-full flex flex-col items-center bg-slate-950">
        {!selectedSchedule ? (
          <>
            <div ref={bookingContentRef} className="scroll-mt-24 pt-20" />
            
            <section className="text-center mb-12 px-6">
              <h1 className="text-7xl font-black mb-4 tracking-tight drop-shadow-2xl text-white">Where to next?</h1>
              <p className="text-slate-300 text-xl font-medium drop-shadow-md">Your Journey, Simplified.</p>
            </section>

            {/* Search Interface */}
            <div className="w-full max-w-4xl px-6 mb-32 flex justify-center pointer-events-auto">
              <div className="w-full bg-slate-900/60 backdrop-blur-3xl p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-wrap md:flex-nowrap gap-4 items-center focus-within:border-purple-500/50 transition-all">
                <div className="flex-1 flex items-center gap-3 px-4 border-r border-slate-800">
                  <MapPin className="text-purple-500" size={20} />
                  <input type="text" placeholder="From..." value={searchOrigin} onChange={(e) => setSearchOrigin(e.target.value)} className="bg-transparent outline-none w-full py-2 placeholder:text-slate-600 text-white" />
                </div>
                <div className="flex-1 flex items-center gap-3 px-4">
                  <MapPin className="text-pink-500" size={20} />
                  <input type="text" placeholder="To..." value={searchDestination} onChange={(e) => setSearchDestination(e.target.value)} className="bg-transparent outline-none w-full py-2 placeholder:text-slate-600 text-white" />
                </div>
                <div className="bg-purple-600 p-3 rounded-2xl shadow-lg cursor-pointer hover:bg-purple-500 transition-all active:scale-95">
                  <SearchIcon size={20} />
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-950 border-t border-slate-900 pt-20 pb-40 px-6 flex justify-center">
              <div className="max-w-5xl w-full flex flex-col items-center pointer-events-auto">
                <ScheduleList onSelectSchedule={setSelectedSchedule} filterOrigin={searchOrigin} filterDestination={searchDestination} />
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-6xl mx-auto w-full p-6 mt-16 pb-20 flex justify-center pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isBooked ? (
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-3xl text-center shadow-2xl">
                    {paymentStatus === 'WAITING' ? (
                      <div className="py-4">
                        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-2 text-white">Awaiting Payment...</h2>
                        <p className="text-slate-400">
                            Please check your phone. Enter your M-Pesa PIN for KES {selectedSchedule.price}.
                        </p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <CheckCircle2 className="text-green-400 w-16 h-16 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold mb-2 text-white">Success!</h2>
                        <p className="text-slate-400 mb-8 text-sm">Ticket confirmed and sent via SMS.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleDownload} className="w-full bg-green-600 py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all">Download Ticket</button>
                            <button onClick={resetFlow} className="w-full bg-slate-800 py-4 rounded-xl font-bold transition-all hover:bg-slate-700">New Booking</button>
                        </div>
                      </div>
                    )}
                </div>
            ) : (
                <div className="grid lg:grid-cols-12 gap-12 items-start w-full">
                    <div className="lg:col-span-7 flex flex-col items-center">
                        <button onClick={() => setSelectedSchedule(null)} className="self-start flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
                        </button>
                        <div className="w-full bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl">
                             <SeatMap capacity={selectedSchedule.bus_details.capacity} selectedSeat={selectedSeat} onSelectSeat={setSelectedSeat} bookedSeats={selectedSchedule.booked_seats} />
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border border-white/10 sticky top-28 shadow-xl">
                        <h2 className="text-2xl font-bold mb-4 text-purple-400 text-center">Checkout</h2>
                        <div className="space-y-4 mb-8 bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                            <p className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                              <span className="text-slate-500">Route</span> 
                              <span className="font-bold">{selectedSchedule.route_details.origin} → {selectedSchedule.route_details.destination}</span>
                            </p>
                            <p className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                              <span className="text-slate-500">Price</span> 
                              <span className="text-green-400 font-bold">KES {selectedSchedule.price}</span>
                            </p>
                            <p className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">Seat</span> 
                              <span className="px-4 py-1 rounded-lg font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">{selectedSeat || 'None'}</span>
                            </p>
                        </div>
                        <form onSubmit={handleBooking} className="space-y-4">
                            <input required value={passengerName} onChange={(e) => setPassengerName(e.target.value)} type="text" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-purple-500 text-white transition-all placeholder:text-slate-500" placeholder="Full Name" />
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                              <input value={passengerEmail} onChange={(e) => setPassengerEmail(e.target.value)} type="email" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-4 pl-10 outline-none focus:border-purple-500 text-white transition-all placeholder:text-slate-500" placeholder="Email (Optional)" />
                            </div>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                              <input required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="tel" className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-4 pl-10 outline-none focus:border-purple-500 text-white transition-all placeholder:text-slate-500" placeholder="M-Pesa Number" />
                            </div>
                            <button disabled={loading || !selectedSeat} type="submit" className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold py-5 rounded-xl transition-all shadow-lg active:scale-95 mt-4">
                                {loading ? "Processing..." : `Pay KES ${selectedSchedule.price}`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}