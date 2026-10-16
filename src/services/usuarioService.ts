import type { ImagePickerAsset } from 'expo-image-picker';
import BASE_URL from './api';
import { ErroApi, lerErroApi } from './erro-api';

export type Usuario = {
    id? : number;
    nome? : string;
    email? : string;
    senha? : string;
    ativo? : boolean;
    perfil? : string;
    foto? : string | null;
}

const URL = `${BASE_URL}/usuario`;

export function obterUrlFotoUsuario(foto?: string | null): string | undefined {
  if (!foto) return undefined;
  if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
  return `${BASE_URL}/imagens/eventos/${encodeURIComponent(foto)}`;
}

function obterExtensaoImagem(mimeType?: string): string {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
}

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

export async function enviarFotoPerfil(
  usuarioId: number,
  asset: ImagePickerAsset
): Promise<Usuario> {
  const formData = new FormData();

  const respostaImagem = await fetch(asset.uri);
  const blob = await respostaImagem.blob();

  const nomeArquivo =
    asset.fileName ||
    `usuario-${usuarioId}-${Date.now()}.${obterExtensaoImagem(asset.mimeType)}`;

  formData.append('foto', blob, nomeArquivo);

  let res: Response;
  try {
    res = await fetch(`${URL}/${usuarioId}/foto`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor.');
  }

  if (res.ok) return res.json();
  throw await lerErroApi(res, 'Não foi possível atualizar a foto de perfil.');
}

export async function removerFotoPerfil(usuarioId: number): Promise<Usuario> {
  let res: Response;
  try {
    res = await fetch(`${URL}/${usuarioId}/foto`, {
      method: 'DELETE',
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor.');
  }

  if (res.ok) return res.json();
  throw await lerErroApi(res, 'Não foi possível remover a foto de perfil.');
}
