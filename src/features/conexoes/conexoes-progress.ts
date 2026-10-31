import type { CheckInProgress } from '../check-in/check-in-progress';
import type { CheckInEvent } from '../check-in/types';
import type { ResumoConexoes } from './types';

export const META_CONEXOES = 20;

/**
 * Situação da missão no evento ativo. A meta completa a missão, mas não limita as conexões:
 * o servidor continua dando XP por cada conexão confirmada além dela.
 */
export function missaoConexoes(evento: CheckInEvent | undefined, resumo: ResumoConexoes | null) {
  const doEvento = evento && resumo ? resumo.conexoes.filter((c) => c.eventoId === evento.id) : [];
  const feitas = doEvento.length;
  return {
    feitas,
    meta: META_CONEXOES,
    faltam: Math.max(META_CONEXOES - feitas, 0),
    extras: Math.max(feitas - META_CONEXOES, 0),
    concluida: feitas >= META_CONEXOES,
    xpGanho: doEvento.reduce((total, c) => total + c.xp, 0),
  };
}

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
  if (!evento) return { tipo: 'progresso', atual: 0, total: META_CONEXOES, texto: `Faça check-in para se conectar · ${META_CONEXOES} conexões concluem a missão` };
  const feitas = resumo.conexoes.filter((c) => c.eventoId === evento.id).length;
  const pendentes = resumo.recebidas.filter((r) => r.eventoId === evento.id).length;
  const sufixo = pendentes ? ` · ${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}` : '';
  if (feitas >= META_CONEXOES) return { tipo: 'concluido', texto: `${feitas} conexões · missão concluída${sufixo}` };
  return { tipo: 'progresso', atual: feitas, total: META_CONEXOES, texto: `${feitas} de ${META_CONEXOES} conexões${sufixo}` };
}