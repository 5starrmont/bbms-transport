import { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import ScheduleList from '../components/ScheduleList';
import SeatMap from '../components/SeatMap';
import api from '../api';
import { Bus, MapPin, ArrowLeft, CheckCircle2, Search as SearchIcon, ArrowDown, Loader2, Mail, Phone, Ticket, MessageCircle, Shield, HelpCircle, ChevronRight } from 'lucide-react';

export default function CustomerHome() {
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState(''); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('WAITING');
  const [currentBookingId, setCurrentBookingId] = useState(null);

  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const bookingContentRef = useRef(null);

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
    if (selectedSchedule) setSelectedSchedule(null);
    bookingContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearch = () => {
    setHasSearched(true);
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
    setHasSearched(false);
    setSearchOrigin('');
    setSearchDestination('');
  };

  const handleDownload = () => {
    window.open(`${api.defaults.baseURL}bookings/${currentBookingId}/download_ticket/`, '_blank');
  };

  const routeOrigin = selectedSchedule?.route_details?.origin || selectedSchedule?.origin_name || 'N/A';
  const routeDestination = selectedSchedule?.route_details?.destination || selectedSchedule?.destination_name || 'N/A';
  const busCapacity = selectedSchedule?.bus_details?.capacity || 0;
  const bookedSeats = selectedSchedule?.booked_seats || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans relative overflow-x-hidden">
      
      <nav className="p-6 flex justify-between items-center fixed top-0 w-full z-[100] backdrop-blur-md bg-white/10 border-b border-white/5 pointer-events-auto">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={resetFlow}>
          <div className="bg-purple-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-lg">
            <Bus className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-black">TwendeBus</span>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {!selectedSchedule && (
            <button 
              onClick={executeScroll}
              className="hidden md:flex items-center gap-2 bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-purple-600 transition-all active:scale-95"
            >
              <Ticket size={14} /> Book Now
            </button>
          )}
        </div>
      </nav>

      {!selectedSchedule && !isBooked && (
        <div className="relative w-full h-[100vh] z-0 overflow-hidden bg-slate-950">
          <div className="w-full h-full scale-105">
            <Spline scene="https://prod.spline.design/tnGiPs0kikO0g3AP/scene.splinecode" />
          </div>

          <div className="absolute inset-0 flex flex-col items-center pointer-events-none">
            <div className="absolute bottom-[22%] flex flex-col items-center gap-4">
              <button 
                onClick={executeScroll}
                className="px-24 py-7 bg-[#0f172a] border border-slate-700 rounded-full font-black text-white text-xl hover:bg-purple-600 hover:border-purple-400 transition-all shadow-[0_0_60px_rgba(0,0,0,1)] backdrop-blur-md flex items-center gap-3 pointer-events-auto active:scale-95 group z-50 cursor-pointer ring-2 ring-slate-800/50"
              >
                Book Now <ArrowDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
              </button>
              <span className="text-slate-500 text-xs font-bold tracking-[0.3em] uppercase animate-pulse">Click to Scroll</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-28 z-20 flex flex-col items-center justify-center bg-gradient-to-t from-[#020617] via-[#020617] to-purple-950/30">
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

            <div className="w-full max-w-4xl px-6 mb-16 flex justify-center pointer-events-auto">
              <div className="w-full bg-slate-900/60 backdrop-blur-3xl p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-wrap md:flex-nowrap gap-4 items-center focus-within:border-purple-500/50 transition-all">
                <div className="flex-1 flex items-center gap-3 px-4 border-r border-slate-800">
                  <MapPin className="text-purple-500" size={20} />
                  <input
                    type="text"
                    placeholder="From..."
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-transparent outline-none w-full py-2 placeholder:text-slate-600 text-white"
                  />
                </div>
                <div className="flex-1 flex items-center gap-3 px-4">
                  <MapPin className="text-pink-500" size={20} />
                  <input
                    type="text"
                    placeholder="To..."
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-transparent outline-none w-full py-2 placeholder:text-slate-600 text-white"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-purple-600 px-6 py-3 rounded-2xl shadow-lg hover:bg-purple-500 transition-all active:scale-95 flex items-center gap-2 font-bold text-sm whitespace-nowrap"
                >
                  <SearchIcon size={18} /> Search Buses
                </button>
              </div>
            </div>

            {hasSearched && (
              <div className="w-full bg-slate-950 border-t border-slate-900 pt-12 pb-20 px-6 flex justify-center">
                <div className="max-w-5xl w-full flex flex-col items-center pointer-events-auto">
                  <div className="w-full flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black text-slate-300 uppercase tracking-widest">
                      Results {searchOrigin && 'from '}
                      {searchOrigin && <span className="text-purple-400">{searchOrigin}</span>}
                      {searchDestination && ' to '}
                      {searchDestination && <span className="text-pink-400">{searchDestination}</span>}
                    </h2>
                    <button
                      onClick={() => { setHasSearched(false); setSearchOrigin(''); setSearchDestination(''); }}
                      className="text-xs text-slate-500 hover:text-white font-bold uppercase tracking-widest transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <ScheduleList
                    onSelectSchedule={setSelectedSchedule}
                    filterOrigin={searchOrigin}
                    filterDestination={searchDestination}
                  />
                </div>
              </div>
            )}

            {!hasSearched && (
              <div className="w-full max-w-5xl px-6 mb-24 pointer-events-auto">
                <h2 className="text-center text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-12">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { step: '01', title: 'Search Your Route', desc: 'Enter your origin and destination to find available buses heading your way.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { step: '02', title: 'Pick Your Seat', desc: 'Choose your preferred seat from the live seat map and fill in your details.', color: 'text-pink-400', bg: 'bg-pink-500/10' },
                    { step: '03', title: 'Pay via M-Pesa', desc: 'Complete your booking instantly with an M-Pesa STK push — no cash, no queues.', color: 'text-green-400', bg: 'bg-green-500/10' },
                  ].map((item) => (
                    <div key={item.step} className="bg-slate-900/40 border border-white/5 p-8 rounded-[32px] flex flex-col gap-4 hover:bg-slate-900/60 transition-all">
                      <div className={`${item.bg} ${item.color} w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg`}>{item.step}</div>
                      <h3 className="font-black text-lg text-white">{item.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasSearched && (
              <div className="w-full bg-slate-900/30 border-y border-white/5 py-20 px-6 mb-0">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-center text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-12">Why TwendeBus</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { icon: Shield, label: 'Safe & Secure', desc: 'All payments encrypted & verified' },
                      { icon: Ticket, label: 'Instant Tickets', desc: 'Get your boarding pass in seconds' },
                      { icon: Phone, label: 'M-Pesa Ready', desc: 'Pay easily via mobile money' },
                      { icon: HelpCircle, label: '24/7 Support', desc: "We're always here to help" },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex flex-col items-center text-center gap-3 p-6 bg-slate-900/40 rounded-[24px] border border-white/5">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                          <Icon className="text-purple-400" size={22} />
                        </div>
                        <p className="font-black text-sm text-white">{label}</p>
                        <p className="text-slate-500 text-xs">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ FOOTER */}
            <footer className="w-full bg-slate-950 border-t border-white/5 pt-16 pb-10 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

                  {/* Brand */}
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-purple-600 p-1.5 rounded-lg"><Bus className="text-white w-4 h-4" /></div>
                      <span className="text-xl font-black tracking-tighter">TwendeBus</span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">Kenya's modern bus ticketing platform. Book your seat, pay via M-Pesa, and travel stress-free.</p>
                    {/* ✅ Social icons using text/emoji instead of missing lucide icons */}
                    <div className="flex gap-3">
                      <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-9 h-9 bg-slate-800 hover:bg-blue-600 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                        <span className="text-slate-400 text-sm font-black">f</span>
                      </a>
                      <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-9 h-9 bg-slate-800 hover:bg-sky-500 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                        <span className="text-slate-400 text-sm font-black">𝕏</span>
                      </a>
                      <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-9 h-9 bg-slate-800 hover:bg-pink-600 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                        <span className="text-slate-400 text-sm font-black">ig</span>
                      </a>
                      <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="w-9 h-9 bg-slate-800 hover:bg-green-600 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                        <MessageCircle size={16} className="text-slate-400" />
                      </a>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Quick Links</h4>
                    <ul className="space-y-3">
                      {['Book a Ticket', 'Check Bus Schedule', 'Track My Bus', 'Cancel Booking'].map(link => (
                        <li key={link}>
                          <a href="#" className="text-slate-500 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 group">
                            <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform text-purple-500" />{link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Company */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Company</h4>
                    <ul className="space-y-3">
                      {['About Us', 'Careers', 'Privacy Policy', 'Terms of Service'].map(link => (
                        <li key={link}>
                          <a href="#" className="text-slate-500 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 group">
                            <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform text-purple-500" />{link}
                          </a>
                        </li>
                      ))}
                      <li>
                        <a href="/admin/login" className="text-purple-500 hover:text-purple-400 text-sm font-black transition-colors flex items-center gap-2 group">
                          <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />Operator Login
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Contact */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Contact Us</h4>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <Phone size={14} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">+254 700 000 000</p>
                          <p className="text-slate-500 text-xs">Mon–Sat, 6am – 10pm</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <Mail size={14} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">support@twendebus.co.ke</p>
                          <p className="text-slate-500 text-xs">We reply within 2 hours</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-600/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <MessageCircle size={14} className="text-green-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">WhatsApp Support</p>
                          <p className="text-slate-500 text-xs">Chat with us instantly</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
                    © {new Date().getFullYear()} TwendeBus. All rights reserved.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">All systems operational</p>
                  </div>
                </div>
              </div>
            </footer>
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
                      Please check your phone. Enter your M-Pesa PIN for KES {selectedSchedule?.price}.
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
                    <SeatMap capacity={busCapacity} selectedSeat={selectedSeat} onSelectSeat={setSelectedSeat} bookedSeats={bookedSeats} />
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border border-white/10 sticky top-28 shadow-xl">
                  <h2 className="text-2xl font-bold mb-4 text-purple-400 text-center">Checkout</h2>
                  <div className="space-y-4 mb-8 bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                    <p className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                      <span className="text-slate-500">Route</span> 
                      <span className="font-bold">{routeOrigin} → {routeDestination}</span>
                    </p>
                    <p className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                      <span className="text-slate-500">Price</span> 
                      <span className="text-green-400 font-bold">KES {selectedSchedule?.price}</span>
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
                      {loading ? "Processing..." : `Pay KES ${selectedSchedule?.price}`}
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