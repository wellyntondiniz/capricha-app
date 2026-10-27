import BASE_URL from './api';

export type Alternativa = {
  id: number;
  texto: string;
};

export type Pergunta = {
  id: number;
  enunciado: string;
  alternativas: Alternativa[];
};

export type Quiz = {
  id: number;
  titulo: string;
  descricao?: string;
  pontuacao: number;
  perguntas: Pergunta[];
};

export type RespostaPergunta = {
  perguntaId: number;
  alternativaId: number;
};

export type ResultadoQuiz = {
  quizId: number;
  acertos: number;
  totalPerguntas: number;
  pontosObtidos: number;
};

const URL = `${BASE_URL}/quizzes`;

async function lerErro(res: Response, padrao: string): Promise<Error> {
  try {
    const corpo = await res.json();
    return new Error(corpo?.mensagem || padrao);
  } catch {
    return new Error(padrao);
  }
}

export async function listarQuizzes(): Promise<Quiz[]> {
  const res = await fetch(URL);
  if (!res.ok) throw await lerErro(res, 'Erro ao listar quizzes');
  return res.json();
}

export async function listarRespostasDoUsuario(usuarioId: number): Promise<ResultadoQuiz[]> {
  const res = await fetch(`${URL}/respostas?usuarioId=${usuarioId}`);
  if (!res.ok) throw await lerErro(res, 'Erro ao carregar suas respostas');
  return res.json();
}

// Os pontos são calculados no servidor, que também os lança no ranking
export async function responderQuiz(
  quizId: number,
  usuarioId: number | undefined,
  respostas: RespostaPergunta[]
): Promise<ResultadoQuiz> {
  const res = await fetch(`${URL}/${quizId}/respostas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioId, respostas }),
  });
  if (!res.ok) throw await lerErro(res, 'Erro ao enviar respostas');
  return res.json();
}

export type NovaAlternativa = { texto: string; correta: boolean };
export type NovaPergunta = { enunciado: string; alternativas: NovaAlternativa[] };
export type NovoQuiz = { titulo: string; descricao: string; pontuacao: number; perguntas: NovaPergunta[] };

export async function cadastrarQuiz(quiz: NovoQuiz): Promise<Quiz> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz),
  });
  if (!res.ok) throw await lerErro(res, 'Erro ao cadastrar quiz');
  return res.json();
}
