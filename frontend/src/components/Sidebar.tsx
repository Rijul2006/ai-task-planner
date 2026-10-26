'use client';

import React from 'react';
import { Bot, Layers, LogOut } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: 'board' | 'ai';
  setActiveTab: (tab: 'board' | 'ai') => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0c111d] p-5 flex flex-col justify-between select-none">
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shadow-sm">
            <Bot className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-slate-100">AI TPM Engine</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Orchestrator v1.0</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          <button
            onClick={() => setActiveTab('board')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'board'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/80'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Board Workspace
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ai'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/80'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" /> AI Risk Agent
          </button>
        </nav>
      </div>

      <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="text-xs truncate">
            <p className="font-semibold text-slate-200 truncate">{user?.displayName || 'User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Authenticated'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-500 hover:text-rose-400 transition ml-2 shrink-0"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};