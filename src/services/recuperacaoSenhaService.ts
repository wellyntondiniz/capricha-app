import Constants from 'expo-constants';
import { Platform } from 'react-native';

function urlBase(): string {
  const manual = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (manual) return manual.replace(/\/$/, '');
  if (Platform.OS === 'web') return 'http://localhost:8080';
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost ?? '';
  const host = hostUri.split(':')[0];
  return host ? `http://${host}:8080` : 'http://localhost:8080';
}

async function post(path: string, body: object) {
  let resposta: Response;
  try {
    resposta = await fetch(`${urlBase()}/auth/email${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch { throw new Error(`Não foi possível conectar à API em ${urlBase()}.`); }
  const texto = await resposta.text();
  let dados: any = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch { dados = {}; }
  if (!resposta.ok) throw new Error(dados.mensagem ?? 'Não foi possível concluir a recuperação.');
  return dados as { mensagem: string; desafio?: string; simulado?: boolean };
}

export const recuperacaoSenhaService = {
  solicitar: (email: string) => post('/solicitar', { email }),
  validarCodigo: (desafio: string, codigo: string) => post('/validar-codigo', { desafio, codigo }),
  redefinir: (desafio: string, codigo: string, novaSenha: string) => post('/redefinir-senha', { desafio, codigo, novaSenha }),
};
