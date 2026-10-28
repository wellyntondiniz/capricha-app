import Constants from "expo-constants";
import { Platform } from "react-native";

// Login principal e check-in compartilham a mesma origem (sem o antigo sufixo /api).
const enderecoConfigurado = process.env.EXPO_PUBLIC_API_URL
  ?? Constants.expoConfig?.extra?.apiUrl as string | undefined;

const PORTA = "8080";

function resolverUrlBase(): string {
  const manual = enderecoConfigurado;
  if (manual) return manual.replace(/\/$/, '');

  if (Platform.OS === "web") {
    return `http://localhost:${PORTA}`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    "";
  const host = hostUri.split(":")[0];
  if (host) return `http://${host}:${PORTA}`;

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${PORTA}`;
  }

  return `http://localhost:${PORTA}`;
}

const BASE_URL = resolverUrlBase();
export default BASE_URL;

const API_URL = BASE_URL;

export type ApiError = { status: number; message: string };

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const { method = "GET", body, headers } = options;

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(headers ?? {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw { status: 0, message: "Não foi possível conectar ao servidor" } as ApiError;
  }

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    const message =
      (dados && (dados.message as string)) || "Erro inesperado. Tente novamente.";
    throw { status: resposta.status, message } as ApiError;
  }

  return dados as T;
}
