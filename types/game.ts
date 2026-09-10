export type GameState = 'WAITING' | 'STARTING' | 'FLYING' | 'CRASHED';

export interface ProvablyFairRound {
  roundId: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  hash: string;
  crashMultiplier: number;
  timestamp: number;
}

export interface Bet {
  id: string;
  panelIndex: 1 | 2;
  amount: number;
  autoCashout: number; // 0 means disabled/manual
  status: 'PENDING' | 'ACTIVE' | 'CASHED_OUT' | 'LOST';
  cashedOutAt?: number;
  payout?: number;
}

export interface LivePlayer {
  id: string;
  name: string;
  avatarColor: string;
  betAmount: number;
  autoCashout: number;
  targetCashout: number;
  cashedOut: boolean;
  cashedOutAt?: number;
  profit?: number;
}

export interface RoundHistoryItem {
  roundId: number;
  crashMultiplier: number;
  timestamp: number;
  provablyFair: ProvablyFairRound;
  playerBets?: {
    panelIndex: 1 | 2;
    betAmount: number;
    cashedOutAt?: number;
    profit?: number;
    status: 'CASHED_OUT' | 'LOST';
  }[];
}
