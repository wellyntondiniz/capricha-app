import type { CheckInProgress } from '../check-in/check-in-progress';
import type { CheckInEvent } from '../check-in/types';
import type { ResumoConexoes } from './types';

export const META_CONEXOES = 3;

/**
 * Status do card "Conectar Pessoas" na Home, calculado só com dados reais:
 * conexões confirmadas no evento ativo (o mesmo usado na tela de conexões) e solicitações
 * recebidas que ainda aguardam a resposta do participante.
 */
export function conexoesProgress(
  estado: 'carregando' | 'pronto' | 'erro',
  evento: CheckInEvent | undefined,
  resumo: ResumoConexoes | null,
): CheckInProgress {
  if (estado === 'carregando') return { tipo: 'progresso', atual: 0, total: 0, texto: 'Consultando conexões...' };
  if (estado === 'erro' || !resumo) {
    return { tipo: 'progresso', atual: 0, total: 0, texto: 'Não foi possível consultar as conexões' };
  }
  if (!evento) return { tipo: 'progresso', atual: 0, total: META_CONEXOES, texto: 'Faça check-in para se conectar' };
  const feitas = resumo.conexoes.filter((c) => c.eventoId === evento.id).length;
  const pendentes = resumo.recebidas.filter((r) => r.eventoId === evento.id).length;
  const sufixo = pendentes ? ` · ${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}` : '';
  if (feitas >= META_CONEXOES) return { tipo: 'concluido', texto: `${feitas} conexões${sufixo}` };
  return { tipo: 'progresso', atual: feitas, total: META_CONEXOES, texto: `${feitas} de ${META_CONEXOES} conexões${sufixo}` };
}