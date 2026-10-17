import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Usuario } from '@/services/usuarioService';
import { encerrarSessao, mesclarSessao, restaurarSessao } from '@/services/sessaoService';

export interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  salvarSessao: (usuario: Usuario) => Promise<void>;
  deslogar: () => Promise<void>;
}

const STORAGE_KEY = '@capricha:usuario';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    async function carregarSessao() {
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEY);
        if (salvo) {
          const dados: Usuario = JSON.parse(salvo);
          const sessao = await restaurarSessao(dados);
          if (!sessao) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            return;
          }
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
          setUsuario(sessao);
        }
      } catch (erro) {
        console.error('Erro ao carregar sessão do usuário:', erro);
      } finally {
        setCarregando(false);
      }
    }

    carregarSessao();
  }, []);

  async function salvarSessao(dadosUsuario: Usuario) {
    try {
      // Atualizações de foto devolvem os dados públicos, sem uma nova credencial.
      const sessao = mesclarSessao(usuario, dadosUsuario);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
      setUsuario(sessao);
    } catch (erro) {
      console.error('Erro ao salvar sessão do usuário:', erro);
      throw erro;
    }
  }

  const deslogar = useCallback(async () => {
    try {
      if (usuario?.token) await encerrarSessao(usuario.token);
    } catch (erro) {
      console.error('Erro ao encerrar sessão:', erro);
    } finally {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        setUsuario(null);
      }
    }
  }, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, carregando, salvarSessao, deslogar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
