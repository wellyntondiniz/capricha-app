import { request } from './api-client';
import { parseQrCode, validateQrContext } from './parse-qr-code';
import { CheckInError, type CheckInEvent, type CheckInRecord, type EventQrCode, type LectureQrCode, type CheckInContext } from './types';

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
    if (qr.type !== 'EVENT_CHECKIN') throw new CheckInError('INVALID_QR', 'QR Code de evento esperado.');
    const event = await request<CheckInEvent>(token, `/evento/${qr.eventId}/check-in/validar`, {
      method: 'POST', body: JSON.stringify({ qrToken: qr.token }),
    });
    if (!eventoValido(event) || event.id !== qr.eventId) respostaInvalida();
    return { ...event, qrToken: qr.token };
  },

  async getLectures(token: string) {
    const lectures = await request<unknown>(token, '/palestras/check-in');
    if (!Array.isArray(lectures) || !lectures.every(eventoValido)) respostaInvalida();
    return (lectures as CheckInEvent[]).map(p => ({ ...p, resourceType: 'LECTURE_CHECKIN' as const }));
  },

  async getResourceByQrCode(value: string, token: string, context?: CheckInContext): Promise<CheckInEvent> {
    const qr = parseQrCode(value);
    validateQrContext(qr, context);
    if (qr.type === 'EVENT_CHECKIN') {
      return { ...await this.getEventByQrCode(value, token), resourceType: 'EVENT_CHECKIN' };
    }
    const lecture = await request<CheckInEvent>(token, `/palestras/${qr.lectureId}/check-in/validar`, {
      method: 'POST', body: JSON.stringify({ type: qr.type, lectureId: qr.lectureId, qrToken: qr.token }),
    });
    if (!eventoValido(lecture) || lecture.id !== qr.lectureId) respostaInvalida();
    return { ...lecture, resourceType: 'LECTURE_CHECKIN', qrToken: qr.token };
  },

  async checkInResource(resource: CheckInEvent, token: string) {
    if (!resource.qrToken) throw new CheckInError('INVALID_QR', 'Escaneie o QR Code antes de confirmar.');
    if (resource.resourceType !== 'LECTURE_CHECKIN') return this.checkIn(resource.id, resource.qrToken, token);
    const record = await request<{ id: number; lectureId: number; lectureName: string; checkedInAt: string; message: string }>(
      token, `/palestras/${resource.id}/check-in`, {
        method: 'POST', body: JSON.stringify({ type: 'LECTURE_CHECKIN', lectureId: resource.id, qrToken: resource.qrToken }),
      });
    if (!Number.isSafeInteger(record.id) || record.lectureId !== resource.id || !Number.isFinite(Date.parse(record.checkedInAt))) {
      throw new CheckInError('UNKNOWN', 'Não foi possível confirmar a presença. Atualize a lista antes de tentar novamente.');
    }
    return record;
  },

  getResourceQrCode(resource: CheckInEvent, token: string): Promise<EventQrCode | LectureQrCode> {
    return resource.resourceType === 'LECTURE_CHECKIN'
      ? request<LectureQrCode>(token, `/palestras/${resource.id}/qr-code`)
      : this.getEventQrCode(resource.id, token);
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
