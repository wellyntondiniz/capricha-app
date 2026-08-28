import BASE_URL from './api';

export type Usuario = {
    id? : number;
    nome? : string;
    email? : string;
    senha? : string;
    ativo? : boolean;
}

const URL = `${BASE_URL}/usuario`;

export async function listarUsuarios(): Promise<Usuario[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erro ao listar usuários');
  return res.json();
}

export async function salvarUsuario(usuario: Omit<Usuario, 'id'>): Promise<Usuario> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usuario),
  });
  if (!res.ok) throw new Error('Erro ao salvar usuário');
  return res.json();
}