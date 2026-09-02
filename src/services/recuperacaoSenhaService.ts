import { Platform } from 'react-native';

const API = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

async function post(path: string, body: object) {
  const response = await fetch(`${API}/auth${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.mensagem ?? 'Não foi possível concluir a solicitação.');
  return data;
}

export const recuperacaoSenhaService = {
  solicitar: (email: string) => post('/esqueci-senha', { email }),
  redefinir: (token: string, novaSenha: string) => post('/redefinir-senha', { token, novaSenha }),
};
