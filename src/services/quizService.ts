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

// Motivos pelos quais o participante ainda não pode responder (definidos pelo servidor)
export type BloqueioQuiz = 'EVENT_CHECK_IN_REQUIRED' | 'LECTURE_CHECK_IN_REQUIRED' | 'QUIZ_EMPTY';

export type Quiz = {
  id: number;
  titulo: string;
  descricao?: string | null;
  pontuacao: number;
  palestra: { id: number; nome: string; eventoId: number | null };
  // Total de perguntas do quiz; a lista só vem preenchida quando o participante pode responder
  totalPerguntas: number;
  perguntas: Pergunta[];
  respondido: boolean;
  disponivel: boolean;
  bloqueio: BloqueioQuiz | null;
  mensagemBloqueio: string | null;
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
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

const URL = `${BASE_URL}/quizzes`;

async function lerErro(res: Response, padrao: string): Promise<QuizErro> {
  try {
    const corpo = await res.json();
    return new QuizErro(corpo?.mensagem || padrao, res.status, corpo?.code);
  } catch {
    return new QuizErro(padrao, res.status);
  }
}

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Quizzes dos eventos ativos, já com a situação do usuário da sessão (respondido, liberado ou bloqueado)
export async function listarQuizzes(token: string): Promise<Quiz[]> {
  const res = await fetch(URL, { headers: autorizacao(token) });
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

export type EdicaoQuiz = { titulo: string; descricao: string; pontuacao: number };

// Edita título, descrição e pontuação; as perguntas são as da palestra (cadastro de perguntas)
export async function atualizarQuiz(token: string, id: number, quiz: EdicaoQuiz): Promise<Quiz> {
  const res = await fetch(`${URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...autorizacao(token) },
    body: JSON.stringify(quiz),
  });
  if (!res.ok) throw await lerErro(res, 'Erro ao atualizar quiz');
  return res.json();
}