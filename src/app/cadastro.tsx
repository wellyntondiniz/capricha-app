import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFormulario } from '@/components/campo-formulario';
import { Mensagem, MensagemFormulario } from '@/components/mensagem-formulario';
import { MENSAGEM_CORRIJA_CAMPOS } from '@/constants/formulario';
import { useFormulario } from '@/hooks/use-formulario';
import { ErroApi } from '@/services/erro-api';
import { salvarUsuario } from '@/services/usuarioService';
import {
  obrigatorio,
  validarConfirmacaoSenha,
  validarEmail,
  validarSenha,
} from '@/utils/validacao';

type Campo = 'nome' | 'email' | 'senha' | 'confirmarSenha';

function validarCampo(campo: Campo, valores: Record<Campo, string>): string | undefined {
  switch (campo) {
    case 'nome':
      if (valores.nome.trim().length > 100) return 'O nome deve ter no máximo 100 caracteres.';
      return obrigatorio(valores.nome, 'Informe o nome de usuário.');
    case 'email':
      return validarEmail(valores.email);
    case 'senha':
      return validarSenha(valores.senha);
    case 'confirmarSenha':
      return validarConfirmacaoSenha(valores.confirmarSenha, valores.senha);
  }
}

export default function RegisterScreen() {
  const formulario = useFormulario<Campo>(
    { nome: '', email: '', senha: '', confirmarSenha: '' },
    validarCampo,
    { senha: ['confirmarSenha'] },
  );
  const { valores, erros } = formulario;
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  function alterar(campo: Campo, valor: string) {
    formulario.alterar(campo, valor);
    setMensagem(null);
  }

  async function handleCadastro() {
    if (enviando) return;
    setMensagem(null);

    if (!formulario.validarCampos()) {
      setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      return;
    }

    setEnviando(true);
    try {
      await salvarUsuario({
        nome: valores.nome.trim(),
        email: valores.email.trim(),
        senha: valores.senha,
        ativo: true,
      });

      formulario.limpar();
      setMensagem({ texto: 'Usuário cadastrado com sucesso!', tipo: 'sucesso' });
    } catch (error) {
      if (error instanceof ErroApi && formulario.definirErros(error.campos)) {
        setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      } else {
        setMensagem({
          texto: error instanceof Error ? error.message : 'Não foi possível cadastrar o usuário.',
          tipo: 'erro',
        });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>✦</Text>
          </View>

          <Text style={styles.logoTitle}>
            Crie sua conta
          </Text>
        </View>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Cadastro de usuário
          </Text>

          <CampoFormulario
            rotulo="Nome de usuário"
            erro={erros.nome}
            dica="Use um nome único para sua conta."
            value={valores.nome}
            onChangeText={(valor) => alterar('nome', valor)}
            onBlur={() => formulario.sair('nome')}
            placeholder="ex: joao_silva"
            autoCapitalize="none"
          />

          <CampoFormulario
            rotulo="E-mail"
            erro={erros.email}
            value={valores.email}
            onChangeText={(valor) => alterar('email', valor)}
            onBlur={() => formulario.sair('email')}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <CampoFormulario
            rotulo="Senha"
            erro={erros.senha}
            dica="Sua senha deve possuir pelo menos 8 caracteres."
            value={valores.senha}
            onChangeText={(valor) => alterar('senha', valor)}
            onBlur={() => formulario.sair('senha')}
            placeholder="Digite sua senha"
            secureTextEntry
          />

          <CampoFormulario
            rotulo="Confirmar senha"
            erro={erros.confirmarSenha}
            value={valores.confirmarSenha}
            onChangeText={(valor) => alterar('confirmarSenha', valor)}
            onBlur={() => formulario.sair('confirmarSenha')}
            placeholder="Digite sua senha novamente"
            secureTextEntry
          />

          <Text style={styles.terms}>
            Ao criar sua conta, você concorda com nossos{' '}
            <Text style={styles.termsHighlight}>
              termos de uso
            </Text>{' '}
            e nossa{' '}
            <Text style={styles.termsHighlight}>
              política de privacidade
            </Text>
            .
          </Text>

          <MensagemFormulario mensagem={mensagem} />

          <Pressable
            style={[styles.button, enviando && styles.buttonDisabled]}
            onPress={handleCadastro}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Criar conta
              </Text>
            )}
          </Pressable>

        </View>

        <View style={styles.login}>
          <Text style={styles.loginText}>
            Já possui uma conta?{' '}
            <Text style={styles.loginHighlight}>
              Entrar
            </Text>
          </Text>
        </View>

        <Text style={styles.footer}>
          © 2026 · Sistema de Usuários
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  container: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 24,
    justifyContent: 'center',
  },

  logo: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B1B38',
    borderRadius: 24,
  },

  logoIconText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  logoTitle: {
    color: '#E6EDF3',
    fontSize: 24,
    fontWeight: '400',
  },

  card: {
    padding: 24,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 8,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 24,

    elevation: 8,
  },

  cardTitle: {
    marginBottom: 20,
    color: '#E6EDF3',
    fontSize: 20,
    fontWeight: '400',
  },

  terms: {
    marginVertical: 18,
    color: '#8B949E',
    fontSize: 12,
    lineHeight: 18,
  },

  termsHighlight: {
    color: '#A52A4F',
  },

  button: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B1B38',
    borderRadius: 6,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  login: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,
  },

  loginText: {
    color: '#E6EDF3',
    fontSize: 14,
  },

  loginHighlight: {
    color: '#A52A4F',
  },

  footer: {
    marginTop: 24,
    textAlign: 'center',
    color: '#8B949E',
    fontSize: 12,
  },
});
