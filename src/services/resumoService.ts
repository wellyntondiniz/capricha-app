import type { ImagePickerAsset } from 'expo-image-picker';

import BASE_URL from './api';
import { ErroApi, lerErroApi } from './erro-api';

export type Resumo = {
  id: number;
  titulo: string;
  texto: string;
  autores: string[];
  banner: string | null;
  palavrasChave: string[];
  eventoId: number;
  eventoNome: string;
};

export type DadosResumo = {
  titulo: string;
  texto: string;
  autores: string; // separados por vírgula, ponto e vírgula ou quebra de linha
  palavrasChave: string; // idem
  eventoId: number;
};

const URL = `${BASE_URL}/resumos`;

async function requisitar(url: string, init: RequestInit, mensagemPadrao: string): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(url, init);
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor.');
  }
  if (!resposta.ok) throw await lerErroApi(resposta, mensagemPadrao);
  return resposta;
}

function extensaoDaImagem(mimeType?: string): string {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
}

async function montarFormulario(
  dados: DadosResumo,
  banner?: ImagePickerAsset | null,
  removerBanner = false
): Promise<FormData> {
  const form = new FormData();
  form.append('titulo', dados.titulo);
  form.append('texto', dados.texto);
  form.append('autores', dados.autores);
  form.append('palavrasChave', dados.palavrasChave);
  form.append('eventoId', String(dados.eventoId));
  if (removerBanner) form.append('removerBanner', 'true');

  if (banner) {
    const blob = await (await fetch(banner.uri)).blob();
    const nome = banner.fileName || `resumo-${Date.now()}.${extensaoDaImagem(banner.mimeType)}`;
    form.append('banner', blob, nome);
  }
  return form;
}

export async function listarResumosDoEvento(eventoId: number): Promise<Resumo[]> {
  const res = await requisitar(`${URL}?eventoId=${eventoId}`, {}, 'Não foi possível carregar os resumos.');
  return res.json();
}

export async function buscarResumo(id: number): Promise<Resumo> {
  const res = await requisitar(`${URL}/${id}`, {}, 'Não foi possível carregar o resumo.');
  return res.json();
}

export async function cadastrarResumo(dados: DadosResumo, banner?: ImagePickerAsset | null): Promise<Resumo> {
  const res = await requisitar(
    URL,
    { method: 'POST', body: await montarFormulario(dados, banner) },
    'Não foi possível cadastrar o resumo.'
  );
  return res.json();
}

export async function atualizarResumo(
  id: number,
  dados: DadosResumo,
  opcoes: { banner?: ImagePickerAsset | null; removerBanner?: boolean } = {}
): Promise<Resumo> {
  const res = await requisitar(
    `${URL}/${id}`,
    {
      method: 'PUT',
      body: await montarFormulario(dados, opcoes.banner, opcoes.removerBanner),
    },
    'Não foi possível salvar o resumo.'
  );
  return res.json();
}

export async function excluirResumo(id: number): Promise<void> {
  await requisitar(`${URL}/${id}`, { method: 'DELETE' }, 'Não foi possível excluir o resumo.');
}

export function obterUrlBanner(banner?: string | null): string | undefined {
  if (!banner) return undefined;
  return `${BASE_URL}/imagens/eventos/${encodeURIComponent(banner)}`;
}
