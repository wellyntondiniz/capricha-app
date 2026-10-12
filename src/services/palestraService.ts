import type { ImagePickerAsset } from 'expo-image-picker';
import BASE_URL from './api';
import type { Evento } from './eventoService';
import type { Pergunta } from './perguntaService';

export type Palestra = {
  id?: number;
  nome?: string;
  descricao?: string;
  palestrante?: string;
  data?: string;
  horario?: string;
  perguntas?: Pergunta[];
  evento?: Evento;
  imagem?: string | null;
};

export type PalestraApiError = { status: number; message: string };

const URL = `${BASE_URL}/palestras`;

async function lerErro(res: Response): Promise<PalestraApiError> {
  const texto = await res.text();
  try {
    const dados = JSON.parse(texto);
    return { status: res.status, message: dados.mensagem || texto };
  } catch {
    return { status: res.status, message: texto || 'Erro inesperado.' };
  }
}

export async function listarPalestras(): Promise<Palestra[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erro ao listar palestras');
  return res.json();
}

export async function salvarPalestra(palestra: Omit<Palestra, 'id'>): Promise<Palestra> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(palestra),
  });

  if (!res.ok) {
    throw await lerErro(res);
  }

  return res.json();
}

export async function adicionarPergunta(
  id: number,
  pergunta: Omit<Pergunta, 'id'>
): Promise<Pergunta> {
  const res = await fetch(`${URL}/${id}/add-pergunta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pergunta),
  });
  if (!res.ok) throw new Error('Erro ao adicionar pergunta');
  return res.json();
}

export async function listarPerguntas(id: number): Promise<Pergunta[]> {
  const res = await fetch(`${URL}/${id}/perguntas`);
  if (!res.ok) throw new Error('Erro ao listar perguntas');
  return res.json();
}

function obterExtensaoImagem(mimeType?: string): string {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
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

    formData.append('imagem', blob, nomeArquivo);
  }

  const res = await fetch(URL, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw await lerErro(res);
  }

  return res.json();
}

export function obterUrlImagemPalestra(imagem?: string | null): string | undefined {
  if (!imagem) return undefined;
  return `${BASE_URL}/imagens/eventos/${encodeURIComponent(imagem)}`;
}