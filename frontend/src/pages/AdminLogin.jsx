import React from 'react';
import { PlaneTakeoff, Lock } from 'lucide-react';

export default function AdminLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-purple-600 p-3 rounded-2xl mb-4">
            <PlaneTakeoff className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Operator Login</h1>
          <p className="text-slate-400 text-sm">Access the BBMS Management Suite</p>
        </div>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
            <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500" placeholder="admin_user" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input type="password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500" placeholder="••••••••" />
          </div>
          <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
            <Lock size={18} /> Sign In
          </button>
        </form>
      </div>
    </div>
  );
}