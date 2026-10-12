import BASE_URL from './api';
import type { Palestra } from './palestraService';

export type Evento = {
  id?: number;
  nome?: string;
  descricao?: string;
  dataInicio?: string;
  dataTermino?: string;
  ativo?: boolean;
};

export type EventoApiError = { status: number; message: string };

const URL = `${BASE_URL}/evento`;

async function lerErro(res: Response): Promise<EventoApiError> {
  const texto = await res.text();
  try {
    const dados = JSON.parse(texto);
    return { status: res.status, message: dados.mensagem || texto };
  } catch {
    return { status: res.status, message: texto || 'Erro inesperado.' };
  }
}

export async function listarEventos(): Promise<Evento[]> {
  const res = await fetch(URL);
  if (!res.ok) throw await lerErro(res);
  return res.json();
}

export async function buscarEventoPorId(id: number): Promise<Evento> {
  const res = await fetch(`${URL}/${id}`);
  if (!res.ok) throw await lerErro(res);
  return res.json();
}

export async function salvarEvento(evento: Omit<Evento, 'id' | 'ativo'>): Promise<Evento> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  });
  if (!res.ok) throw await lerErro(res);
  return res.json();
}

export const cadastrarEvento = salvarEvento;

export async function atualizarEvento(
  id: number,
  evento: Omit<Evento, 'id' | 'ativo'>
): Promise<Evento> {
  const res = await fetch(`${URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  });
  if (!res.ok) throw await lerErro(res);
  return res.json();
}

export async function desativarEvento(id: number): Promise<void> {
  const res = await fetch(`${URL}/${id}/desativar`, { method: 'PUT' });
  if (!res.ok) throw await lerErro(res);
}

export async function listarPalestrasDoEvento(eventoId: number): Promise<Palestra[]> {
  const res = await fetch(`${URL}/${eventoId}/palestras`);
  if (!res.ok) throw await lerErro(res);
  return res.json();
}