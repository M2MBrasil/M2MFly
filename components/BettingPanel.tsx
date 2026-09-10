'use client';

import React, { useState } from 'react';
import { GameState, Bet } from '@/types/game';
import { Send, CheckCircle2, RotateCcw, Zap, Sparkles } from 'lucide-react';

interface BettingPanelProps {
  panelIndex: 1 | 2;
  title?: string;
  balance: number;
  gameState: GameState;
  currentMultiplier: number;
  currentBet: Bet | null;
  onPlaceBet: (panelIndex: 1 | 2, amount: number, autoCashout: number) => void;
  onCancelBet: (panelIndex: 1 | 2) => void;
  onCashout: (panelIndex: 1 | 2) => void;
  onQueueNextBet: (panelIndex: 1 | 2, amount: number, autoCashout: number) => void;
  isNextBetQueued: boolean;
  onCancelQueuedBet: (panelIndex: 1 | 2) => void;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  panelIndex,
  title = 'PAINEL DE APOSTA',
  balance,
  gameState,
  currentMultiplier,
  currentBet,
  onPlaceBet,
  onCancelBet,
  onCashout,
  onQueueNextBet,
  isNextBetQueued,
  onCancelQueuedBet,
}) => {
  // Amount state
  const [amount, setAmount] = useState<number>(10);
  
  // Explicit Requirement: "o limitador de multiplicagem tem que iniciar no zero para o jogador escolher a auta retirada"
  // Starts strictly at 0!
  const [autoCashout, setAutoCashout] = useState<number>(0);
  const [isAutoCashoutEnabled, setIsAutoCashoutEnabled] = useState<boolean>(false);

  // Quick bet chips
  const quickAmounts = [5, 10, 20, 50, 100];

  const handleAmountChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.max(1, Math.min(balance > 0 ? balance : 10000, Math.floor(val)));
    setAmount(clamped);
  };

  const handleAutoCashoutChange = (val: number) => {
    if (isNaN(val)) {
      setAutoCashout(0);
      setIsAutoCashoutEnabled(false);
      return;
    }
    const clamped = Math.max(0, parseFloat(val.toFixed(2)));
    setAutoCashout(clamped);
    setIsAutoCashoutEnabled(clamped > 1.0);
  };

  // Determine button state and action
  const hasActiveBetInFlight = Boolean(currentBet && currentBet.status === 'ACTIVE' && gameState === 'FLYING');
  const hasPlacedBetInWaiting = Boolean(currentBet && (currentBet.status === 'PENDING' || currentBet.status === 'ACTIVE') && (gameState === 'WAITING' || gameState === 'STARTING'));
  const hasCashedOutThisRound = Boolean(currentBet && currentBet.status === 'CASHED_OUT');

  // Live calculation of current payout
  const liveCashoutVal = hasActiveBetInFlight && currentBet ? currentBet.amount * currentMultiplier : 0;

  const handleUnifiedButtonClick = () => {
    // 1. If currently flying and user has active bet -> CASHOUT!
    if (hasActiveBetInFlight) {
      onCashout(panelIndex);
      return;
    }

    // 2. If waiting and user already placed bet -> CANCEL BET
    if (hasPlacedBetInWaiting) {
      onCancelBet(panelIndex);
      return;
    }

    // 3. If flying or crashed and user hasn't bet -> Queue bet for next round
    if (gameState === 'FLYING' || gameState === 'CRASHED') {
      if (isNextBetQueued) {
        onCancelQueuedBet(panelIndex);
      } else {
        const effectiveAuto = isAutoCashoutEnabled && autoCashout > 1.0 ? autoCashout : 0;
        onQueueNextBet(panelIndex, amount, effectiveAuto);
      }
      return;
    }

    // 4. If in waiting phase -> PLACE BET
    if (gameState === 'WAITING' || gameState === 'STARTING') {
      const effectiveAuto = isAutoCashoutEnabled && autoCashout > 1.0 ? autoCashout : 0;
      onPlaceBet(panelIndex, amount, effectiveAuto);
    }
  };

  return (
    <div
      id={`betting-panel-${panelIndex}`}
      className="bg-slate-950/85 backdrop-blur-md rounded-2xl p-4 border border-blue-900/40 shadow-[0_4px_25px_rgba(3,10,24,0.7)] flex flex-col gap-3.5 relative overflow-hidden"
    >
      {/* Top subtle blue highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-700 via-cyan-400 to-blue-700" />

      {/* Header with Panel Name & Auto status */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {title}
        </span>
        {hasCashedOutThisRound && (
          <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Ganhou R$ {(currentBet?.payout ?? 0).toFixed(2)} (+{((currentBet?.cashedOutAt ?? 1)).toFixed(2)}x)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Left Column: Aposta Input & Chips */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-blue-300/80 font-medium flex justify-between">
            <span>Valor da Aposta (R$)</span>
            <span className="text-slate-400">Min: 1 • Saldo: R$ {balance.toFixed(2)}</span>
          </label>

          <div className="relative flex items-center">
            <span className="absolute left-3 text-cyan-400 font-bold text-sm">R$</span>
            <input
              id={`bet-amount-input-${panelIndex}`}
              type="number"
              min={1}
              max={balance}
              step={1}
              disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
              value={amount}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
              className="w-full pl-9 pr-24 py-2.5 rounded-xl bg-slate-900/90 border border-blue-900/50 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 disabled:opacity-60 transition"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
                onClick={() => handleAmountChange(Math.max(1, Math.floor(amount / 2)))}
                className="px-2 py-1 text-xs font-semibold rounded bg-blue-950/80 hover:bg-blue-900 text-cyan-300 border border-blue-800/40 disabled:opacity-40 transition cursor-pointer"
              >
                ½
              </button>
              <button
                type="button"
                disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
                onClick={() => handleAmountChange(amount * 2)}
                className="px-2 py-1 text-xs font-semibold rounded bg-blue-950/80 hover:bg-blue-900 text-cyan-300 border border-blue-800/40 disabled:opacity-40 transition cursor-pointer"
              >
                2x
              </button>
            </div>
          </div>

          {/* Quick chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
                onClick={() => handleAmountChange(q)}
                className={`px-2.5 py-1 text-xs rounded-lg font-mono font-medium transition cursor-pointer border ${
                  amount === q
                    ? 'bg-blue-600 border-cyan-400 text-white font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/70 hover:bg-blue-950 border-blue-900/40 text-blue-300 disabled:opacity-40'
                }`}
              >
                {q}
              </button>
            ))}
            <button
              type="button"
              disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
              onClick={() => handleAmountChange(Math.floor(balance))}
              className="px-2.5 py-1 text-xs rounded-lg font-mono font-medium bg-slate-900/70 hover:bg-blue-950 border border-blue-900/40 text-cyan-300 disabled:opacity-40 cursor-pointer"
            >
              Máx
            </button>
          </div>
        </div>

        {/* Right Column: Auto Retirada (Starts at 0 as explicitly specified) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <label className="text-blue-300/80 font-medium flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Auto Retirada (Multiplicador)</span>
            </label>
            <span className="text-[11px] font-mono font-semibold text-cyan-400">
              {autoCashout > 1.0 ? `${autoCashout.toFixed(2)}x (Ativo)` : 'Inicia em 0 (Desativado)'}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              id={`auto-cashout-input-${panelIndex}`}
              type="number"
              min={0}
              step={0.1}
              disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
              value={autoCashout}
              onChange={(e) => handleAutoCashoutChange(parseFloat(e.target.value))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-blue-900/50 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 disabled:opacity-60 transition"
            />
            <span className="absolute right-3 text-cyan-400 font-bold font-mono text-sm">
              x
            </span>
          </div>

          {/* Quick presets for Auto Cashout (Starts with 0 - Desativado) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
              onClick={() => handleAutoCashoutChange(0)}
              title="Iniciar em zero desativa a auto retirada"
              className={`px-2 py-1 text-xs rounded-lg font-mono transition cursor-pointer border ${
                autoCashout === 0
                  ? 'bg-blue-600 border-cyan-400 text-white font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900/70 hover:bg-blue-950 border-blue-900/40 text-slate-400 disabled:opacity-40'
              }`}
            >
              0 (Off)
            </button>
            {[1.5, 2.0, 3.0, 5.0, 10.0].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={hasPlacedBetInWaiting || hasActiveBetInFlight}
                onClick={() => handleAutoCashoutChange(preset)}
                className={`px-2 py-1 text-xs rounded-lg font-mono font-medium transition cursor-pointer border ${
                  autoCashout === preset
                    ? 'bg-blue-600 border-cyan-400 text-white font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/70 hover:bg-blue-950 border-blue-900/40 text-blue-300 disabled:opacity-40'
                }`}
              >
                {preset.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* UNIFIED BUTTON: O botão que aposta, também se transforma em retirada! */}
      <div className="mt-1">
        {hasActiveBetInFlight ? (
          /* ACTIVE FLIGHT WITH BET -> TRANSFORMED INTO RETIRAR BUTTON! */
          <button
            id={`btn-cashout-${panelIndex}`}
            type="button"
            onClick={handleUnifiedButtonClick}
            className="w-full py-4 px-6 rounded-xl font-black text-lg tracking-wide uppercase cursor-pointer transition-all duration-150 transform active:scale-[0.98] shadow-[0_0_30px_rgba(14,165,233,0.6)] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 text-white flex flex-col items-center justify-center border border-cyan-300/80 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-white fill-white animate-bounce" />
              <span>RETIRAR</span>
            </div>
            <span className="text-sm font-mono font-bold tracking-normal opacity-95">
              R$ {liveCashoutVal.toFixed(2)} ({currentMultiplier.toFixed(2)}x)
            </span>
          </button>
        ) : hasPlacedBetInWaiting ? (
          /* BET PLACED DURING WAITING -> CANCEL OR CONFIRMED */
          <button
            id={`btn-cancel-bet-${panelIndex}`}
            type="button"
            onClick={handleUnifiedButtonClick}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-base tracking-wide uppercase cursor-pointer transition-all bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:to-red-800 text-red-200 border border-red-700/50 shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>CANCELAR APOSTA (R$ {amount.toFixed(2)})</span>
          </button>
        ) : isNextBetQueued ? (
          /* BET QUEUED FOR NEXT ROUND */
          <button
            id={`btn-cancel-queued-${panelIndex}`}
            type="button"
            onClick={handleUnifiedButtonClick}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-base tracking-wide uppercase cursor-pointer transition-all bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>APOSTA AGENDADA (R$ {amount.toFixed(2)}) - CANCELAR</span>
          </button>
        ) : gameState === 'FLYING' || gameState === 'CRASHED' ? (
          /* CURRENTLY FLYING OR CRASHED (NO CURRENT BET) -> BET FOR NEXT ROUND */
          <button
            id={`btn-queue-bet-${panelIndex}`}
            type="button"
            onClick={handleUnifiedButtonClick}
            className="w-full py-3.5 px-6 rounded-xl font-extrabold text-base tracking-wide uppercase cursor-pointer transition-all duration-150 transform active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.4)] bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white flex items-center justify-center gap-2 border border-blue-400/40"
          >
            <Send className="w-4 h-4" />
            <span>APOSTAR P/ PRÓXIMA (R$ {amount.toFixed(2)})</span>
          </button>
        ) : (
          /* WAITING / STARTING PHASE -> PLACE BET */
          <button
            id={`btn-place-bet-${panelIndex}`}
            type="button"
            onClick={handleUnifiedButtonClick}
            className="w-full py-3.5 px-6 rounded-xl font-black text-base tracking-wide uppercase cursor-pointer transition-all duration-150 transform active:scale-[0.98] shadow-[0_0_25px_rgba(37,99,235,0.5)] bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 text-white flex items-center justify-center gap-2.5 border border-cyan-400/50"
          >
            <Send className="w-5 h-5" />
            <span>APOSTAR (R$ {amount.toFixed(2)})</span>
          </button>
        )}
      </div>
    </div>
  );
};
