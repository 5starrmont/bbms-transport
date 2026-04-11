import React from 'react';
import { Armchair, User } from 'lucide-react';

const SeatMap = ({ capacity, selectedSeat, onSelectSeat, bookedSeats = [] }) => {
  const seats = Array.from({ length: capacity }, (_, i) => i + 1);
  
  const rows = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }

  return (
    <div className="bg-slate-900 p-6 rounded-[3rem] border border-slate-800 shadow-2xl max-w-sm mx-auto">
      {/* Driver Area */}
      <div className="w-full h-16 bg-slate-800 rounded-t-[2.5rem] mb-8 border-b-4 border-slate-700 flex items-center justify-between px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent"></div>
        <div className="flex flex-col items-center z-10">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                <User size={16} className="text-slate-400" />
            </div>
            <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Driver</span>
        </div>
        <div className="w-12 h-1 bg-slate-600 rounded-full animate-pulse"></div>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 bg-slate-950/50 border-x border-slate-800/50 z-0"></div>

        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-between items-center relative z-10 px-2">
            {/* Left Side */}
            <div className="flex gap-2">
              {row.slice(0, 2).map((seat) => (
                <SeatButton 
                  key={seat} 
                  seat={seat} 
                  isSelected={selectedSeat === seat} 
                  isBooked={bookedSeats.includes(seat)}
                  onClick={() => onSelectSeat(seat)} 
                />
              ))}
            </div>

            <div className="w-12 flex justify-center text-[10px] text-slate-800 font-mono italic select-none">
                {rowIndex + 1}
            </div>

            {/* Right Side */}
            <div className="flex gap-2">
              {row.slice(2, 4).map((seat) => (
                <SeatButton 
                  key={seat} 
                  seat={seat} 
                  isSelected={selectedSeat === seat} 
                  isBooked={bookedSeats.includes(seat)}
                  onClick={() => onSelectSeat(seat)} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-800 rounded-full"></div> Available</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-600 rounded-full"></div> Selected</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-900/50 rounded-full border border-red-500/30"></div> Taken</div>
      </div>
    </div>
  );
};

const SeatButton = ({ seat, isSelected, isBooked, onClick }) => (
  <button
    disabled={isBooked}
    onClick={onClick}
    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 
      ${isBooked 
        ? 'bg-slate-950 text-slate-800 border border-red-900/20 cursor-not-allowed opacity-40' 
        : isSelected 
          ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] scale-110' 
          : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-slate-700/50'
      }`}
  >
    <Armchair size={18} />
    <span className="text-[9px] font-bold mt-1">{seat}</span>
  </button>
);

export default SeatMap;