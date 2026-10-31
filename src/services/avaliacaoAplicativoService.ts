import BASE_URL from './api';
import { ErroApi, lerErroApi } from './erro-api';

export type RespostasAvaliacao = {
  peou01: number;
  peou02: number;
  peou03: number;
  peou04: number;
  peou05: number;
  peou06: number;
  pu01: number;
  pu02: number;
  pu03: number;
  pu04: number;
  pu05: number;
  pu06: number;
  ac01: number;
  ac02: number;
  ac03: number;
  ac04: number;
  ac05: number;
  ac06: number;
  ac07: number;
  ac08: number;
  se01: number;
  se02: number;
  se03: number;
  se04: number;
  se05: number;
  se06: number;
  se07: number;
  se08: number;
  com01: number;
  com02: number;
  com03: number;
  coo01: number;
  coo02: number;
  coo03: number;
  cop01: number;
  cop02: number;
  cop03: number;
  comentario?: string;
};

async function requisitar<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/avaliacoes-aplicativo${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar à API. Verifique se ela está em execução.');
  }

  if (!resposta.ok) {
    throw await lerErroApi(resposta, 'Não foi possível concluir a avaliação.');
  }
  return resposta.json();
}

export async function consultarAvaliacao(token: string): Promise<boolean> {
  const dados = await requisitar<{ respondida: boolean }>('/minha', token);
  return dados.respondida;
}

export async function enviarAvaliacao(token: string, respostas: RespostasAvaliacao): Promise<string> {
  const dados = await requisitar<{ mensagem: string }>('', token, {
    method: 'POST',
    body: JSON.stringify(respostas),
  });
  return dados.mensagem;
}
