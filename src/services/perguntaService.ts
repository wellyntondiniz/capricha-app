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

  if (!res.ok) throw new Error('Erro ao salvar pergunta');

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

  if (!res.ok) throw new Error('Erro ao atualizar pergunta');

  return res.json();
}