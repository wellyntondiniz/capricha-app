import BASE_URL from './api';
import { Pergunta } from './perguntaService';

export type Palestra = {
    id? : number;
    nome? : string;
    descricao? : string;
    palestrante? : string;
    data? : Date;
    perguntas?: Pergunta[];
}

const URL = `${BASE_URL}/palestra`;

export async function cadastrarPalestra(palestra: Palestra): Promise<Palestra> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(palestra),
  });

  if (!res.ok) throw new Error('Erro ao cadastrar palestra');

  return res.json();
}

export async function listarPalestras(): Promise<Palestra[]> {
  const res = await fetch(URL);

  if (!res.ok) throw new Error('Erro ao listar palestras');

  return res.json();
}

export async function adicionarPergunta(
  id: number,
  pergunta: Pergunta
): Promise<Pergunta> {
  const res = await fetch(`${URL}/${id}/perguntas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pergunta),
  });

  if (!res.ok) throw new Error('Erro ao adicionar pergunta');

  return res.json();
}

export async function listarPerguntas(
  id: number
): Promise<Pergunta[]> {
  const res = await fetch(`${URL}/${id}/perguntas`);

  if (!res.ok) throw new Error('Erro ao listar perguntas');

  return res.json();
}