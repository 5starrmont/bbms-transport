import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlaneTakeoff, Lock, Loader2 } from 'lucide-react';
import api from '../api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Nuke everything to ensure no old station_ids or roles remain
      localStorage.clear();

      // 2. Authenticate
      const res = await api.post('token/', { username, password });
      
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      
      // 3. Get Role from Profile
      const profileRes = await api.get('user/profile/', {
        headers: { Authorization: `Bearer ${res.data.access}` }
      });

      const { is_manager } = profileRes.data;

      // 4. Set UNIQUE role identifier and redirect
      if (is_manager) {
        localStorage.setItem('user_role', 'manager');
        navigate('/manager/dashboard');
      } else {
        localStorage.setItem('user_role', 'operator');
        // Legacy support for operator components
        localStorage.setItem('is_operator', 'true'); 
        navigate('/operator/dashboard');
      }

    } catch (err) {
      console.error("Login Error:", err);
      setError('Invalid credentials. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-purple-600 p-3 rounded-2xl mb-4">
            <PlaneTakeoff className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic tracking-tighter">Secure Access</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Management Suite</p>
        </div>
        
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Username</label>
            <input 
              required
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-bold" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Password</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-bold" 
            />
          </div>

          {error && (
            <p className="text-red-400 text-[10px] font-black text-center animate-pulse uppercase italic">
              {error}
            </p>
          )}

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest mt-2 shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Authenticate</>}
          </button>
        </form>
        
        <p className="text-center mt-6 text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Authorized Personnel Only</p>
      </div>
    </div>
  );
}