import { describe, expect, it } from 'vitest';
import { Turn } from '../models/models';
import {
  calculateCuttersPer100,
  calculatePointsForBoarding,
  calculateRespectRate,
  countPeopleAhead,
  isTurnExpired,
  rankStopsByRespect,
} from './queue-rules';

const turn = (over: Partial<Turn> = {}): Turn => ({
  id: 't', stopId: 's1', number: 5, deviceId: 'd', status: 'waiting', ceded: false, createdAt: 0, ...over,
});

describe('queue-rules', () => {
  it('calcula el % de respeto y los colados por 100', () => {
    const events = [
      { stopId: 's1', at: 0, kind: 'respected' as const },
      { stopId: 's1', at: 0, kind: 'respected' as const },
      { stopId: 's1', at: 0, kind: 'respected' as const },
      { stopId: 's1', at: 0, kind: 'cutter' as const },
    ];
    expect(calculateRespectRate(events)).toBe(75);
    expect(calculateCuttersPer100(events)).toBe(25);
    expect(calculateRespectRate([])).toBeNull();
  });

  it('cuenta solo a quienes esperan antes en la misma agencia', () => {
    const all = [turn({ number: 1 }), turn({ number: 2, status: 'boarded' }), turn({ number: 3, stopId: 's2' }), turn()];
    expect(countPeopleAhead(all, turn())).toBe(1);
  });

  it('da doble puntaje al ceder y respeta el tope diario', () => {
    expect(calculatePointsForBoarding(turn(), 0)).toBe(10);
    expect(calculatePointsForBoarding(turn({ ceded: true }), 0)).toBe(20);
    expect(calculatePointsForBoarding(turn({ ceded: true }), 95)).toBe(5);
    expect(calculatePointsForBoarding(turn(), 100)).toBe(0);
  });

  it('vence el turno a los 45 minutos', () => {
    expect(isTurnExpired(turn(), 44 * 60_000)).toBe(false);
    expect(isTurnExpired(turn(), 46 * 60_000)).toBe(true);
  });

  it('ordena agencias por % de respeto', () => {
    const stops = [{ id: 'a', name: 'A', district: '' }, { id: 'b', name: 'B', district: '' }];
    const events = [
      { stopId: 'a', at: 0, kind: 'cutter' as const },
      { stopId: 'b', at: 0, kind: 'respected' as const },
    ];
    expect(rankStopsByRespect(stops, events).map((r) => r.stop.id)).toEqual(['b', 'a']);
  });
});
