import BASE_URL from './api';

export type Alternativa = {
    id?: number;
    texto?: string;
    correta?: boolean;
    pergunta?: {
      id: number;
    };
}

const URL = `${BASE_URL}/alternativa`;

export async function listarAlternativas(): Promise<Alternativa[]> {
  const res = await fetch(URL);

  if (!res.ok) throw new Error('Erro ao listar alternativas');

  return res.json();
}

export async function salvarAlternativa(
  alternativa: Alternativa
): Promise<Alternativa> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alternativa),
  });

  if (!res.ok) {
    const erro = await res.text();

    console.error('Erro retornado pela API:', {
      status: res.status,
      statusText: res.statusText,
      body: erro,
    });

    throw new Error(
      `Erro ao salvar alternativa (${res.status}): ${erro}`
    );
  }

  return res.json();
}

export async function atualizarAlternativa(
  id: number,
  alternativa: Alternativa
): Promise<Alternativa> {
  const res = await fetch(`${URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alternativa),
  });

  if (!res.ok) throw new Error('Erro ao atualizar alternativa');

  return res.json();
}