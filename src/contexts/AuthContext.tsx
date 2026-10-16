import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Usuario } from '@/services/usuarioService';

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
          setUsuario(JSON.parse(salvo));
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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dadosUsuario));
      setUsuario(dadosUsuario);
    } catch (erro) {
      console.error('Erro ao salvar sessão do usuário:', erro);
      throw erro;
    }
  }

  async function deslogar() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUsuario(null);
    } catch (erro) {
      console.error('Erro ao encerrar sessão:', erro);
      throw erro;
    }
  }

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
