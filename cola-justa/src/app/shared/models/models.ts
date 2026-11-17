export interface BusStop {
  id: string;
  name: string;
  district: string;
}

export type TurnStatus = 'waiting' | 'boarded' | 'expired';

export interface Turn {
  id: string;
  stopId: string;
  number: number;
  deviceId: string;
  status: TurnStatus;
  ceded: boolean;
  createdAt: number;
  boardedAt?: number;
  pointsAwarded?: number;
}

export type BoardingKind = 'respected' | 'cutter';

export interface BoardingEvent {
  stopId: string;
  at: number;
  kind: BoardingKind;
}

export interface WalletEntry {
  at: number;
  points: number;
  concept: string;
}

export interface Wallet {
  deviceId: string;
  points: number;
  history: WalletEntry[];
}

export interface Reward {
  id: string;
  title: string;
  partner: string;
  cost: number;
}

export interface AppState {
  version: 1;
  stops: BusStop[];
  turns: Turn[];
  events: BoardingEvent[];
  wallets: Record<string, Wallet>;
  counters: Record<string, number>;
}
