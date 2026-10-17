import type { Evento } from '@/services/eventoService';

export type CheckInEvent = Omit<Evento, 'id' | 'nome' | 'descricao' | 'dataInicio' | 'dataTermino'> & {
  id: number;
  nome: string;
  descricao: string | null;
  dataInicio: string | null;
  dataTermino: string | null;
  status: 'available' | 'upcoming' | 'finished';
  canCheckIn: boolean;
  hasCheckedIn: boolean;
  checkedInAt: string | null;
  qrToken?: string;
};

export type CheckInRecord = {
  id: number;
  eventId: number;
  eventName: string;
  checkedInAt: string;
  message: string;
};

export type EventCheckInQr = { type: 'EVENT_CHECKIN'; eventId: number; token: string };
export type EventQrCode = { eventId: number; eventName: string; payload: string; imageData: string };

export type CheckInFailureCode =
  | 'ALREADY_CHECKED_IN' | 'CHECK_IN_NOT_AVAILABLE' | 'EVENT_NOT_FOUND'
  | 'INVALID_EVENT_TOKEN' | 'INVALID_QR' | 'AUTH_REQUIRED' | 'NETWORK_ERROR'
  | 'FORBIDDEN' | 'INVALID_REQUEST' | 'UNKNOWN';

export class CheckInError extends Error {
  constructor(public readonly code: CheckInFailureCode, message?: string, public readonly status?: number) {
    super(message ?? code);
    this.name = 'CheckInError';
  }
}
