'use client';

import React from 'react';
import { Clock, User } from 'lucide-react';
import { Task } from '../types';

export const TaskCard: React.FC<{ task: Task; onClick?: () => void }> = ({ task, onClick }) => {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3.5 bg-[#121826] border border-slate-800 rounded-xl hover:border-slate-700 transition shadow-sm space-y-2.5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-slate-200 leading-snug">{task.title}</h4>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityStyle(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-400">
          <User className="w-3 h-3 text-slate-500" /> {task.assigneeName || 'Unassigned'}
        </span>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" /> {task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
};