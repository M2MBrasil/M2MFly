'use client';

import React, { useState } from 'react';
import { RoundHistoryItem, LivePlayer, GameState } from '@/types/game';
import { History, Users, User, CheckCircle2 } from 'lucide-react';

interface LiveBetsListProps {
  history: RoundHistoryItem[];
  livePlayers: LivePlayer[];
  gameState: GameState;
  currentMultiplier: number;
  onSelectRound?: (item: RoundHistoryItem) => void;
  isAdmin?: boolean;
}

export const LiveBetsList: React.FC<LiveBetsListProps> = ({
  history,
  livePlayers,
  gameState,
  currentMultiplier,
  onSelectRound,
  isAdmin = false,
}) => {
  const [tab, setTab] = useState<'rounds' | 'live' | 'myBets'>('rounds');

  const getMultiplierColor = (mult: number) => {
    if (mult >= 10.0) return 'text-indigo-400 font-bold';
    if (mult >= 2.0) return 'text-cyan-400 font-semibold';
    return 'text-blue-300/80';
  };

  // Flatten player's personal bets from history
  const myPastBets = history.flatMap((h) =>
    (h.playerBets || []).map((pb) => ({
      roundId: h.roundId,
      betAmount: pb.betAmount,
      multiplier: pb.cashedOutAt ?? h.crashMultiplier,
      profit: pb.profit ?? -pb.betAmount,
      status: pb.status,
      timestamp: h.timestamp,
    }))
  );

  return (
    <div
      id="side-history-panel"
      className="bg-slate-950/85 backdrop-blur-md rounded-2xl border border-blue-900/40 p-3.5 shadow-[0_4px_25px_rgba(3,10,24,0.7)] flex flex-col h-full overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-blue-900/40 mb-3 text-xs">
        <button
          onClick={() => setTab('rounds')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
            tab === 'rounds'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3 h-3" />
          <span>Histórico</span>
        </button>
        <button
          onClick={() => setTab('live')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
            tab === 'live'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3 h-3" />
          <span>Ao Vivo ({livePlayers.length})</span>
        </button>
        <button
          onClick={() => setTab('myBets')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
            tab === 'myBets'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3 h-3" />
          <span>Minhas</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 text-xs">
        {tab === 'rounds' && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-blue-900/30 mb-1">
              <span>Nº Rodada</span>
              <span>Multiplicador</span>
            </div>
            {history.length === 0 ? (
              <div className="py-8 text-center text-slate-500 italic text-xs">
                Nenhuma rodada finalizada ainda
              </div>
            ) : (
              history.map((item, idx) => (
                <button
                  key={`round-list-${item.roundId}-${item.timestamp || idx}-${idx}`}
                  onClick={() => {
                    if (isAdmin && onSelectRound) {
                      onSelectRound(item);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-transparent transition ${
                    isAdmin ? 'hover:bg-blue-950/60 hover:border-blue-800/40 cursor-pointer group' : 'cursor-default'
                  }`}
                >
                  <span className="font-mono text-slate-400 group-hover:text-cyan-300">
                    #{item.roundId}
                  </span>
                  <span className={`font-mono text-sm ${getMultiplierColor(item.crashMultiplier)}`}>
                    {item.crashMultiplier.toFixed(2)}x
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {tab === 'live' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-blue-900/30">
              <span>Piloto</span>
              <span>Aposta / Retirada</span>
            </div>
            {livePlayers.map((player) => {
              const hasCashed = player.cashedOut;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition ${
                    hasCashed
                      ? 'bg-blue-950/50 border-cyan-500/30'
                      : 'bg-slate-900/50 border-blue-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: player.avatarColor }}
                    />
                    <span className="font-medium text-slate-300 truncate max-w-[100px]">
                      {player.name}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    {hasCashed ? (
                      <div className="flex items-center gap-1 text-cyan-300 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span>{player.cashedOutAt?.toFixed(2)}x</span>
                        <span className="text-[11px] text-emerald-400">
                          (+R$ {(player.profit ?? 0).toFixed(2)})
                        </span>
                      </div>
                    ) : gameState === 'FLYING' ? (
                      <span className="text-slate-400">R$ {player.betAmount.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-500">R$ {player.betAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'myBets' && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-blue-900/30 mb-1">
              <span>Rodada</span>
              <span>Resultado</span>
            </div>
            {myPastBets.length === 0 ? (
              <div className="py-8 text-center text-slate-500 italic text-xs">
                Você ainda não apostou em rodadas finalizadas
              </div>
            ) : (
              myPastBets.slice(0, 20).map((b, idx) => (
                <div
                  key={`my-bet-${idx}-${b.roundId}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/50 border border-blue-900/30 mb-1"
                >
                  <div>
                    <span className="font-mono text-slate-400 text-xs block">#{b.roundId}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Aposta: R$ {b.betAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    {b.status === 'CASHED_OUT' ? (
                      <div className="text-emerald-400 font-bold text-xs">
                        +{b.multiplier.toFixed(2)}x
                        <span className="block text-[10px] text-emerald-300 font-normal">
                          +R$ {b.profit.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-red-400 font-bold text-xs">
                        PERDEU
                        <span className="block text-[10px] text-red-300/70 font-normal">
                          -R$ {b.betAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
