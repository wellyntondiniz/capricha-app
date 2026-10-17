import { request } from './api-client';
import { parseQrCode } from './parse-qr-code';
import { CheckInError, type CheckInEvent, type CheckInRecord, type EventQrCode } from './types';

function eventoValido(value: unknown): value is CheckInEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as CheckInEvent;
  const dataValida = (data: unknown) => data === null || (typeof data === 'string' && Number.isFinite(Date.parse(data)));
  return Number.isSafeInteger(e.id) && e.id > 0 && typeof e.nome === 'string'
    && ['available', 'upcoming', 'finished'].includes(e.status)
    && typeof e.canCheckIn === 'boolean' && typeof e.hasCheckedIn === 'boolean'
    && dataValida(e.dataInicio) && dataValida(e.dataTermino) && dataValida(e.checkedInAt)
    && (!e.hasCheckedIn || e.checkedInAt !== null);
}

function respostaInvalida(): never {
  throw new CheckInError('UNKNOWN', 'O servidor retornou dados de evento inválidos. Tente novamente.');
}

export const httpCheckInService = {
  async getEvents(token: string) {
    const events = await request<unknown>(token, '/evento/check-in');
    if (!Array.isArray(events) || !events.every(eventoValido)) respostaInvalida();
    return events as CheckInEvent[];
  },

  async getEventByQrCode(value: string, token: string) {
    const qr = parseQrCode(value);
    const event = await request<CheckInEvent>(token, `/evento/${qr.eventId}/check-in/validar`, {
      method: 'POST', body: JSON.stringify({ qrToken: qr.token }),
    });
    if (!eventoValido(event) || event.id !== qr.eventId) respostaInvalida();
    return { ...event, qrToken: qr.token };
  },

  async checkIn(eventId: number, qrToken: string, token: string) {
    const record = await request<CheckInRecord>(token, `/evento/${eventId}/check-in`, {
      method: 'POST', body: JSON.stringify({ qrToken }),
    });
    if (!Number.isSafeInteger(record.id) || record.eventId !== eventId || !Number.isFinite(Date.parse(record.checkedInAt))) {
      throw new CheckInError('UNKNOWN', 'Não foi possível confirmar o registro. Atualize os eventos antes de tentar novamente.');
    }
    return record;
  },

  getEventQrCode(eventId: number, token: string) {
    return request<EventQrCode>(token, `/evento/${eventId}/qr-code`);
  },
};
