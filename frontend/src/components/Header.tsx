'use client';

import React from 'react';
import { ShieldAlert, Plus } from 'lucide-react';

interface HeaderProps {
  boardName: string;
  riskCount: number;
  boards: { id: string; name: string; role: 'OWNER' | 'MEMBER' | 'VIEWER' }[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onOpenCreateModal: () => void;
  canCreateTasks: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  boardName,
  riskCount,
  boards,
  activeBoardId,
  onSelectBoard,
  onCreateBoard,
  onOpenCreateModal,
  canCreateTasks,
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-[#0c111d]/60 backdrop-blur">
      <div className="flex items-center gap-3">
        {boards.length > 1 ? (
          <select
            aria-label="Select workspace"
            value={activeBoardId}
            onChange={(event) => onSelectBoard(event.target.value)}
            className="max-w-64 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            {boards.map((board) => (
              <option key={board.id} value={board.id}>{board.name} ({board.role})</option>
            ))}
          </select>
        ) : (
          <h2 className="text-base font-bold text-slate-100 tracking-tight">{boardName || 'Sprint Board'}</h2>
        )}
        <button
          onClick={onCreateBoard}
          className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
        >
          + New Board
        </button>
      </div>

      <div className="flex items-center gap-3">
        {riskCount > 0 && (
          <span className="px-3 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> {riskCount} Risk Signals
          </span>
        )}
        {canCreateTasks && (
          <button
            onClick={onOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        )}
      </div>
    </header>
  );
};