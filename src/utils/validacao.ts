// Regras de validação usadas pelos formulários do app.
// Cada função retorna a mensagem de erro, ou undefined quando o valor é válido.

export function obrigatorio(valor: string, mensagem: string): string | undefined {
  return valor.trim().length === 0 ? mensagem : undefined;
}

export function validarEmail(valor: string): string | undefined {
  const email = valor.trim();
  if (email.length === 0) return 'Informe o e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Digite um e-mail válido (ex: voce@exemplo.com).';
  return undefined;
}

export function validarSenha(valor: string): string | undefined {
  if (valor.length === 0) return 'Informe a senha.';
  if (valor.trim().length !== valor.length) return 'A senha não pode começar ou terminar com espaço.';
  if (valor.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (valor.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  return undefined;
}

export function validarConfirmacaoSenha(confirmacao: string, senha: string): string | undefined {
  if (confirmacao.length === 0) return 'Confirme a senha.';
  if (confirmacao !== senha) return 'As senhas não coincidem.';
  return undefined;
}

export function validarCodigo(valor: string): string | undefined {
  if (valor.length === 0) return 'Informe o código.';
  if (!/^\d{6}$/.test(valor)) return 'O código deve ter 6 números.';
  return undefined;
}

// Data no formato DD/MM/AAAA, conferindo se o dia existe no mês.
export function validarData(valor: string): string | undefined {
  if (valor.trim().length === 0) return 'Informe a data.';
  const invalida = 'Digite uma data válida no formato DD/MM/AAAA.';
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return invalida;

  const [dia, mes, ano] = valor.split('/').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const existe = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return existe ? undefined : invalida;
}

// Horário no formato HH:MM. 00:00 não é aceito como início de palestra.
export function validarHorario(valor: string): string | undefined {
  if (valor.trim().length === 0) return 'Informe o horário.';
  const invalido = 'Digite um horário válido no formato HH:MM (00:00 não é permitido).';
  if (!/^\d{2}:\d{2}$/.test(valor)) return invalido;

  const [hora, minuto] = valor.split(':').map(Number);
  if (hora === 0 && minuto === 0) return invalido;
  return hora <= 23 && minuto <= 59 ? undefined : invalido;
}
