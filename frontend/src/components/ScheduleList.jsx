import React, { useEffect, useState } from 'react';
import api from '../api';
import { Bus, MapPin, Clock, ArrowRight, Ban, Calendar, Users } from 'lucide-react';

const ScheduleList = ({ onSelectSchedule, filterOrigin = "", filterDestination = "" }) => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('schedules/')
            .then(res => {
                const data = res.data.results || res.data;
                setSchedules(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setLoading(false);
            });
    }, []);

    const filteredSchedules = schedules.filter(schedule => {
        if (!schedule) return false;

        // ✅ Only show SCHEDULED buses — hide departed, arrived, in transit
        const status = (schedule.status || '').toString().trim().toUpperCase();
        if (status !== 'SCHEDULED') return false;

        const origin = (schedule.origin_name || schedule.route_details?.origin || "").toLowerCase();
        const destination = (schedule.destination_name || schedule.route_details?.destination || "").toLowerCase();
        
        const termOrigin = (filterOrigin || "").toLowerCase();
        const termDest = (filterDestination || "").toLowerCase();

        return origin.includes(termOrigin) && destination.includes(termDest);
    });

    if (loading) return (
        <div className="flex flex-col items-center gap-4 py-10 w-full">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 animate-pulse">Fetching available trips...</p>
        </div>
    );

    if (filteredSchedules.length === 0) return (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800 w-full max-w-2xl mx-auto">
            <Ban className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No buses found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or check back later.</p>
        </div>
    );

    return (
        <div className="grid gap-4 w-full max-w-2xl mx-auto">
            {filteredSchedules.map(schedule => {
                // ✅ Calculate remaining seats
                const capacity = schedule?.bus_details?.capacity || 0;
                const bookedCount = Array.isArray(schedule?.booked_seats) ? schedule.booked_seats.length : 0;
                const remainingSeats = capacity - bookedCount;
                const isLowSeats = remainingSeats < 10;

                return (
                    <div 
                        key={schedule.id} 
                        onClick={() => onSelectSchedule(schedule)}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-purple-500 hover:bg-slate-800/50 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-500/10 p-2 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                    <Bus className="text-purple-400 w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">
                                        {schedule?.bus_details?.bus_number || "N/A"}
                                    </h3>
                                    {/* ✅ Remaining seats with red warning */}
                                    <div className="flex items-center gap-1.5">
                                        <Users className={`w-3 h-3 ${isLowSeats ? 'text-red-400' : 'text-slate-500'}`} />
                                        <p className={`text-xs font-bold uppercase tracking-widest ${isLowSeats ? 'text-red-400' : 'text-slate-500'}`}>
                                            {remainingSeats} seat{remainingSeats !== 1 ? 's' : ''} left
                                            {isLowSeats && ' — Filling up!'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-green-400">KES {schedule?.price}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-slate-300 flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                <span className="font-medium">{schedule.origin_name || schedule.route_details?.origin}</span>
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                                <span className="font-medium">{schedule.destination_name || schedule.route_details?.destination}</span>
                            </div>

                            {/* ✅ Date + Time */}
                            <div className="flex items-center gap-3">
                                {schedule?.departure_time && (
                                    <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-300">
                                            {new Date(schedule.departure_time).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                    <Clock className="w-3 h-3 text-purple-400" />
                                    <span className="text-xs font-bold">
                                        {schedule?.departure_time 
                                            ? new Date(schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                            : "--:--"
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ✅ Low seats warning bar */}
                        {isLowSeats && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                                <p className="text-red-400 text-xs font-bold uppercase tracking-widest">
                                    Only {remainingSeats} seat{remainingSeats !== 1 ? 's' : ''} remaining — Book now before it's full!
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ScheduleList;