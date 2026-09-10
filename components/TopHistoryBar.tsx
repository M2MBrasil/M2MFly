'use client';

import React from 'react';
import { RoundHistoryItem } from '@/types/game';
import { ShieldCheck, History } from 'lucide-react';

interface TopHistoryBarProps {
  history: RoundHistoryItem[];
  onSelectRound?: (item: RoundHistoryItem) => void;
  onOpenProvablyFair?: () => void;
  isAdmin?: boolean;
}

export const TopHistoryBar: React.FC<TopHistoryBarProps> = ({
  history,
  onSelectRound,
  onOpenProvablyFair,
  isAdmin = false,
}) => {
  const getBadgeStyle = (multiplier: number) => {
    if (multiplier >= 10.0) {
      return 'bg-gradient-to-r from-blue-600/30 to-indigo-600/40 border-indigo-400/70 text-cyan-100 shadow-[0_0_12px_rgba(99,102,241,0.3)]';
    }
    if (multiplier >= 2.0) {
      return 'bg-blue-900/40 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]';
    }
    return 'bg-slate-900/80 border-blue-900/40 text-blue-300/90';
  };

  return (
    <div className="w-full flex items-center justify-between gap-2 overflow-hidden py-1.5 px-3 bg-slate-950/80 backdrop-blur-md rounded-xl border border-blue-900/30">
      <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium shrink-0">
        <History className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Histórico:</span>
      </div>

      {/* Horizontal pill list */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 mx-2">
        {history.length === 0 ? (
          <span className="text-xs text-slate-500 italic">Aguardando primeiras rodadas...</span>
        ) : (
          history.slice(0, 15).map((item, idx) => (
            <button
              key={`history-pill-${item.roundId}-${item.timestamp || idx}-${idx}`}
              id={`history-pill-${item.roundId}`}
              onClick={() => {
                if (isAdmin && onSelectRound) {
                  onSelectRound(item);
                }
              }}
              title={isAdmin ? `Rodada #${item.roundId} - Clique para auditoria Provably Fair` : `Rodada #${item.roundId} - Multiplicador ${item.crashMultiplier.toFixed(2)}x`}
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold transition-all border shrink-0 ${isAdmin ? 'hover:scale-105 cursor-pointer' : 'cursor-default'} ${getBadgeStyle(
                item.crashMultiplier
              )}`}
            >
              {item.crashMultiplier.toFixed(2)}x
            </button>
          ))
        )}
      </div>

      {/* Provably Fair only shown for Admin */}
      {isAdmin && onOpenProvablyFair && (
        <button
          id="btn-provably-fair-header"
          onClick={onOpenProvablyFair}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900/60 text-cyan-300 border border-blue-800/40 transition shrink-0 cursor-pointer hover:border-cyan-500/50"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Provably Fair</span>
        </button>
      )}
    </div>
  );
};
