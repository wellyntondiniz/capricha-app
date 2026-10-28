import type { Participacao } from './participacaoService';

/** Mesma classificacao por pontos da lista do ranking, incluindo empates. */
export function metricasUsuario(participacoes: Participacao[], usuarioId: number) {
  const minha = participacoes.find(p => p.usuario?.id === usuarioId);
  if (!minha) return { pontos: 0, posicao: null };
  const pontos = minha.score ?? 0;
  const posicao = 1 + participacoes.filter(p => (p.score ?? 0) > pontos).length;
  return { pontos, posicao };
}
