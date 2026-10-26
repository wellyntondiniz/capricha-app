import BASE_URL from './api';
import { ErroApi, lerErroApi } from './erro-api';

export type PerguntaAvaliacao = {
  id: number;
  texto: string;
  ordem: number;
};

export type RespostaAvaliacao = {
  perguntaId: number;
  nota: number;
};

async function requisitar<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/avaliacoes-aplicativo${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  if (resposta.status === 204) return undefined as T;
  return resposta.json();
}

export function listarPerguntasAvaliacao(): Promise<PerguntaAvaliacao[]> {
  return requisitar('/perguntas');
}

export async function consultarAvaliacao(token: string): Promise<boolean> {
  const dados = await requisitar<{ respondida: boolean }>('/minha', token);
  return dados.respondida;
}

export async function enviarAvaliacao(token: string, respostas: RespostaAvaliacao[]): Promise<string> {
  const dados = await requisitar<{ mensagem: string }>('/respostas', token, {
    method: 'POST',
    body: JSON.stringify({ respostas }),
  });
  return dados.mensagem;
}
