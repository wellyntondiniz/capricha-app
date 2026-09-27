import BASE_URL from './api';
import type { Evento } from './eventoService';

export type Palestra = {
  id?: number;
  nome?: string;
  descricao?: string;
  palestrante?: string;
  data?: string;
  horario?: string;
  evento?: Evento;
};

export type PalestraApiError = { status: number; message: string };

const URL = `${BASE_URL}/palestras`;

export async function listarPalestras(): Promise<Palestra[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erro ao listar palestras');
  return res.json();
}

export async function salvarPalestra(palestra: Omit<Palestra, 'id'>): Promise<Palestra> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(palestra),
  });

  if (!res.ok) {
    const mensagemErro = await res.text();
    throw { status: res.status, message: mensagemErro } as PalestraApiError;
  }

  return res.json();
}