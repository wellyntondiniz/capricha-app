import type { CheckInEvent } from './types';

export type CheckInProgress =
  | { tipo: 'concluido'; texto: string }
  | { tipo: 'progresso'; atual: number; total: number; texto: string }
  | { tipo: 'bloqueado'; texto: string };

export function checkInProgress(event: CheckInEvent | undefined, lectures: CheckInEvent[]) {
  const related = event ? lectures.filter(p => p.eventoId === event.id) : [];
  const done = related.filter(p => p.hasCheckedIn).length;
  const eventStatus: CheckInProgress = event?.hasCheckedIn
    ? { tipo: 'concluido', texto: 'Concluído!' }
    : { tipo: 'progresso', atual: 0, total: 1, texto: event ? 'Presença não confirmada' : 'Nenhum evento disponível' };
  const lectureStatus: CheckInProgress = related.length > 0 && done === related.length
    ? { tipo: 'concluido', texto: `${done} de ${related.length} palestras` }
    : { tipo: 'progresso', atual: done, total: related.length,
      texto: related.length ? `${done} de ${related.length} palestras` : 'Nenhuma palestra neste evento' };
  return { eventStatus, lectureStatus };
}
