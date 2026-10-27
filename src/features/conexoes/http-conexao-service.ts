import { request } from '../check-in/api-client';
import { CheckInError } from '../check-in/types';
import { lerQrConexao } from './parse-connection-qr';
import type { MeuQrConexao, PerfilConexao, ResultadoConexao, ResumoConexoes, SolicitacaoConexao } from './types';

const RELACOES = ['NONE', 'PENDING_SENT', 'PENDING_RECEIVED', 'CONNECTED'];

function invalida(): never {
  throw new CheckInError('UNKNOWN', 'O servidor retornou dados de conexão inválidos. Tente novamente.');
}

const post = (token: string, path: string, body?: unknown) =>
  request<unknown>(token, path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const httpConexaoService = {
  async getMeuQr(token: string): Promise<MeuQrConexao> {
    const qr = await request<MeuQrConexao>(token, '/conexoes/meu-qr');
    if (typeof qr.payload !== 'string' || typeof qr.imageData !== 'string') invalida();
    return qr;
  },

  async getResumo(token: string): Promise<ResumoConexoes> {
    const dados = await request<ResumoConexoes>(token, '/conexoes');
    if (!Array.isArray(dados.recebidas) || !Array.isArray(dados.enviadas) || !Array.isArray(dados.conexoes)) invalida();
    return dados;
  },

  /** Valida o QR no aparelho e pede ao servidor o perfil do dono dele neste evento. */
  async identificar(valorQr: string, eventoId: number, token: string): Promise<{ perfil: PerfilConexao; qrToken: string }> {
    const qrToken = lerQrConexao(valorQr);
    const perfil = await post(token, '/conexoes/identificar', { qrToken, eventoId }) as PerfilConexao;
    if (typeof perfil?.nome !== 'string' || !RELACOES.includes(perfil.relacao)) invalida();
    return { perfil, qrToken };
  },

  async solicitar(qrToken: string, eventoId: number, token: string): Promise<SolicitacaoConexao> {
    const s = await post(token, '/conexoes/solicitacoes', { qrToken, eventoId }) as SolicitacaoConexao;
    if (!Number.isSafeInteger(s?.id)) invalida();
    return s;
  },

  async aceitar(id: number, token: string): Promise<ResultadoConexao> {
    const r = await post(token, `/conexoes/solicitacoes/${id}/aceitar`) as ResultadoConexao;
    if (r?.status !== 'ACEITA' || !Number.isFinite(r.xp)) invalida();
    return r;
  },

  async recusar(id: number, token: string): Promise<ResultadoConexao> {
    const r = await post(token, `/conexoes/solicitacoes/${id}/recusar`) as ResultadoConexao;
    if (r?.status !== 'RECUSADA') invalida();
    return r;
  },
};