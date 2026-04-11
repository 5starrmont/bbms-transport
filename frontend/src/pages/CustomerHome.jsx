import { useState, useEffect } from 'react';
import ScheduleList from '../components/ScheduleList';
import SeatMap from '../components/SeatMap';
import api from '../api';
import { Bus, MapPin, ArrowLeft, CheckCircle2, Phone, Search as SearchIcon, Loader2, Download } from 'lucide-react';

export default function CustomerHome() {
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('WAITING'); // WAITING, PAID
  const [currentBookingId, setCurrentBookingId] = useState(null);

  // Search State
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  // Polling logic to check if the booking status has changed to PAID
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
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [isBooked, currentBookingId, paymentStatus]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSeat) return alert("Please select a seat first!");
    
    setLoading(true);
    try {
      const bookingRes = await api.post('bookings/', {
        schedule: selectedSchedule.id,
        passenger_name: passengerName,
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
            alert("M-Pesa service encountered an issue. Please try again.");
        }
      }
    } catch (err) {
      console.error("Process failed:", err.response?.data || err.message);
      alert("Something went wrong. Please check your phone number and try again.");
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
    setPhoneNumber('');
  };

  // Helper to handle PDF download
  const handleDownload = () => {
    window.open(`${api.defaults.baseURL}bookings/${currentBookingId}/download_ticket/`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans">
      <nav className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={resetFlow}>
          <Bus className="text-purple-500 w-8 h-8" />
          <span className="text-2xl font-black tracking-tighter">TwendeBus</span>
        </div>
        <div className="flex items-center gap-6">
            <a href="/admin/login" className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
            Operator Login
            </a>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {!selectedSchedule ? (
          <>
            <section className="text-center my-12">
              <h1 className="text-5xl font-black mb-4 tracking-tight">Where to next?</h1>
              <p className="text-slate-400 text-lg font-medium">Your Journey, Simplified.</p>
            </section>

            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-wrap md:flex-nowrap gap-4 items-center mb-12 transition-all focus-within:border-purple-500/50">
              <div className="flex-1 flex items-center gap-3 px-4 border-r border-slate-800">
                <MapPin className="text-purple-500" size={20} />
                <input 
                  type="text" 
                  placeholder="From: e.g. Nairobi" 
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  className="bg-transparent outline-none w-full py-2 placeholder:text-slate-600" 
                />
              </div>
              <div className="flex-1 flex items-center gap-3 px-4">
                <MapPin className="text-pink-500" size={20} />
                <input 
                  type="text" 
                  placeholder="To: e.g. Mombasa" 
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="bg-transparent outline-none w-full py-2 placeholder:text-slate-600" 
                />
              </div>
              <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
                <SearchIcon size={20} />
              </div>
            </div>

            <div className="flex justify-center">
              <ScheduleList 
                onSelectSchedule={setSelectedSchedule} 
                filterOrigin={searchOrigin}
                filterDestination={searchDestination}
              />
            </div>
          </>
        ) : isBooked ? (
          <div className="max-w-md mx-auto mt-20 bg-slate-900 border border-slate-800 p-10 rounded-3xl text-center shadow-2xl">
            {paymentStatus === 'WAITING' ? (
              <div className="py-4">
                <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-2">Awaiting Payment...</h2>
                <p className="text-slate-400">
                    Check your phone, {passengerName}. Please enter your M-Pesa PIN for KES {selectedSchedule.price}.
                </p>
              </div>
            ) : (
              <div className="py-4">
                <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                  <CheckCircle2 className="text-green-400 w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-green-400">Success!</h2>
                <p className="text-slate-400 mb-8">
                    Your payment for Seat #{selectedSeat} has been received. Have a great journey!
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleDownload}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={20} /> Download Ticket
                    </button>
                    <button onClick={resetFlow} className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-bold transition-all">
                        Book Another Trip
                    </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 mt-8 items-start">
            <div className="order-2 md:order-1">
              <button onClick={() => setSelectedSchedule(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to schedules
              </button>
              <SeatMap 
                capacity={selectedSchedule.bus_details.capacity} 
                selectedSeat={selectedSeat} 
                onSelectSeat={setSelectedSeat} 
                bookedSeats={selectedSchedule.booked_seats}
              />
            </div>

            <div className="order-1 md:order-2 bg-slate-900 p-8 rounded-3xl border border-slate-800 self-start sticky top-28 shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-purple-400">Checkout</h2>
              <div className="space-y-3 mb-6 p-5 bg-slate-950/50 rounded-2xl text-sm border border-slate-800">
                <p className="flex justify-between"><span className="text-slate-500">Route</span> <span className="text-white font-bold">{selectedSchedule.route_details.origin} → {selectedSchedule.route_details.destination}</span></p>
                <p className="flex justify-between"><span className="text-slate-500">Price</span> <span className="text-green-400 font-bold text-lg">KES {selectedSchedule.price}</span></p>
                <p className="flex justify-between items-center"><span className="text-slate-500">Seat Number</span> <span className={`px-3 py-1 rounded-lg font-black ${selectedSeat ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-pink-500 animate-pulse'}`}>{selectedSeat || 'Select a seat'}</span></p>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <input required value={passengerName} onChange={(e) => setPassengerName(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-all placeholder:text-slate-600" placeholder="Full Name" />
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="tel" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:border-purple-500 transition-all placeholder:text-slate-600" placeholder="0712345678" />
                </div>
                <button disabled={loading || !selectedSeat} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-500/20 mt-4">
                  {loading ? "Processing..." : `Pay KES ${selectedSchedule.price}`}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}