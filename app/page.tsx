'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Bet, RoundHistoryItem, LivePlayer, ProvablyFairRound } from '@/types/game';
import { generateProvablyFairRound, generateRandomSeed } from '@/lib/provably-fair';
import { soundManager } from '@/lib/sound';
import { GameCanvas } from '@/components/GameCanvas';
import { TopHistoryBar } from '@/components/TopHistoryBar';
import { BettingPanel } from '@/components/BettingPanel';
import { LiveBetsList } from '@/components/LiveBetsList';
import { ProvablyFairModal } from '@/components/ProvablyFairModal';
import { RechargeModal } from '@/components/RechargeModal';
import { AdminModal } from '@/components/AdminModal';
import {
  Volume2,
  VolumeX,
  Wallet,
  ShieldCheck,
  PlusCircle,
  Activity,
  Timer,
  TrendingUp,
  Plane,
  RotateCcw,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

const INITIAL_BALANCE = 1000.0;
const WAITING_TIME = 4.0; // 4 seconds countdown before flight

export default function M2MFlyPage() {
  // Persistence & User State - deterministic SSR defaults to prevent hydration mismatch
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [clientSeed, setClientSeed] = useState<string>('m2m-pilot-lucky-seed');
  const [enableSecondPanel, setEnableSecondPanel] = useState<boolean>(false);

  // Game Engine State
  const [roundId, setRoundId] = useState<number>(4822);
  const [gameState, setGameState] = useState<GameState>('WAITING');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [waitingCountdown, setWaitingCountdown] = useState<number>(WAITING_TIME);
  const [flightDuration, setFlightDuration] = useState<number>(0);
  const [currentProvablyFair, setCurrentProvablyFair] = useState<ProvablyFairRound | null>(null);

  // Betting states for Panel 1 and Panel 2
  const [bet1, setBet1] = useState<Bet | null>(null);
  const [bet2, setBet2] = useState<Bet | null>(null);
  const [queuedBet1, setQueuedBet1] = useState<{ amount: number; autoCashout: number } | null>(null);
  const [queuedBet2, setQueuedBet2] = useState<{ amount: number; autoCashout: number } | null>(null);

  // History & Live Simulated Players - static timestamp to prevent SSR Date.now() mismatches
  const [history, setHistory] = useState<RoundHistoryItem[]>(() => [
    { roundId: 4821, crashMultiplier: 1.23, timestamp: 1720000000000, provablyFair: {} as any },
    { roundId: 4820, crashMultiplier: 4.56, timestamp: 1720000000000 - 60000, provablyFair: {} as any },
    { roundId: 4819, crashMultiplier: 1.08, timestamp: 1720000000000 - 120000, provablyFair: {} as any },
    { roundId: 4818, crashMultiplier: 12.34, timestamp: 1720000000000 - 180000, provablyFair: {} as any },
    { roundId: 4817, crashMultiplier: 2.17, timestamp: 1720000000000 - 240000, provablyFair: {} as any },
    { roundId: 4816, crashMultiplier: 1.51, timestamp: 1720000000000 - 300000, provablyFair: {} as any },
    { roundId: 4815, crashMultiplier: 8.92, timestamp: 1720000000000 - 360000, provablyFair: {} as any },
    { roundId: 4814, crashMultiplier: 1.06, timestamp: 1720000000000 - 420000, provablyFair: {} as any },
    { roundId: 4813, crashMultiplier: 23.41, timestamp: 1720000000000 - 480000, provablyFair: {} as any },
    { roundId: 4812, crashMultiplier: 1.33, timestamp: 1720000000000 - 540000, provablyFair: {} as any },
  ]);
  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
  const [selectedRoundForModal, setSelectedRoundForModal] = useState<ProvablyFairRound | null>(null);
  const [isPFModalOpen, setIsPFModalOpen] = useState<boolean>(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // Toast / notification
  const [winNotification, setWinNotification] = useState<{ message: string; amount: number } | null>(null);

  // Refs for requestAnimationFrame animation loop to guarantee absolute stability across renders
  const gameStateRef = useRef<GameState>(gameState);
  const currentProvablyFairRef = useRef<ProvablyFairRound | null>(currentProvablyFair);
  const bet1Ref = useRef<Bet | null>(bet1);
  const bet2Ref = useRef<Bet | null>(bet2);
  const balanceRef = useRef<number>(balance);
  const queuedBet1Ref = useRef<{ amount: number; autoCashout: number } | null>(queuedBet1);
  const queuedBet2Ref = useRef<{ amount: number; autoCashout: number } | null>(queuedBet2);
  const roundIdRef = useRef<number>(roundId);
  const clientSeedRef = useRef<string>(clientSeed);
  const currentMultiplierRef = useRef<number>(1.0);
  const flightStartTimeRef = useRef<number>(0);
  const settledRoundIdRef = useRef<number | null>(null);
  const isPreparingRoundRef = useRef<boolean>(false);

  // Synchronize refs safely in effect
  useEffect(() => {
    gameStateRef.current = gameState;
    currentProvablyFairRef.current = currentProvablyFair;
    bet1Ref.current = bet1;
    bet2Ref.current = bet2;
    balanceRef.current = balance;
    queuedBet1Ref.current = queuedBet1;
    queuedBet2Ref.current = queuedBet2;
    if (roundId > roundIdRef.current) {
      roundIdRef.current = roundId;
    }
    clientSeedRef.current = clientSeed;
  }, [gameState, currentProvablyFair, bet1, bet2, balance, queuedBet1, queuedBet2, roundId, clientSeed]);

  // Save balance
  const updateBalance = useCallback((newBal: number) => {
    setBalance(newBal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('m2mfly_balance', newBal.toFixed(2));
    }
  }, []);

  // Generate simulated co-pilots for live multiplayer feeling
  const generateSimulatedPlayers = useCallback(() => {
    const names = [
      'Lucas_Fly', 'Camila.S', 'Rodrigo_99', 'AnaClara', 'Gabriel_Ace',
      'Marcos_Jet', 'Juliana_M', 'Pedro_Sky', 'Bia_Pilot', 'Felipe_X'
    ];
    const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa'];
    const players: LivePlayer[] = names.slice(0, 7).map((name, i) => {
      // Random cashout target based on 97% RTP distribution
      const r = Math.random();
      const rawTarget = 0.97 / (1 - r);
      const targetCashout = Math.max(1.1, Math.floor(rawTarget * 10) / 10);
      return {
        id: `pilot-${i}`,
        name,
        avatarColor: colors[i % colors.length],
        betAmount: [10, 20, 50, 100, 25][i % 5],
        autoCashout: targetCashout,
        targetCashout,
        cashedOut: false,
      };
    });
    setLivePlayers(players);
  }, []);

  // Prepare next round with cryptographic Provably Fair
  const prepareNextRound = useCallback(async () => {
    if (isPreparingRoundRef.current) return;
    isPreparingRoundRef.current = true;

    try {
      const nextRoundId = roundIdRef.current + 1;
      roundIdRef.current = nextRoundId;
      setRoundId(nextRoundId);

      // Cryptographic calculation
      const pfData = await generateProvablyFairRound(nextRoundId, clientSeedRef.current, nextRoundId);
      currentProvablyFairRef.current = pfData;
      setCurrentProvablyFair(pfData);

      // Reset settled round marker so this new round can be settled when it crashes
      settledRoundIdRef.current = null;

      // Apply queued bets if any
      const q1 = queuedBet1Ref.current;
      if (q1 && balanceRef.current >= q1.amount) {
        updateBalance(balanceRef.current - q1.amount);
        const b1: Bet = {
          id: `bet-1-${nextRoundId}`,
          panelIndex: 1,
          amount: q1.amount,
          autoCashout: q1.autoCashout,
          status: 'PENDING',
        };
        bet1Ref.current = b1;
        setBet1(b1);
        queuedBet1Ref.current = null;
        setQueuedBet1(null);
      } else {
        bet1Ref.current = null;
        setBet1(null);
      }

      const q2 = queuedBet2Ref.current;
      if (q2 && balanceRef.current >= q2.amount) {
        updateBalance(balanceRef.current - q2.amount);
        const b2: Bet = {
          id: `bet-2-${nextRoundId}`,
          panelIndex: 2,
          amount: q2.amount,
          autoCashout: q2.autoCashout,
          status: 'PENDING',
        };
        bet2Ref.current = b2;
        setBet2(b2);
        queuedBet2Ref.current = null;
        setQueuedBet2(null);
      } else {
        bet2Ref.current = null;
        setBet2(null);
      }

      generateSimulatedPlayers();
      soundManager.stopEngine();
      currentMultiplierRef.current = 1.0;
      setCurrentMultiplier(1.0);
      setFlightDuration(0);
      flightStartTimeRef.current = 0;
      setWaitingCountdown(WAITING_TIME);
      gameStateRef.current = 'WAITING';
      setGameState('WAITING');
    } finally {
      isPreparingRoundRef.current = false;
    }
  }, [updateBalance, generateSimulatedPlayers]);

  // Initial load: hydrate client preferences and prepare initial round
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const savedBal = localStorage.getItem('m2mfly_balance');
        if (savedBal && !isNaN(parseFloat(savedBal))) {
          const parsed = parseFloat(savedBal);
          setBalance(parsed);
          balanceRef.current = parsed;
        }
        setIsMuted(soundManager.getIsMuted());
      }
      prepareNextRound();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cashout action handler
  const handleCashout = useCallback((panelIndex: 1 | 2) => {
    if (gameStateRef.current !== 'FLYING') return;

    const mult = currentMultiplierRef.current;
    const bet = panelIndex === 1 ? bet1Ref.current : bet2Ref.current;

    if (bet && bet.status === 'ACTIVE') {
      const payout = bet.amount * mult;

      soundManager.playCashout();

      const updatedBet: Bet = {
        ...bet,
        status: 'CASHED_OUT',
        cashedOutAt: mult,
        payout,
      };

      if (panelIndex === 1) {
        bet1Ref.current = updatedBet;
        setBet1(updatedBet);
      } else {
        bet2Ref.current = updatedBet;
        setBet2(updatedBet);
      }

      updateBalance(balanceRef.current + payout);

      setWinNotification({
        message: `Você retirou em ${mult.toFixed(2)}x!`,
        amount: payout,
      });
      setTimeout(() => setWinNotification(null), 3500);
    }
  }, [updateBalance]);

  // Handle placing a bet
  const handlePlaceBet = (panelIndex: 1 | 2, amount: number, autoCashout: number) => {
    if (balance <= 0 || balance < amount) {
      setIsRechargeModalOpen(true);
      return;
    }

    soundManager.playClick();
    updateBalance(balance - amount);

    const newBet: Bet = {
      id: `bet-${panelIndex}-${roundId}`,
      panelIndex,
      amount,
      autoCashout,
      status: 'PENDING',
    };

    if (panelIndex === 1) {
      setBet1(newBet);
    } else {
      setBet2(newBet);
    }
  };

  // Handle cancelling a bet during waiting
  const handleCancelBet = (panelIndex: 1 | 2) => {
    const targetBet = panelIndex === 1 ? bet1 : bet2;
    if (!targetBet || targetBet.status !== 'PENDING') return;

    soundManager.playClick();
    updateBalance(balance + targetBet.amount);

    if (panelIndex === 1) {
      setBet1(null);
    } else {
      setBet2(null);
    }
  };

  // Main Game Loop Engine
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const state = gameStateRef.current;
      const roundPf = currentProvablyFairRef.current;

      if (state === 'WAITING') {
        setWaitingCountdown((prev) => {
          const next = prev - dt;
          if (next <= 0) {
            // Start flight!
            gameStateRef.current = 'FLYING';
            setGameState('FLYING');
            flightStartTimeRef.current = performance.now();

            // Activate placed bets
            if (bet1Ref.current && bet1Ref.current.status === 'PENDING') {
              const activeBet1: Bet = { ...bet1Ref.current, status: 'ACTIVE' };
              bet1Ref.current = activeBet1;
              setBet1(activeBet1);
            }
            if (bet2Ref.current && bet2Ref.current.status === 'PENDING') {
              const activeBet2: Bet = { ...bet2Ref.current, status: 'ACTIVE' };
              bet2Ref.current = activeBet2;
              setBet2(activeBet2);
            }

            soundManager.startEngine(1.0);
            return 0;
          }
          return next;
        });
      } else if (state === 'FLYING') {
        if (flightStartTimeRef.current === 0) {
          flightStartTimeRef.current = time;
        }
        const elapsed = Math.max(0, (time - flightStartTimeRef.current) / 1000);
        setFlightDuration(elapsed);

        // Multiplier progression: tuned to be slightly faster and lively per user request
        // M(t) = 1.00 + 0.085 * t + 0.012 * t^2
        // t = 0s  -> 1.00x
        // t = 2s  -> 1.22x
        // t = 3s  -> 1.36x
        // t = 5s  -> 1.73x
        // t = 7s  -> 2.18x
        // t = 10s -> 3.05x
        // t = 15s -> 4.98x
        const rawMultiplier = 1.00 + 0.085 * elapsed + 0.012 * Math.pow(elapsed, 2);
        currentMultiplierRef.current = rawMultiplier;
        const crashTarget = roundPf?.crashMultiplier ?? 2.0;

        if (rawMultiplier >= crashTarget) {
          const currentRoundId = roundPf?.roundId;

          // Prevent duplicate crash execution for the same round
          if (currentRoundId !== undefined && settledRoundIdRef.current === currentRoundId) {
            return;
          }
          if (currentRoundId !== undefined) {
            settledRoundIdRef.current = currentRoundId;
          }

          // CRASH!
          gameStateRef.current = 'CRASHED';
          setGameState('CRASHED');
          currentMultiplierRef.current = crashTarget;
          setCurrentMultiplier(crashTarget);
          soundManager.playCrash();
          flightStartTimeRef.current = 0;

          // Settle bets: lost if still active
          const playerBetsSummary: any[] = [];
          if (bet1Ref.current) {
            if (bet1Ref.current.status === 'ACTIVE') {
              const lostBet: Bet = { ...bet1Ref.current, status: 'LOST' };
              bet1Ref.current = lostBet;
              setBet1(lostBet);
              playerBetsSummary.push({
                panelIndex: 1,
                betAmount: bet1Ref.current.amount,
                status: 'LOST',
              });
            } else if (bet1Ref.current.status === 'CASHED_OUT') {
              playerBetsSummary.push({
                panelIndex: 1,
                betAmount: bet1Ref.current.amount,
                cashedOutAt: bet1Ref.current.cashedOutAt,
                profit: (bet1Ref.current.payout ?? 0) - bet1Ref.current.amount,
                status: 'CASHED_OUT',
              });
            }
          }

          if (bet2Ref.current) {
            if (bet2Ref.current.status === 'ACTIVE') {
              const lostBet: Bet = { ...bet2Ref.current, status: 'LOST' };
              bet2Ref.current = lostBet;
              setBet2(lostBet);
              playerBetsSummary.push({
                panelIndex: 2,
                betAmount: bet2Ref.current.amount,
                status: 'LOST',
              });
            } else if (bet2Ref.current.status === 'CASHED_OUT') {
              playerBetsSummary.push({
                panelIndex: 2,
                betAmount: bet2Ref.current.amount,
                cashedOutAt: bet2Ref.current.cashedOutAt,
                profit: (bet2Ref.current.payout ?? 0) - bet2Ref.current.amount,
                status: 'CASHED_OUT',
              });
            }
          }

          // Record in history (with deduplication guard)
          if (roundPf) {
            setHistory((prev) => {
              if (prev.some((h) => h.roundId === roundPf.roundId)) {
                return prev;
              }
              return [
                {
                  roundId: roundPf.roundId,
                  crashMultiplier: crashTarget,
                  timestamp: Date.now(),
                  provablyFair: roundPf,
                  playerBets: playerBetsSummary,
                },
                ...prev.slice(0, 39),
              ];
            });
          }

          // Stay in CRASHED state for 3.0s, then prepare next round
          setTimeout(() => {
            prepareNextRound();
          }, 3000);

          // If virtual balance dropped to 0, open recharge modal after crash
          if (balanceRef.current <= 0) {
            setTimeout(() => {
              setIsRechargeModalOpen(true);
            }, 1200);
          }
        } else {
          // Keep flying
          setCurrentMultiplier(rawMultiplier);
          soundManager.updateEnginePitch(rawMultiplier);

          // Check Auto-Cashout for Bet 1
          const b1 = bet1Ref.current;
          if (b1 && b1.status === 'ACTIVE' && b1.autoCashout > 1.0 && rawMultiplier >= b1.autoCashout) {
            handleCashout(1);
          }

          // Check Auto-Cashout for Bet 2
          const b2 = bet2Ref.current;
          if (b2 && b2.status === 'ACTIVE' && b2.autoCashout > 1.0 && rawMultiplier >= b2.autoCashout) {
            handleCashout(2);
          }

          // Update simulated live players
          setLivePlayers((prev) =>
            prev.map((p) => {
              if (!p.cashedOut && rawMultiplier >= p.targetCashout) {
                return {
                  ...p,
                  cashedOut: true,
                  cashedOutAt: p.targetCashout,
                  profit: p.betAmount * p.targetCashout - p.betAmount,
                };
              }
              return p;
            })
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [handleCashout, prepareNextRound]);

  // Spacebar shortcut to cashout or bet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (gameState === 'FLYING') {
          if (bet1?.status === 'ACTIVE') handleCashout(1);
          if (bet2?.status === 'ACTIVE') handleCashout(2);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, bet1, bet2, handleCashout]);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleRechargeSuccess = (amount: number) => {
    const newBal = balance + amount;
    updateBalance(newBal);
    soundManager.playCashout();
    setWinNotification({
      message: `Recarga de R$ ${amount.toFixed(2)} liberada com sucesso!`,
      amount,
    });
    setTimeout(() => setWinNotification(null), 3500);
  };

  return (
    <main
      id="m2mfly-app"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-[#07132b] to-[#040914] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* HEADER BAR */}
      <header className="w-full border-b border-blue-900/40 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.5)] border border-cyan-300/40">
              <Plane className="w-5 h-5 text-white transform -rotate-45 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-2xl tracking-tight text-white drop-shadow">
                  M2M<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Fly</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-cyan-300">
                  Crash
                </span>
              </div>
              <p className="text-[10px] tracking-widest uppercase font-semibold text-cyan-400/80">
                Voe Mais Longe
              </p>
            </div>
          </div>

          {/* Right Header Controls: Saldo & Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Balance Badge */}
            <div
              id="wallet-balance-badge"
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-900/90 border shadow-inner transition-colors ${
                balance <= 0
                  ? 'border-amber-500/70 bg-amber-950/20'
                  : 'border-blue-900/60'
              }`}
            >
              <Wallet
                className={`w-4 h-4 shrink-0 ${
                  balance <= 0 ? 'text-amber-400' : 'text-cyan-400'
                }`}
              />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  Saldo Virtual
                </span>
                <span
                  suppressHydrationWarning
                  className={`font-mono font-black text-sm sm:text-base tracking-tight ${
                    balance <= 0 ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  R$ {balance.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setIsRechargeModalOpen(true)}
                id="btn-recharge-dialog"
                title="Recarregar Saldo com Código de 4 Dígitos"
                className={`ml-1 px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  balance <= 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-pulse'
                    : 'bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white border-blue-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recarregar</span>
              </button>
            </div>

            {/* Admin Panel Button - Exclusive for administrator to generate codes */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              id="btn-admin-dialog"
              title="Painel do Administrador (Gerador de Códigos de Recarga)"
              className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-slate-900 hover:from-blue-800 hover:to-cyan-900 border border-blue-600/60 text-cyan-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(30,58,138,0.3)]"
            >
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold hidden sm:inline">Admin</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              id="btn-sound-toggle"
              title={isMuted ? 'Ativar Som' : 'Desativar Som'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-blue-950 border border-blue-900/40 text-cyan-400 hover:text-white transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Provably Fair Info Button - Exclusively for Admin */}
            {isAdminAuthenticated && (
              <button
                onClick={() => {
                  setSelectedRoundForModal(currentProvablyFair);
                  setIsPFModalOpen(true);
                }}
                id="btn-provably-fair-dialog"
                title="Auditoria Provably Fair (Apenas Administrador)"
                className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-900/90 to-indigo-900/90 hover:from-blue-800 hover:to-indigo-800 border border-cyan-400/60 text-cyan-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold hidden sm:inline">Provably Fair</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* WIN NOTIFICATION POPUP */}
      {winNotification && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-200">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 border border-cyan-400/80 rounded-2xl px-6 py-3 shadow-[0_0_40px_rgba(6,182,212,0.6)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-300 flex items-center justify-center text-cyan-300 font-bold text-lg">
              ✓
            </div>
            <div>
              <p className="text-xs text-cyan-200 font-bold uppercase tracking-wider">
                {winNotification.message}
              </p>
              <p className="text-lg font-black font-mono text-white">
                +R$ {winNotification.amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN GAME CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        {/* Top Multiplier History Bar */}
        <TopHistoryBar
          history={history}
          onSelectRound={(item) => {
            if (isAdminAuthenticated) {
              setSelectedRoundForModal(item.provablyFair);
              setIsPFModalOpen(true);
            }
          }}
          onOpenProvablyFair={() => {
            if (isAdminAuthenticated) {
              setSelectedRoundForModal(currentProvablyFair);
              setIsPFModalOpen(true);
            }
          }}
          isAdmin={isAdminAuthenticated}
        />

        {/* Center Grid: Left Side History + Flight Radar & Betting Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Main Flight & Betting Section (3 cols on desktop, 1st on mobile): Radar Canvas + Quick Status + BETTING BUTTONS DIRECTLY BELOW! */}
          <div className="lg:col-span-3 order-1 lg:order-2 flex flex-col gap-3">
            {/* The Radar Flight Canvas */}
            <GameCanvas
              gameState={gameState}
              currentMultiplier={currentMultiplier}
              crashMultiplier={currentProvablyFair?.crashMultiplier ?? 1.0}
              waitingCountdown={waitingCountdown}
              maxWaitingCountdown={WAITING_TIME}
              flightDuration={flightDuration}
            />

            {/* Quick Status Bar Under Canvas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Status */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-blue-900/30 flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                  <span className="font-mono text-xs font-bold text-white truncate block">
                    {gameState === 'FLYING' ? (
                      <span className="text-cyan-400 animate-pulse">● EM VOO</span>
                    ) : gameState === 'CRASHED' ? (
                      <span className="text-red-400">■ CRASH</span>
                    ) : (
                      <span className="text-blue-300">⏳ AGUARDANDO</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Flight Time */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-blue-900/30 flex items-center gap-2.5">
                <Timer className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tempo de Voo</span>
                  <span className="font-mono text-xs font-bold text-white">
                    {flightDuration.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Multiplier */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-blue-900/30 flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Multiplicador</span>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {currentMultiplier.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* Nonce / Round */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-blue-900/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rodada</span>
                  <span className="font-mono text-xs font-bold text-white">
                    #{roundId}
                  </span>
                </div>
                <button
                  onClick={() => setEnableSecondPanel(!enableSecondPanel)}
                  className="px-2 py-1 rounded bg-blue-950 hover:bg-blue-900 text-cyan-300 border border-blue-800/40 text-[10px] font-semibold transition cursor-pointer"
                >
                  {enableSecondPanel ? '- Aposta 2' : '+ Aposta 2'}
                </button>
              </div>
            </div>

            {/* BOTÕES DE APOSTAR POSICIONADOS EXATAMENTE ABAIXO DA TELA DO VOO DO AVIÃO */}
            <div className={`grid grid-cols-1 ${enableSecondPanel ? 'md:grid-cols-2' : 'grid-cols-1'} gap-3 mt-0.5`}>
              {/* Main Bet Panel 1 */}
              <BettingPanel
                panelIndex={1}
                title="Aposta 1"
                balance={balance}
                gameState={gameState}
                currentMultiplier={currentMultiplier}
                currentBet={bet1}
                onPlaceBet={handlePlaceBet}
                onCancelBet={handleCancelBet}
                onCashout={handleCashout}
                onQueueNextBet={(idx, amt, auto) => {
                  if (balance <= 0 || balance < amt) {
                    setIsRechargeModalOpen(true);
                    return;
                  }
                  setQueuedBet1({ amount: amt, autoCashout: auto });
                }}
                isNextBetQueued={Boolean(queuedBet1)}
                onCancelQueuedBet={() => setQueuedBet1(null)}
              />

              {/* Optional Bet Panel 2 (just like standard Aviator) */}
              {enableSecondPanel && (
                <BettingPanel
                  panelIndex={2}
                  title="Aposta 2 (Simultânea)"
                  balance={balance}
                  gameState={gameState}
                  currentMultiplier={currentMultiplier}
                  currentBet={bet2}
                  onPlaceBet={handlePlaceBet}
                  onCancelBet={handleCancelBet}
                  onCashout={handleCashout}
                  onQueueNextBet={(idx, amt, auto) => {
                    if (balance <= 0 || balance < amt) {
                      setIsRechargeModalOpen(true);
                      return;
                    }
                    setQueuedBet2({ amount: amt, autoCashout: auto });
                  }}
                  isNextBetQueued={Boolean(queuedBet2)}
                  onCancelQueuedBet={() => setQueuedBet2(null)}
                />
              )}
            </div>
          </div>

          {/* Left Column on Desktop (order-2 on mobile): History & Live bets */}
          <div className="lg:col-span-1 order-2 lg:order-1 h-[460px] lg:h-[640px]">
            <LiveBetsList
              history={history}
              livePlayers={livePlayers}
              gameState={gameState}
              currentMultiplier={currentMultiplier}
              onSelectRound={(item) => {
                if (isAdminAuthenticated) {
                  setSelectedRoundForModal(item.provablyFair);
                  setIsPFModalOpen(true);
                }
              }}
              isAdmin={isAdminAuthenticated}
            />
          </div>
        </div>

        {/* FOOTER & INFO */}
        <footer className="mt-4 pt-4 border-t border-blue-900/30 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 pb-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">M2MFly</span>
            <span>•</span>
            <span>Jogo Demonstrativo • Apenas Créditos Virtuais</span>
            <span>•</span>
            <span className="text-cyan-500 font-mono">RTP Teórico: 97.0%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 italic">&ldquo;Disciplina faz você voar mais longe&rdquo;</span>
            {isAdminAuthenticated && (
              <button
                onClick={() => {
                  setSelectedRoundForModal(currentProvablyFair);
                  setIsPFModalOpen(true);
                }}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Verificar Sementes (Admin)
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* PROVABLY FAIR MODAL */}
      <ProvablyFairModal
        isOpen={isPFModalOpen}
        onClose={() => setIsPFModalOpen(false)}
        currentRound={selectedRoundForModal || currentProvablyFair}
        clientSeed={clientSeed}
        onUpdateClientSeed={(newSeed) => setClientSeed(newSeed)}
      />

      {/* CLIENT RECHARGE MODAL (4-DIGIT CODE FOR +R$ 500) */}
      <RechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        onRechargeSuccess={handleRechargeSuccess}
        currentBalance={balance}
      />

      {/* EXCLUSIVE ADMIN RECHARGE CODE GENERATOR SYSTEM */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onUpdateBalanceDirect={(newBal) => {
          updateBalance(newBal);
        }}
        onOpenProvablyFair={() => {
          setSelectedRoundForModal(currentProvablyFair);
          setIsPFModalOpen(true);
        }}
        onAdminAuthenticated={() => {
          setIsAdminAuthenticated(true);
        }}
        currentBalance={balance}
      />
    </main>
  );
}
