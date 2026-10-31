import type { CheckInProgress } from '../check-in/check-in-progress';

// Só o que o cálculo precisa do quiz; o tipo completo está em services/quizService.
type QuizResumo = { pontuacao: number; respondido: boolean; palestra: { eventoId: number | null } };

type Estado = 'carregando' | 'pronto' | 'erro';

function doEvento<T extends QuizResumo>(quizzes: T[], eventoId?: number) {
  return eventoId === undefined ? quizzes : quizzes.filter((q) => q.palestra.eventoId === eventoId);
}

/** Status do card "Quiz" na Home, calculado com os quizzes reais do evento ativo (nunca com números fixos). */
export function quizProgress(estado: Estado, quizzes: QuizResumo[] | null, eventoId?: number): CheckInProgress {
  if (estado === 'carregando') return { tipo: 'progresso', atual: 0, total: 0, texto: 'Consultando quizzes...' };
  if (estado === 'erro' || !quizzes) {
    return { tipo: 'progresso', atual: 0, total: 0, texto: 'Não foi possível consultar os quizzes' };
  }
  const lista = doEvento(quizzes, eventoId);
  if (lista.length === 0) return { tipo: 'progresso', atual: 0, total: 0, texto: 'Nenhum quiz neste evento' };
  const feitos = lista.filter((q) => q.respondido).length;
  const texto = `${feitos} de ${lista.length} ${lista.length === 1 ? 'quiz' : 'quizzes'}`;
  return feitos === lista.length
    ? { tipo: 'concluido', texto }
    : { tipo: 'progresso', atual: feitos, total: lista.length, texto };
}

/** Pontos que ainda dá para ganhar nos quizzes não respondidos do evento. */
export function quizXpDisponivel(quizzes: QuizResumo[] | null, eventoId?: number): number {
  if (!quizzes) return 0;
  return doEvento(quizzes, eventoId)
    .filter((q) => !q.respondido)
    .reduce((soma, q) => soma + q.pontuacao, 0);
}

/** Texto do selo de XP do card: o que ainda falta ganhar ou, se não falta nada, o selo neutro. */
export function quizXpTexto(estado: Estado, quizzes: QuizResumo[] | null, eventoId?: number): string {
  if (estado !== 'pronto' || !quizzes) return '—';
  const restante = quizXpDisponivel(quizzes, eventoId);
  return restante > 0 ? `até +${restante} XP` : '—';
}
