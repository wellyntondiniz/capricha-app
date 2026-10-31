// Mesma regra do servidor: só entra no quiz pergunta ativa, com 2+ alternativas e ao menos uma correta.
type AlternativaResumo = { correta?: boolean };
type PerguntaResumo = {
  id?: number;
  ativo?: boolean;
  alternativas?: AlternativaResumo[];
  palestra?: { id?: number };
};

export function perguntaValida(pergunta: PerguntaResumo): boolean {
  const alternativas = pergunta.alternativas ?? [];
  return pergunta.ativo !== false && alternativas.length >= 2 && alternativas.some((a) => a.correta === true);
}

export type ResumoPerguntas = { total: number; validas: number; incompletas: number };

/** Quantas perguntas a palestra tem e quantas delas realmente entram no quiz. */
export function resumirPerguntas(perguntas: PerguntaResumo[]): ResumoPerguntas {
  const ativas = perguntas.filter((p) => p.ativo !== false);
  const validas = ativas.filter(perguntaValida).length;
  return { total: ativas.length, validas, incompletas: ativas.length - validas };
}

/** Perguntas ativas agrupadas pelo id da palestra. */
export function agruparPorPalestra<T extends PerguntaResumo>(perguntas: T[]): Map<number, T[]> {
  const grupos = new Map<number, T[]>();
  for (const pergunta of perguntas) {
    const palestraId = pergunta.palestra?.id;
    if (palestraId === undefined || pergunta.ativo === false) continue;
    grupos.set(palestraId, [...(grupos.get(palestraId) ?? []), pergunta]);
  }
  return grupos;
}

export function textoPerguntas(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'pergunta' : 'perguntas'}`;
}