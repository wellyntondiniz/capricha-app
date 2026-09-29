import BASE_URL from './api';

export type Evento = {
    id?: number;
    nome?: string;
    descricao?: string;
    dataInicio?: Date;
    dataTermino?: Date;
    ativo?: boolean;
}

const URL = `${BASE_URL}/evento`;

export async function listarEventos(): Promise<Evento[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erro ao listar eventos');
  return res.json();
}

export async function buscarPorId(id: number): Promise<Evento> {
  const res = await fetch(`${URL}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar evento');
  return res.json();
}