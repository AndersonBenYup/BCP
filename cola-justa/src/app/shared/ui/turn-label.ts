import { Turn } from '../models/models';

/** Etiqueta visible del turno: los prioritarios se muestran como "P". */
export function formatTurnLabel(turn: Turn): string {
  return Number.isInteger(turn.number) ? `#${turn.number}` : 'P';
}
