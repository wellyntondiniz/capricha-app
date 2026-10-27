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
  resourceType?: CheckInType;
  eventoId?: number;
  palestrante?: string;
};

export type CheckInType = 'EVENT_CHECKIN' | 'LECTURE_CHECKIN';
export type CheckInContext = { type: CheckInType; id: number };

export type CheckInRecord = {
  id: number;
  eventId: number;
  eventName: string;
  checkedInAt: string;
  message: string;
};

export type EventCheckInQr = { type: 'EVENT_CHECKIN'; eventId: number; token: string };
export type LectureCheckInQr = { type: 'LECTURE_CHECKIN'; lectureId: number; token: string };
export type CheckInQr = EventCheckInQr | LectureCheckInQr;
export type EventQrCode = { eventId: number; eventName: string; payload: string; imageData: string };
export type LectureQrCode = { lectureId: number; lectureName: string; payload: string; imageData: string };
export type CheckInQrImage = EventQrCode | LectureQrCode;

export type CheckInFailureCode =
  | 'ALREADY_CHECKED_IN' | 'CHECK_IN_NOT_AVAILABLE' | 'EVENT_NOT_FOUND'
  | 'INVALID_EVENT_TOKEN' | 'INVALID_QR' | 'AUTH_REQUIRED' | 'NETWORK_ERROR'
  | 'FORBIDDEN' | 'INVALID_REQUEST' | 'UNKNOWN' | 'LECTURE_NOT_FOUND' | 'INVALID_LECTURE_TOKEN' | 'QR_CONTEXT_MISMATCH'
  | 'ALREADY_VOTED' | 'VOTE_LIMIT_REACHED' | 'NOT_CHECKED_IN' | 'RESUMO_NOT_FOUND' | 'EVENT_NOT_ACTIVE';

export class CheckInError extends Error {
  constructor(public readonly code: CheckInFailureCode, message?: string, public readonly status?: number) {
    super(message ?? code);
    this.name = 'CheckInError';
  }
}