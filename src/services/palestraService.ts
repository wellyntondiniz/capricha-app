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
  dataTermino?: string | null;
  perguntas?: Pergunta[];
  evento?: Evento;
  imagem?: string | null;
};

export type PalestraApiError = { status: number; message: string };

export type DadosPalestra = {
  nome: string;
  descricao: string;
  palestrante: string;
  data: string;
  horario: string;
  dataTermino?: string;
  evento: number;
};

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

// Cadastro, edição e exclusão são só do administrador: a API exige a sessão no cabeçalho.
function cabecalhoAuth(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function falhaDeRede(): Promise<never> {
  throw { status: 0, message: 'Não foi possível conectar à API.' } as PalestraApiError;
}

export async function listarPalestras(): Promise<Palestra[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erro ao listar palestras');
  return res.json();
}

export async function buscarPalestra(id: number): Promise<Palestra> {
  const res = await fetch(`${URL}/${id}`);
  if (!res.ok) throw await lerErro(res);
  return res.json();
}

export async function salvarPalestra(
  palestra: Omit<Palestra, 'id'>,
  token?: string
): Promise<Palestra> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhoAuth(token) },
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

async function montarFormData(
  dados: DadosPalestra,
  imagem?: ImagePickerAsset | null
): Promise<FormData> {
  const formData = new FormData();

  formData.append('nome', dados.nome);
  formData.append('descricao', dados.descricao);
  formData.append('palestrante', dados.palestrante);
  formData.append('data', dados.data);
  formData.append('horario', dados.horario);
  if (dados.dataTermino) formData.append('dataTermino', dados.dataTermino);
  formData.append('evento', String(dados.evento));

  if (imagem) {
    const respostaImagem = await fetch(imagem.uri);
    const blob = await respostaImagem.blob();

    const nomeArquivo =
      imagem.fileName ||
      `palestra-${Date.now()}.${obterExtensaoImagem(imagem.mimeType)}`;

    formData.append('imagem', blob, nomeArquivo);
  }

  return formData;
}

export async function salvarPalestraComImagem(
  dados: DadosPalestra,
  imagem?: ImagePickerAsset | null,
  token?: string
): Promise<Palestra> {
  const formData = await montarFormData(dados, imagem);

  let res: Response;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: cabecalhoAuth(token),
      body: formData,
    });
  } catch {
    return falhaDeRede();
  }

  if (!res.ok) {
    throw await lerErro(res);
  }

  return res.json();
}

// `imagem` troca a imagem atual; `removerImagem` apaga a atual quando nenhuma nova foi escolhida.
export async function atualizarPalestraComImagem(
  id: number,
  dados: DadosPalestra,
  imagem?: ImagePickerAsset | null,
  removerImagem = false,
  token?: string
): Promise<Palestra> {
  const formData = await montarFormData(dados, imagem);
  if (removerImagem) formData.append('removerImagem', 'true');

  let res: Response;
  try {
    res = await fetch(`${URL}/${id}`, {
      method: 'PUT',
      headers: cabecalhoAuth(token),
      body: formData,
    });
  } catch {
    return falhaDeRede();
  }

  if (!res.ok) {
    throw await lerErro(res);
  }

  return res.json();
}

export async function excluirPalestra(id: number, token?: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${URL}/${id}`, {
      method: 'DELETE',
      headers: cabecalhoAuth(token),
    });
  } catch {
    return falhaDeRede();
  }

  if (!res.ok) {
    throw await lerErro(res);
  }
}

export function obterUrlImagemPalestra(imagem?: string | null): string | undefined {
  if (!imagem) return undefined;
  return `${BASE_URL}/imagens/eventos/${encodeURIComponent(imagem)}`;
}