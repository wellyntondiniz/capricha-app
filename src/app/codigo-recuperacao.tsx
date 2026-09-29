import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFormulario } from '@/components/campo-formulario';
import { Mensagem, MensagemFormulario } from '@/components/mensagem-formulario';
import { MENSAGEM_CORRIJA_CAMPOS } from '@/constants/formulario';
import { useFormulario } from '@/hooks/use-formulario';
import { ErroApi } from '@/services/erro-api';
import { recuperacaoSenhaService } from '@/services/recuperacaoSenhaService';
import { validarCodigo, validarConfirmacaoSenha, validarSenha } from '@/utils/validacao';

// Os nomes seguem os campos da API, para que os erros dela caiam no campo certo.
type Campo = 'codigo' | 'novaSenha' | 'confirmacao';

function validarCampo(campo: Campo, valores: Record<Campo, string>): string | undefined {
  switch (campo) {
    case 'codigo':
      return validarCodigo(valores.codigo);
    case 'novaSenha':
      return validarSenha(valores.novaSenha);
    case 'confirmacao':
      return validarConfirmacaoSenha(valores.confirmacao, valores.novaSenha);
  }
}

const SEM_DESAFIO = 'Primeiro solicite um código de recuperação.';

export default function CodigoRecuperacao() {
  const { desafio, simulado, canal } = useLocalSearchParams<{ desafio?: string; simulado?: string; canal?: string }>();
  const formulario = useFormulario<Campo>(
    { codigo: '', novaSenha: '', confirmacao: '' },
    validarCampo,
    { novaSenha: ['confirmacao'] },
  );
  const { valores, erros } = formulario;
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [validado, setValidado] = useState(false);

  function alterar(campo: Campo, valor: string) {
    formulario.alterar(campo, valor);
    setMensagem(null);
  }

  // Erros da API: vão para o campo correspondente; sem campo, para `campoPadrao` ou a mensagem geral.
  function tratarErro(erro: unknown, padrao: string, campoPadrao?: Campo) {
    if (erro instanceof ErroApi && formulario.definirErros(erro.campos)) {
      setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
    } else if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500 && campoPadrao) {
      formulario.definirErros({ [campoPadrao]: erro.message });
    } else {
      setMensagem({ texto: erro instanceof Error ? erro.message : padrao, tipo: 'erro' });
    }
  }

  async function validarCodigoInformado() {
    if (carregando) return;
    setMensagem(null);
    if (!desafio) return setMensagem({ texto: SEM_DESAFIO, tipo: 'erro' });
    if (!formulario.validarCampos(['codigo'])) return;

    setCarregando(true);
    try {
      if (canal === 'email') await recuperacaoSenhaService.validarCodigo(desafio, valores.codigo);
      setValidado(true);
      setMensagem({ texto: 'Código validado. Defina uma nova senha.', tipo: 'sucesso' });
    } catch (erro) { tratarErro(erro, 'Código inválido.', 'codigo'); }
    finally { setCarregando(false); }
  }

  async function alterarSenha() {
    if (carregando) return;
    setMensagem(null);
    if (!desafio) return setMensagem({ texto: SEM_DESAFIO, tipo: 'erro' });
    if (!formulario.validarCampos()) {
      setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      return;
    }

    setCarregando(true);
    try {
      await recuperacaoSenhaService.redefinir(desafio, valores.codigo, valores.novaSenha);
      formulario.limpar();
      setSucesso(true);
    } catch (erro) { tratarErro(erro, 'Não foi possível alterar a senha.'); }
    finally { setCarregando(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.icon}><Text style={s.star}>✦</Text></View>
    <Text style={s.heading}>{sucesso ? 'Senha alterada' : 'Confirme seu código'}</Text>
    <View style={s.card}>
      {sucesso ? <><Text accessibilityLiveRegion="polite" style={s.title}>Senha alterada com sucesso!</Text><Text style={s.description}>A senha anterior foi substituída. O código não poderá ser usado novamente.</Text><Pressable style={s.button} onPress={() => router.replace('/')}><Text style={s.buttonText}>Voltar para o login</Text></Pressable></> : <>
        <Text style={s.title}>Código e nova senha</Text>
        <Text style={s.description}>{simulado === 'true'
          ? 'MODO DE TESTE: nenhum e-mail foi enviado. Se a conta estiver cadastrada, procure “E-MAIL SIMULADO” no terminal da API.'
          : 'O código foi solicitado por e-mail. Confira também a pasta de spam.'}</Text>
        <Text style={s.description}>Validade: 10 minutos. Limite: 5 tentativas. A nova senha deve ser diferente da anterior.</Text>
        <CampoFormulario
          rotulo="Código de 6 números"
          erro={erros.codigo}
          value={valores.codigo}
          onChangeText={(v) => alterar('codigo', v.replace(/\D/g, '').slice(0, 6))}
          onBlur={() => formulario.sair('codigo')}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="000000"
        />
        {!validado && <>
          <MensagemFormulario mensagem={mensagem} />
          <Pressable disabled={carregando} style={[s.button, carregando && s.buttonDisabled]} onPress={validarCodigoInformado}>{carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Validar código</Text>}</Pressable>
        </>}
        {validado && <>
          <CampoFormulario
            rotulo="Nova senha"
            erro={erros.novaSenha}
            dica="Mínimo de 8 caracteres."
            value={valores.novaSenha}
            onChangeText={(v) => alterar('novaSenha', v)}
            onBlur={() => formulario.sair('novaSenha')}
            secureTextEntry
            placeholder="Digite a nova senha"
            maxLength={128}
          />
          <CampoFormulario
            rotulo="Confirmar nova senha"
            erro={erros.confirmacao}
            value={valores.confirmacao}
            onChangeText={(v) => alterar('confirmacao', v)}
            onBlur={() => formulario.sair('confirmacao')}
            secureTextEntry
            placeholder="Digite novamente"
            maxLength={128}
          />
          <MensagemFormulario mensagem={mensagem} />
          <Pressable disabled={carregando} style={[s.button, carregando && s.buttonDisabled]} onPress={alterarSenha}>{carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Alterar senha</Text>}</Pressable>
        </>}
        <Pressable disabled={carregando} onPress={() => router.replace('/esqueci-senha')}><Text style={s.link}>Solicitar outro código</Text></Pressable>
        <Text style={s.description}>Aguarde 60 segundos entre envios. Até 3 solicitações a cada 15 minutos. Use o código correspondente à solicitação desta tela.</Text>
      </>}
    </View><Text style={s.footer}>© 2026 · Sistema de Usuários</Text>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1117' }, page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7B1B38', alignItems: 'center', justifyContent: 'center' }, star: { color: '#fff', fontSize: 25 },
  heading: { color: '#E6EDF3', fontSize: 24, marginTop: 14, marginBottom: 24 }, card: { width: '100%', maxWidth: 372, padding: 24, borderWidth: 1, borderColor: '#7B1B38', borderRadius: 8 },
  title: { color: '#E6EDF3', fontSize: 20, marginBottom: 12 }, description: { color: '#8B949E', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  button: { height: 42, backgroundColor: '#7B1B38', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, buttonDisabled: { opacity: 0.6 }, buttonText: { color: '#fff', fontWeight: '600' },
  link: { color: '#D98AA2', textAlign: 'center', marginVertical: 18 }, footer: { color: '#8B949E', fontSize: 12, marginTop: 24 },
});
