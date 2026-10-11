// Erro devolvido pela API, com a mensagem geral e (quando houver) a mensagem de cada campo inválido.
export class ErroApi extends Error {
  status: number;
  campos: Record<string, string>;

  constructor(status: number, mensagem: string, campos: Record<string, string> = {}) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.campos = campos;
  }
}

// Lê o corpo de erro padrão da API: { mensagem, campos }.
export async function lerErroApi(resposta: Response, mensagemPadrao: string): Promise<ErroApi> {
  let corpo: { mensagem?: string; campos?: Record<string, string> } = {};
  try {
    const texto = await resposta.text();
    corpo = texto ? JSON.parse(texto) : {};
  } catch {
    // Resposta sem JSON: usa a mensagem padrão.
  }
  return new ErroApi(resposta.status, corpo.mensagem ?? mensagemPadrao, corpo.campos ?? {});
}
