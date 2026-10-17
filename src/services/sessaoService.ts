import BASE_URL from './api';
import type { Usuario } from './usuarioService';

export class SessaoInvalidaError extends Error {}

export async function restaurarSessao(dados: Usuario): Promise<Usuario | null> {
  if (!dados.token || !dados.expiraEm || !Number.isFinite(Date.parse(dados.expiraEm))
    || Date.parse(dados.expiraEm) <= Date.now()) return null;
  try {
    const atual = await validarSessao(dados.token);
    return { ...atual, token: dados.token, expiraEm: dados.expiraEm };
  } catch (erro) {
    if (erro instanceof SessaoInvalidaError) return null;
    // Offline mantém a sessão local, mas não autoriza operações no servidor.
    return dados;
  }
}

export function mesclarSessao(atual: Usuario | null, dados: Usuario): Usuario {
  return atual && atual.id === dados.id
    ? { ...dados, token: dados.token ?? atual.token, expiraEm: dados.expiraEm ?? atual.expiraEm }
    : dados;
}

export async function validarSessao(token: string): Promise<Usuario> {
  const res = await fetch(`${BASE_URL}/auth/sessao`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401) throw new SessaoInvalidaError('Sessão expirada.');
  if (!res.ok) throw new Error('Não foi possível validar a sessão.');
  return res.json();
}

export async function encerrarSessao(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok && res.status !== 401) throw new Error('Não foi possível encerrar a sessão no servidor.');
}
