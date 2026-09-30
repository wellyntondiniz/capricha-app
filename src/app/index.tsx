import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFormulario } from '@/components/campo-formulario';
import { Mensagem, MensagemFormulario } from '@/components/mensagem-formulario';
import { MENSAGEM_CORRIJA_CAMPOS } from '@/constants/formulario';
import { useFormulario } from '@/hooks/use-formulario';
import { ErroApi } from '@/services/erro-api';
import { entrar } from '@/services/usuarioService';
import { obrigatorio, validarEmail } from '@/utils/validacao';

type Campo = 'email' | 'senha';

function validarCampo(campo: Campo, valores: Record<Campo, string>): string | undefined {
  switch (campo) {
    case 'email':
      return validarEmail(valores.email);
    case 'senha':
      // No login só exige a senha preenchida; as regras de formato valem no cadastro.
      return obrigatorio(valores.senha, 'Informe a senha.');
  }
}

export default function LoginScreen() {
  const formulario = useFormulario<Campo>({ email: '', senha: '' }, validarCampo);
  const { valores, erros } = formulario;
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  function alterar(campo: Campo, valor: string) {
    formulario.alterar(campo, valor);
    setMensagem(null);
  }

  async function handleLogin() {
    if (enviando) return;
    setMensagem(null);

    if (!formulario.validarCampos()) {
      setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      return;
    }

    setEnviando(true);
    try {
      const usuario = await entrar(valores.email.trim(), valores.senha);
      formulario.limpar();
      setMensagem({ texto: `Login realizado. Bem-vindo(a), ${usuario.nome}!`, tipo: 'sucesso' });
    } catch (erro) {
      if (erro instanceof ErroApi && formulario.definirErros(erro.campos)) {
        setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      } else {
        setMensagem({ texto: erro instanceof Error ? erro.message : 'Não foi possível entrar.', tipo: 'erro' });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Text style={styles.star}>✦</Text></View>
        <Text style={styles.heading}>Acesse sua conta</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Login de usuário</Text>

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
            value={valores.senha}
            onChangeText={(valor) => alterar('senha', valor)}
            onBlur={() => formulario.sair('senha')}
            onSubmitEditing={handleLogin}
            placeholder="Digite sua senha"
            secureTextEntry
          />

          <Pressable onPress={() => router.push('/esqueci-senha')}>
            <Text style={styles.forgot}>Esqueceu sua senha?</Text>
          </Pressable>

          <MensagemFormulario mensagem={mensagem} />

          <Pressable
            style={[styles.button, enviando && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={enviando}
          >
            {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </Pressable>
        </View>

        <Pressable style={styles.secondaryBox} onPress={() => router.push('/cadastro')}>
          <Text style={styles.secondaryText}>Não possui uma conta? <Text style={styles.link}>Criar conta</Text></Text>
        </Pressable>

        <Text style={styles.footer}>© 2026 · Sistema de Usuários</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1017' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 42 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#931D3F', alignItems: 'center', justifyContent: 'center' },
  star: { color: '#FFFFFF', fontSize: 25 },
  heading: { color: '#F2F2F4', fontSize: 24, fontWeight: '400', marginTop: 14, marginBottom: 24 },
  card: { width: '100%', maxWidth: 372, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 24 },
  title: { color: '#F2F2F4', fontSize: 21, fontWeight: '400', marginBottom: 21 },
  forgot: { color: '#A92B50', fontSize: 13, textAlign: 'right', marginTop: -3, marginBottom: 17 },
  button: { height: 41, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryBox: { width: '100%', maxWidth: 372, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingVertical: 15, marginTop: 19 },
  secondaryText: { color: '#E2E2E5', textAlign: 'center', fontSize: 13 },
  link: { color: '#A92B50' },
  footer: { color: '#676B76', fontSize: 12, marginTop: 24 },
});
