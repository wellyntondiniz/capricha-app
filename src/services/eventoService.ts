import BASE_URL from './api';

export type Evento = {
  id?: number;
  nome: string;
  descricao: string;
  dataInicio?: string; // ISO 8601, ex: 2026-09-20T00:00:00
  dataTermino?: string; // ISO 8601, ex: 2026-09-21T00:00:00
  ativo?: boolean;
};

const URL = `${BASE_URL}/evento`;

async function tratarErro(res: Response, mensagemPadrao: string): Promise<never> {
  const corpo = await res.json().catch(() => null);
  throw new Error((corpo && corpo.message) || mensagemPadrao);
}

export async function listarEventos(): Promise<Evento[]> {
  const res = await fetch(URL);
  if (!res.ok) return tratarErro(res, 'Erro ao listar eventos');
  return res.json();
}

export async function buscarEventoPorId(id: number): Promise<Evento> {
  const res = await fetch(`${URL}/${id}`);
  if (!res.ok) return tratarErro(res, 'Erro ao buscar evento');
  return res.json();
}

export async function cadastrarEvento(evento: Omit<Evento, 'id' | 'ativo'>): Promise<Evento> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  });
  if (!res.ok) return tratarErro(res, 'Erro ao cadastrar evento');
  return res.json();
}

export async function atualizarEvento(
  id: number,
  evento: Omit<Evento, 'id' | 'ativo'>
): Promise<Evento> {
  const res = await fetch(`${URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  });
  if (!res.ok) return tratarErro(res, 'Erro ao atualizar evento');
  return res.json();
}

export async function desativarEvento(id: number): Promise<void> {
  const res = await fetch(`${URL}/${id}/desativar`, { method: 'PUT' });
  if (!res.ok) return tratarErro(res, 'Erro ao excluir evento');
}
