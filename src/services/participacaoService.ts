import BASE_URL from './api';
import { Evento } from './eventoService';
import { Usuario } from './usuarioService';

export type Participacao = {
    id?: number;
    usuario?: Usuario;
    evento?: Evento;
    score?: number;
}

const URL = `${BASE_URL}/participacao`;

export async function listar(): Promise<Participacao[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erro ao listar participações');
  return res.json();
}

export async function listarPorEvento(eventoId: number): Promise<Participacao[]> {
  const res = await fetch(`${URL}/${eventoId}/byUsuario`);
  if (!res.ok) throw new Error('Erro ao listar participações do evento');
  return res.json();
}
