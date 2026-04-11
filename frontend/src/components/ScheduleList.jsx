import React, { useEffect, useState } from 'react';
import api from '../api';
import { Bus, MapPin, Clock, ArrowRight, Ban } from 'lucide-react';

const ScheduleList = ({ onSelectSchedule, filterOrigin, filterDestination }) => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('schedules/')
            .then(res => {
                setSchedules(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Filter logic: Check if origin and destination match the search terms
    const filteredSchedules = schedules.filter(schedule => {
        const matchesOrigin = schedule.route_details.origin
            .toLowerCase()
            .includes(filterOrigin.toLowerCase());
        const matchesDestination = schedule.route_details.destination
            .toLowerCase()
            .includes(filterDestination.toLowerCase());
        
        return matchesOrigin && matchesDestination;
    });

    if (loading) return (
        <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 animate-pulse">Fetching available trips...</p>
        </div>
    );

    if (filteredSchedules.length === 0) return (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800 w-full max-w-2xl">
            <Ban className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No buses found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or check back later.</p>
        </div>
    );

    return (
        <div className="grid gap-4 w-full max-w-2xl">
            {filteredSchedules.map(schedule => (
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
                                    {schedule.bus_details.bus_number}
                                </h3>
                                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                                    {schedule.bus_details.capacity} Seats Available
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-green-400">KES {schedule.price}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span className="font-medium">{schedule.route_details.origin}</span>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className="font-medium">{schedule.route_details.destination}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span className="text-xs font-bold">
                                {new Date(schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ScheduleList;