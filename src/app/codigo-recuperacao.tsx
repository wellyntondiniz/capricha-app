import { recuperacaoSenhaService } from '@/services/recuperacaoSenhaService';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CodigoRecuperacao() {
  const { desafio, simulado, canal } = useLocalSearchParams<{ desafio?: string; simulado?: string; canal?: string }>();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [validado, setValidado] = useState(false);
  async function validarCodigo() {
    if (!desafio) return setMensagem('Primeiro solicite um código de recuperação.');
    if (!/^\d{6}$/.test(codigo)) return setMensagem('Digite o código de 6 números.');
    setCarregando(true); setMensagem('');
    try {
      if (canal === 'email') await recuperacaoSenhaService.validarCodigo(desafio, codigo);
      setValidado(true); setMensagem('Código validado. Defina uma nova senha.');
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Código inválido.'); }
    finally { setCarregando(false); }
  }
  async function alterar() {
    if (carregando) return;
    if (!desafio) return setMensagem('Primeiro solicite um código de recuperação.');
    if (!/^\d{6}$/.test(codigo)) return setMensagem('Digite o código de 6 números.');
    if (senha.length < 8 || senha.length > 128) return setMensagem('Use entre 8 e 128 caracteres na senha.');
    if (senha !== confirmacao) return setMensagem('As senhas não coincidem.');
    setCarregando(true); setMensagem('');
    try {
      await recuperacaoSenhaService.redefinir(desafio, codigo, senha);
      setCodigo(''); setSenha(''); setConfirmacao(''); setSucesso(true);
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Não foi possível alterar a senha.'); }
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
        <Text style={s.label}>Código de 6 números</Text>
        <TextInput accessibilityLabel="Código de 6 números" style={s.input} value={codigo} onChangeText={v => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" placeholder="000000" placeholderTextColor="#8B949E" />
        {!validado && <Pressable disabled={carregando || !desafio} style={s.button} onPress={validarCodigo}>{carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Validar código</Text>}</Pressable>}
        {validado && <><Text style={[s.label, {marginTop: 16}]}>Nova senha</Text>
        <CampoSenha accessibilityLabel="Nova senha" value={senha} onChangeText={setSenha} placeholder="Mínimo de 8 caracteres" />
        <Text style={s.label}>Confirmar nova senha</Text>
        <CampoSenha accessibilityLabel="Confirmar nova senha" value={confirmacao} onChangeText={setConfirmacao} placeholder="Digite novamente" />
        {!!mensagem && <Text accessibilityLiveRegion="polite" style={s.message}>{mensagem}</Text>}
        <Pressable disabled={carregando || !desafio} style={s.button} onPress={alterar}>{carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Alterar senha</Text>}</Pressable></>}
        <Pressable disabled={carregando} onPress={() => router.replace('/esqueci-senha')}><Text style={s.link}>Solicitar outro código</Text></Pressable>
        <Text style={s.description}>Aguarde 60 segundos entre envios. Até 3 solicitações a cada 15 minutos. Use o código correspondente à solicitação desta tela.</Text>
      </>}
    </View><Text style={s.footer}>© 2026 · Sistema de Usuários</Text>
  </ScrollView></SafeAreaView>;
}
type CampoSenhaProps = {
  accessibilityLabel: string;
  value: string;
  onChangeText: (texto: string) => void;
  placeholder: string;
};

// Campo de senha com botão para revelar/ocultar. Começa oculto e cada campo controla o próprio estado.
function CampoSenha({ accessibilityLabel, value, onChangeText, placeholder }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  return (
    <View style={s.senhaBox}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        style={s.senhaInput}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visivel}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor="#8B949E"
        maxLength={128}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visivel ? 'Ocultar senha' : 'Revelar senha'}
        onPress={() => setVisivel(v => !v)}
        hitSlop={8}
        style={s.senhaToggle}
      >
        <Text style={s.senhaToggleText}>{visivel ? 'Ocultar' : 'Mostrar'}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1117' }, page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7B1B38', alignItems: 'center', justifyContent: 'center' }, star: { color: '#fff', fontSize: 25 },
  heading: { color: '#E6EDF3', fontSize: 24, marginTop: 14, marginBottom: 24 }, card: { width: '100%', maxWidth: 372, padding: 24, borderWidth: 1, borderColor: '#7B1B38', borderRadius: 8 },
  title: { color: '#E6EDF3', fontSize: 20, marginBottom: 12 }, description: { color: '#8B949E', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  label: { color: '#E6EDF3', fontWeight: '600', marginBottom: 6 }, input: { height: 41, borderWidth: 1, borderColor: '#7B1B38', borderRadius: 6, color: '#fff', paddingHorizontal: 12, marginBottom: 16 },
  button: { height: 42, backgroundColor: '#7B1B38', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontWeight: '600' },
  senhaBox: { flexDirection: 'row', alignItems: 'center', height: 41, borderWidth: 1, borderColor: '#7B1B38', borderRadius: 6, marginBottom: 16 },
  senhaInput: { flex: 1, height: '100%', color: '#fff', paddingHorizontal: 12 },
  senhaToggle: { paddingHorizontal: 12, height: '100%', justifyContent: 'center' }, senhaToggleText: { color: '#D98AA2', fontSize: 13, fontWeight: '600' },
  link: { color: '#D98AA2', textAlign: 'center', marginVertical: 18 }, message: { color: '#F0A7B8', marginBottom: 14 }, footer: { color: '#8B949E', fontSize: 12, marginTop: 24 },
});