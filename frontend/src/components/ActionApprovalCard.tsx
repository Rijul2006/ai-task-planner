'use client';

import React from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import { ActionCard } from '../types';

interface ActionApprovalCardProps {
  action: ActionCard;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const ActionApprovalCard: React.FC<ActionApprovalCardProps> = ({ action, onApprove, onReject }) => {
  const isPending = action.status === 'pending_approval';

  return (
    <div className="mt-3 p-3 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2">
      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Human Gate Mutation ({action.toolName})
        </span>
        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-300">
          {action.status}
        </span>
      </div>

      <p className="text-[11px] text-slate-300 leading-snug">{action.reason}</p>

      {isPending ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onApprove?.(action.id)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition shadow-sm active:scale-95"
          >
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            onClick={() => onReject?.(action.id)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition active:scale-95"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      ) : (
        <div className="text-[10px] text-slate-500 italic pt-1">Decided state recorded in system audit log.</div>
      )}
    </div>
  );
};