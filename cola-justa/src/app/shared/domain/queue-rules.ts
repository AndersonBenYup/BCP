import { BoardingEvent, BusStop, Turn, Wallet } from '../models/models';

export const RULES = {
  pointsForRespectedTurn: 10,
  pointsForCededTurn: 20,
  dailyPointsCap: 100,
  turnTtlMinutes: 45,
  baselineCuttersPer100: 30,
  targetCuttersPer100: 15,
} as const;

/** % de atenciones que respetaron la cola. null si no hay datos. */
export function calculateRespectRate(events: BoardingEvent[]): number | null {
  if (events.length === 0) return null;
  const respected = events.filter((e) => e.kind === 'respected').length;
  return Math.round((respected / events.length) * 100);
}

/** Indicador del piloto: colados por cada 100 atenciones. */
export function calculateCuttersPer100(events: BoardingEvent[]): number | null {
  const rate = calculateRespectRate(events);
  return rate === null ? null : 100 - rate;
}

export function countPeopleAhead(turns: Turn[], turn: Turn): number {
  return turns.filter(
    (t) => t.stopId === turn.stopId && t.status === 'waiting' && t.number < turn.number,
  ).length;
}

export function isTurnExpired(turn: Turn, now: number): boolean {
  return turn.status === 'waiting' && now - turn.createdAt > RULES.turnTtlMinutes * 60_000;
}

export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sumPointsEarnedToday(wallet: Wallet | undefined, now: number): number {
  if (!wallet) return 0;
  const from = startOfDay(now);
  return wallet.history.filter((h) => h.at >= from && h.points > 0).reduce((s, h) => s + h.points, 0);
}

/** Puntos al ser atendido respetando el turno; doble si cedió su lugar. Respeta el tope diario. */
export function calculatePointsForBoarding(turn: Turn, pointsEarnedToday: number): number {
  const base = turn.ceded ? RULES.pointsForCededTurn : RULES.pointsForRespectedTurn;
  return Math.max(0, Math.min(base, RULES.dailyPointsCap - pointsEarnedToday));
}

export interface HourlyRate {
  hour: number;
  rate: number | null;
  total: number;
}

export function groupRespectRateByHour(events: BoardingEvent[], fromHour = 9, toHour = 18): HourlyRate[] {
  const result: HourlyRate[] = [];
  for (let hour = fromHour; hour <= toHour; hour++) {
    const inHour = events.filter((e) => new Date(e.at).getHours() === hour);
    result.push({ hour, rate: calculateRespectRate(inHour), total: inHour.length });
  }
  return result;
}

export interface StopRanking {
  stop: BusStop;
  rate: number | null;
  total: number;
}

export function rankStopsByRespect(stops: BusStop[], events: BoardingEvent[]): StopRanking[] {
  return stops
    .map((stop) => {
      const own = events.filter((e) => e.stopId === stop.id);
      return { stop, rate: calculateRespectRate(own), total: own.length };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

export function filterEventsOfToday(events: BoardingEvent[], now: number): BoardingEvent[] {
  const from = startOfDay(now);
  return events.filter((e) => e.at >= from);
}
