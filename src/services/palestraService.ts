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

async function lerErro(res: Response): Promise<PalestraApiError> {
  const texto = await res.text();
  try {
    const dados = JSON.parse(texto);
    return { status: res.status, message: dados.mensagem || texto };
  } catch {
    return { status: res.status, message: texto || 'Erro inesperado.' };
  }
}

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
    throw await lerErro(res);
  }

  return res.json();
}