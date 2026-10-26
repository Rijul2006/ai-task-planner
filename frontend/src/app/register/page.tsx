'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { displayName, email, password });
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#090d16] text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c111d] p-8 shadow-2xl">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
            <Bot className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">AI TPM Platform</h1>
        </div>

        <h2 className="mb-6 text-center text-xs font-semibold text-slate-400">Create account & launch workspace</h2>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-medium text-slate-400">Full Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-800 bg-[#121826] px-3.5 py-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              placeholder="Your Full Name"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-800 bg-[#121826] px-3.5 py-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-800 bg-[#121826] px-3.5 py-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" /> {loading ? 'Creating Account...' : 'Register & Launch Workspace'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-400 hover:underline">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}