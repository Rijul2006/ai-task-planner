'use client';

import React, { useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { ChatMessage } from '../types';
import { ActionApprovalCard } from './ActionApprovalCard';

interface AIChatDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onApproveAction?: (id: string) => void;
  onRejectAction?: (id: string) => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  messages,
  onSendMessage,
  onApproveAction,
  onRejectAction,
}) => {
  const [inputMsg, setInputMsg] = useState('');

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    onSendMessage(inputMsg);
    setInputMsg('');
  };

  return (
    <aside className="w-96 border-l border-slate-800/80 bg-[#0c111d] flex flex-col h-full">
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-100">AI TPM Co-Pilot</h3>
            <p className="text-[10px] text-slate-400">Real-time Risk Orchestrator</p>
          </div>
        </div>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-xl border ${
              msg.sender === 'user'
                ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-100 ml-8'
                : 'bg-[#121826] border-slate-800 text-slate-300 mr-4'
            }`}
          >
            <p className="leading-relaxed whitespace-pre-wrap text-[11px]">{msg.text}</p>
            {msg.action && (
              <ActionApprovalCard
                action={msg.action}
                onApprove={onApproveAction}
                onReject={onRejectAction}
              />
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800/80 flex items-center gap-2 bg-[#090d16]">
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI TPM or type 'check risk'..."
          className="flex-1 bg-[#121826] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
        />
        <button
          onClick={handleSend}
          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};