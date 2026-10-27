import { request } from '../check-in/api-client';
import { CheckInError } from '../check-in/types';

export type VotacaoSituacao = {
  eventoId: number;
  hasCheckedIn: boolean;
  votesUsed: number;
  votesLimit: number;
  votesRemaining: number;
  votedResumoIds: number[];
  canVote: boolean;
};

export type VotoRegistro = {
  id: number;
  resumoId: number;
  resumoTitulo: string;
  eventoId: number;
  votedAt: string;
  votesUsed: number;
  votesRemaining: number;
  message: string;
};

export type ResumoQrCode = { resumoId: number; resumoTitulo: string; payload: string; imageData: string };

function situacaoValida(value: unknown): value is VotacaoSituacao {
  if (!value || typeof value !== 'object') return false;
  const s = value as VotacaoSituacao;
  return Number.isSafeInteger(s.eventoId) && typeof s.hasCheckedIn === 'boolean' && typeof s.canVote === 'boolean'
    && Number.isSafeInteger(s.votesUsed) && Number.isSafeInteger(s.votesLimit) && Number.isSafeInteger(s.votesRemaining)
    && s.votesUsed >= 0 && s.votesLimit > 0 && s.votesRemaining >= 0
    && Array.isArray(s.votedResumoIds) && s.votedResumoIds.every((id) => Number.isSafeInteger(id))
    && s.votedResumoIds.length === s.votesUsed;
}

export const httpVotacaoService = {
  async getSituacao(eventoId: number, token: string): Promise<VotacaoSituacao> {
    const situacao = await request<unknown>(token, `/evento/${eventoId}/votacao`);
    if (!situacaoValida(situacao) || situacao.eventoId !== eventoId) {
      throw new CheckInError('UNKNOWN', 'O servidor retornou dados de votação inválidos. Tente novamente.');
    }
    return situacao;
  },

  // Sem corpo: a identidade do votante vem somente da sessão (Authorization).
  async votar(resumoId: number, token: string): Promise<VotoRegistro> {
    const registro = await request<VotoRegistro>(token, `/resumos/${resumoId}/voto`, { method: 'POST' });
    if (!Number.isSafeInteger(registro.id) || registro.resumoId !== resumoId || !Number.isFinite(Date.parse(registro.votedAt))
      || !Number.isSafeInteger(registro.votesUsed) || !Number.isSafeInteger(registro.votesRemaining)) {
      throw new CheckInError('UNKNOWN', 'Não foi possível confirmar o voto. Atualize a tela antes de tentar novamente.');
    }
    return registro;
  },

  getQrCode(resumoId: number, token: string): Promise<ResumoQrCode> {
    return request<ResumoQrCode>(token, `/resumos/${resumoId}/qr-code`);
  },
};