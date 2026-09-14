import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { salvarUsuario } from '@/services/usuarioService';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  function emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleCadastro() {
    if (!nome || !email || !senha || !confirmarSenha) {
      console.error("Preencha todos os campos!");
      return;
    }

    else if (nome.trim().length === 0) {
      console.error("Nome inválido!");
      return;
    }

    else if (senha.trim().length !== senha.length) {
      console.error("Senha inválida!");
      return;
    }

    if (!emailValido(email)) {
      console.error("Digite um e-mail válido!");
      return;
    }

    if (senha !== confirmarSenha) {
      console.error("Erro: as senhas não coincidem!");
      return;
    }

    try {
      const usuario = await salvarUsuario({
        nome,
        email,
        senha,
        ativo: true,
      });

      console.info("Sucesso: usuario cadastrado com sucesso!");

      setNome('');
      setEmail('');
      setSenha('');
      setConfirmarSenha('');
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Não foi possível cadastrar o usuário.');
      }
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

          <View style={styles.field}>
            <Text style={styles.label}>
              Nome de usuário
            </Text>

            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="ex: joao_silva"
              placeholderTextColor="#8B949E"
              autoCapitalize="none"
            />

            <Text style={styles.hint}>
              Use um nome único para sua conta.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              E-mail
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="voce@exemplo.com"
              placeholderTextColor="#8B949E"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Senha
            </Text>

            <TextInput
              style={styles.input}
              value={senha}
              onChangeText={setSenha}
              placeholder="Digite sua senha"
              placeholderTextColor="#8B949E"
              secureTextEntry
            />

            <Text style={styles.hint}>
              Sua senha deve possuir pelo menos 8 caracteres.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Confirmar senha
            </Text>

            <TextInput
              style={styles.input}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Digite sua senha novamente"
              placeholderTextColor="#8B949E"
              secureTextEntry
            />
          </View>

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

          <Pressable
            style={styles.button}
            onPress={handleCadastro}
          >
            <Text style={styles.buttonText}>
              Criar conta
            </Text>
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

  field: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 6,
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    width: '100%',
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,

    backgroundColor: '#0D1117',
    color: '#E6EDF3',

    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,

    fontSize: 14,
  },

  hint: {
    marginTop: 5,
    color: '#8B949E',
    fontSize: 12,
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