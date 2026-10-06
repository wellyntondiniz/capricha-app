import BASE_URL from './api';
import type { Evento } from './eventoService';
import type { ImagePickerAsset } from 'expo-image-picker';

export type Palestra = {
  id?: number;
  nome?: string;
  descricao?: string;
  palestrante?: string;
  data?: string;
  horario?: string;
  evento?: Evento | string;
  imagem?: string | null;
};

export type PalestraApiError = {
  status: number;
  message: string;
};

const URL = `${BASE_URL}/palestras`;

export async function listarPalestras(): Promise<Palestra[]> {
  const res = await fetch(URL);

  if (!res.ok) {
    throw new Error('Erro ao listar palestras');
  }

  return res.json();
}

export async function salvarPalestra(
  palestra: Omit<Palestra, 'id'>
): Promise<Palestra> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(palestra),
  });

  if (!res.ok) {
    const mensagemErro = await res.text();

    throw {
      status: res.status,
      message: mensagemErro,
    } as PalestraApiError;
  }

  return res.json();
}

export async function salvarPalestraComImagem(
  dados: {
    nome: string;
    descricao: string;
    palestrante: string;
    data: string;
    horario: string;
    evento: number;
  },
  imagem?: ImagePickerAsset | null
): Promise<Palestra> {

  const formData = new FormData();

  formData.append('nome', dados.nome);
  formData.append('descricao', dados.descricao);
  formData.append('palestrante', dados.palestrante);
  formData.append('data', dados.data);
  formData.append('horario', dados.horario);
  formData.append('evento', String(dados.evento));

  if (imagem) {
    const respostaImagem = await fetch(imagem.uri);
    const blob = await respostaImagem.blob();

    const nomeArquivo =
      imagem.fileName ||
      `palestra-${Date.now()}.${obterExtensaoImagem(imagem.mimeType)}`;

    formData.append(
      'imagem',
      blob,
      nomeArquivo
    );
  }

  const res = await fetch(URL, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const mensagemErro = await res.text();

    throw {
      status: res.status,
      message: mensagemErro,
    } as PalestraApiError;
  }

  return res.json();
}

function obterExtensaoImagem(mimeType?: string): string {
  if (!mimeType) {
    return 'jpg';
  }

  if (mimeType.includes('png')) {
    return 'png';
  }

  if (mimeType.includes('webp')) {
    return 'webp';
  }

  if (mimeType.includes('gif')) {
    return 'gif';
  }

  return 'jpg';
}

export function obterUrlImagemPalestra(
  imagem?: string | null
): string | undefined {

  if (!imagem) {
    return undefined;
  }

  return `${BASE_URL}/imagens/eventos/${encodeURIComponent(imagem)}`;
}