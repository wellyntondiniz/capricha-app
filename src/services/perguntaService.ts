import { Alternativa } from './alternativaService';
import BASE_URL from './api';

export type Pergunta = {
    id?: number;
    enunciado?: string;
    alternativas?: Alternativa[];
    ativo?: boolean;
    palestra?: {
      id: number;
    };
}

const URL = `${BASE_URL}/pergunta`;

// A API devolve { mensagem } nos erros de validação; mostra o motivo em vez de um texto genérico
async function lerMensagem(res: Response, padrao: string): Promise<string> {
  try {
    const corpo = await res.json();
    return corpo?.mensagem || padrao;
  } catch {
    return padrao;
  }
}

  export async function listarPerguntas(): Promise<Pergunta[]> {
    const res = await fetch(URL);

    if (!res.ok) throw new Error('Erro ao listar perguntas');

    return res.json();
  }

export async function salvarPergunta(
  pergunta: Pergunta
): Promise<Pergunta> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pergunta),
  });

  if (!res.ok) throw new Error(await lerMensagem(res, 'Erro ao salvar pergunta'));

  return res.json();
}

export async function atualizarPergunta(
  id: number,
  pergunta: Pergunta
): Promise<Pergunta> {
  const res = await fetch(`${URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pergunta),
  });

  if (!res.ok) throw new Error(await lerMensagem(res, 'Erro ao atualizar pergunta'));

  return res.json();
}

export async function deletarPerguntaById(
  id: number,
): Promise<void> {
  const res = await fetch(`${URL}/deletar/${id}`, {
    method: 'PUT'
  });

  if (!res.ok) throw new Error(await lerMensagem(res, 'Erro ao deletar pergunta'));
}