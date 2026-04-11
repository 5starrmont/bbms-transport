import { useState } from 'react';
import ScheduleList from '../components/ScheduleList';
import SeatMap from '../components/SeatMap';
import api from '../api';
import { PlaneTakeoff, MapPin, ArrowLeft, CheckCircle2, Phone, Search as SearchIcon } from 'lucide-react';

export default function CustomerHome() {
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search State
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSeat) return alert("Please select a seat first!");
    
    setLoading(true);
    try {
      const response = await api.post('bookings/', {
        schedule: selectedSchedule.id,
        passenger_name: passengerName,
        seat_number: selectedSeat,
        status: 'PENDING'
      });
      
      if (response.status === 201) {
        setIsBooked(true);
      }
    } catch (err) {
      console.error("Booking failed:", err.response?.data || err.message);
      alert("Booking failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setSelectedSchedule(null);
    setSelectedSeat(null);
    setIsBooked(false);
    setPassengerName('');
    setPhoneNumber('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans">
      <nav className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={resetFlow}>
          <PlaneTakeoff className="text-purple-500 w-8 h-8" />
          <span className="text-xl font-black tracking-tighter">BBMS TRANS</span>
        </div>
        <a href="/admin/login" className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
          Operator Login
        </a>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {!selectedSchedule ? (
          <>
            <section className="text-center my-12">
              <h1 className="text-5xl font-black mb-4 tracking-tight">Where to next?</h1>
              <p className="text-slate-400 text-lg">Book your bus tickets in seconds. No account needed.</p>
            </section>

            {/* Functional Search Bar */}
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-wrap md:flex-nowrap gap-4 items-center mb-12">
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
              <div className="bg-purple-600 p-3 rounded-2xl">
                <SearchIcon size={20} />
              </div>
            </div>

            <div className="flex justify-center">
              {/* Pass search terms as props to ScheduleList */}
              <ScheduleList 
                onSelectSchedule={setSelectedSchedule} 
                filterOrigin={searchOrigin}
                filterDestination={searchDestination}
              />
            </div>
          </>
        ) : isBooked ? (
          <div className="max-w-md mx-auto mt-20 bg-slate-900 border border-green-500/30 p-10 rounded-3xl text-center shadow-2xl">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-400 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-slate-400 mb-8">Safe travels, {passengerName}. Seat #{selectedSeat} is yours.</p>
            <button onClick={resetFlow} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold transition-all">
              Book Another Trip
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 mt-8 items-start">
            <div className="order-2 md:order-1">
              <button onClick={() => setSelectedSchedule(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to schedules
              </button>
              <SeatMap 
                capacity={selectedSchedule.bus_details.capacity} 
                selectedSeat={selectedSeat} 
                onSelectSeat={setSelectedSeat} 
                bookedSeats={selectedSchedule.booked_seats}
              />
            </div>

            <div className="order-1 md:order-2 bg-slate-900 p-8 rounded-3xl border border-slate-800 self-start sticky top-28">
              <h2 className="text-2xl font-bold mb-4 text-purple-400">Checkout</h2>
              <div className="space-y-2 mb-6 p-4 bg-slate-800/50 rounded-2xl text-sm border border-slate-700/50">
                <p className="flex justify-between">
                  <span className="text-slate-400">Route:</span> 
                  <span className="text-white font-bold">{selectedSchedule.route_details.origin} → {selectedSchedule.route_details.destination}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Price:</span> 
                  <span className="text-green-400 font-bold text-lg">KES {selectedSchedule.price}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Selected Seat:</span> 
                  <span className={`font-black ${selectedSeat ? 'text-purple-400' : 'text-pink-500'}`}>
                    {selectedSeat || 'Select a seat'}
                  </span>
                </p>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <input required value={passengerName} onChange={(e) => setPassengerName(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-all" placeholder="Full Name" />
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="tel" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:border-purple-500 transition-all" placeholder="0712345678" />
                </div>
                <button 
                  disabled={loading || !selectedSeat}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-500/20 mt-4"
                >
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