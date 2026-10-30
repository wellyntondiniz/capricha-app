import BASE_URL from './api';

export type Alternativa = {
  id: number;
  texto: string;
};

// Perguntas cadastradas na palestra (tela cadastro-perguntas); o gabarito nunca vem da API
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
  palestra: { id: number; nome: string };
  perguntas: Pergunta[];
};

export type RespostaPergunta = {
  perguntaId: number;
  alternativaIds: number[];
};

export type ResultadoQuiz = {
  quizId: number;
  acertos: number;
  totalPerguntas: number;
  pontosObtidos: number;
};

export class QuizErro extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const URL = `${BASE_URL}/quizzes`;

async function lerErro(res: Response, padrao: string): Promise<QuizErro> {
  try {
    const corpo = await res.json();
    return new QuizErro(corpo?.mensagem || padrao, res.status);
  } catch {
    return new QuizErro(padrao, res.status);
  }
}

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function listarQuizzes(): Promise<Quiz[]> {
  const res = await fetch(URL);
  if (!res.ok) throw await lerErro(res, 'Erro ao listar quizzes');
  return res.json();
}

// Quizzes já respondidos pelo usuário da sessão
export async function listarMinhasRespostas(token: string): Promise<ResultadoQuiz[]> {
  const res = await fetch(`${URL}/respostas`, { headers: autorizacao(token) });
  if (!res.ok) throw await lerErro(res, 'Erro ao carregar suas respostas');
  return res.json();
}

// Os pontos são calculados no servidor, que também os lança no ranking; cada usuário responde uma vez
export async function responderQuiz(
  token: string,
  quizId: number,
  respostas: RespostaPergunta[]
): Promise<ResultadoQuiz> {
  const res = await fetch(`${URL}/${quizId}/respostas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...autorizacao(token) },
    body: JSON.stringify({ respostas }),
  });
  if (!res.ok) throw await lerErro(res, 'Erro ao enviar respostas');
  return res.json();
}

export type NovoQuiz = { titulo: string; descricao: string; pontuacao: number; palestraId: number };

export async function cadastrarQuiz(token: string, quiz: NovoQuiz): Promise<Quiz> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...autorizacao(token) },
    body: JSON.stringify(quiz),
  });
  if (!res.ok) throw await lerErro(res, 'Erro ao cadastrar quiz');
  return res.json();
}
