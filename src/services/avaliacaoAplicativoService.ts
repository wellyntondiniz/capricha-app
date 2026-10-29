import BASE_URL from './api';
import { ErroApi, lerErroApi } from './erro-api';

export type RespostasAvaliacao = {
  navegacao: number;
  clarezaInformacoes: number;
  utilidadeFuncionalidades: number;
  desempenhoTecnico: number;
  recomendacao: number;
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
