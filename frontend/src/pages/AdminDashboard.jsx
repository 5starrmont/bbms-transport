import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Bus, TrendingUp } from 'lucide-react';
import axios from 'axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    activeBuses: 0,
    todayPassengers: 0,
    revenue: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get('http://localhost:8000/api/bookings/buses/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Dynamically set the bus count based on API response
        setStats(prev => ({ ...prev, activeBuses: res.data.length }));
      } catch (err) {
        console.error("Error fetching fleet data", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-6">Fleet Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400"><Bus /></div>
            <div>
              <p className="text-slate-400 text-sm">Active Buses</p>
              <h3 className="text-2xl font-bold">{stats.activeBuses}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-lg text-green-400"><Users /></div>
            <div>
              <p className="text-slate-400 text-sm">Today's Passengers</p>
              <h3 className="text-2xl font-bold">{stats.todayPassengers}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-lg text-purple-400"><TrendingUp /></div>
            <div>
              <p className="text-slate-400 text-sm">Revenue (KES)</p>
              <h3 className="text-2xl font-bold">{stats.revenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-12 text-slate-500">Live data connection established.</p>
    </div>
  );
}