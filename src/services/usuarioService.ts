import BASE_URL from './api';
import { ErroApi, lerErroApi } from './erro-api';

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
  let res: Response;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuario),
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor.');
  }

  if (res.ok) return res.json();

  if (res.status === 409) {
    const mensagem = 'Este e-mail já está cadastrado.';
    throw new ErroApi(409, mensagem, { email: mensagem });
  }

  throw await lerErroApi(res, 'Não foi possível cadastrar o usuário.');
}

// Confere e-mail e senha na API. Em caso de erro, lança ErroApi (401 para credenciais inválidas).
export async function entrar(email: string, senha: string): Promise<Usuario> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor.');
  }

  if (res.ok) return res.json();
  throw await lerErroApi(res, 'Não foi possível entrar. Tente novamente.');
}
