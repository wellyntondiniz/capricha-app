import { recuperacaoSenhaService } from '@/services/recuperacaoSenhaService';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMAIL_MAX = 254;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MSG = {
  vazio: 'Informe seu e-mail para continuar.',
  invalido: 'Digite um e-mail válido, por exemplo: voce@exemplo.com.',
  falha: 'Não foi possível concluir a solicitação. Tente novamente em alguns instantes.',
};

type Sucesso = { desafio: string; simulado: boolean };

function validarEmail(valor: string): string | null {
  if (!valor) return MSG.vazio;
  if (valor.length > EMAIL_MAX || !FORMATO_EMAIL.test(valor)) return MSG.invalido;
  return null;
}

export default function EsqueciSenha() {
  const parametros = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof parametros.email === 'string' ? parametros.email : '');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState<Sucesso | null>(null);
  const [carregando, setCarregando] = useState(false);

  function alterarEmail(valor: string) {
    setEmail(valor);
    if (erro) setErro('');
  }

  async function solicitar() {
    if (carregando) return;
    const emailLimpo = email.trim().toLowerCase();
    const problema = validarEmail(emailLimpo);
    if (problema) {
      setErro(problema);
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const resposta = await recuperacaoSenhaService.solicitar(emailLimpo);
      if (!resposta.desafio) {
        setErro(MSG.falha);
        return;
      }
      setSucesso({ desafio: resposta.desafio, simulado: resposta.simulado === true });
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : MSG.falha);
    } finally {
      setCarregando(false);
    }
  }

  function continuar() {
    if (!sucesso) return;
    router.push({
      pathname: '/codigo-recuperacao',
      params: { desafio: sucesso.desafio, simulado: String(sucesso.simulado), canal: 'email' },
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.icon}><Text style={s.star}>✦</Text></View>
        <Text style={s.heading}>{sucesso ? 'Solicitação enviada' : 'Recuperar senha'}</Text>
        <View style={s.card}>
          {sucesso ? (
            <>
              <Text style={s.success}>✓</Text>
              <Text accessibilityLiveRegion="polite" style={[s.title, s.center]}>Solicitação enviada!</Text>
              <Text style={[s.description, s.center]}>
                Se o e-mail informado estiver cadastrado, você receberá em instantes um código de 6 dígitos, válido por 10 minutos. Confira também a caixa de spam.
              </Text>
              <Text style={[s.description, s.center]}>
                Não chegou? Aguarde 1 minuto antes de pedir um novo código.
              </Text>
              {sucesso.simulado && (
                <Text style={[s.description, s.center]}>
                  Modo de teste: nenhum e-mail foi enviado. O código aparece no terminal da API.
                </Text>
              )}
              <Button label="Inserir código" loading={false} onPress={continuar} />
              <Pressable onPress={() => setSucesso(null)}>
                <Text style={[s.back, { marginTop: 20 }]}>Usar outro e-mail</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.title}>Recuperação de senha</Text>
              <Text style={s.description}>
                Informe o e-mail cadastrado. Enviaremos um código de 6 dígitos válido por 10 minutos.
              </Text>
              <Label>E-mail cadastrado</Label>
              <Input
                accessibilityLabel="E-mail cadastrado"
                value={email}
                onChangeText={alterarEmail}
                placeholder="voce@exemplo.com"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={solicitar}
                invalid={!!erro}
              />
              <Message text={erro} />
              <Button label="Enviar código por e-mail" loading={carregando} onPress={solicitar} />
              <Pressable onPress={() => router.push('/cadastro')}>
                <Text style={[s.back, { marginTop: 20 }]}>Ainda não tenho conta — cadastrar</Text>
              </Pressable>
            </>
          )}
        </View>
        <Pressable style={s.backBox} onPress={() => router.replace('/')}>
          <Text style={s.back}>Voltar para o login</Text>
        </Pressable>
        <Text style={s.footer}>© 2026 · Sistema de Usuários</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

function Input({ invalid, ...props }: React.ComponentProps<typeof TextInput> & { invalid?: boolean }) {
  return (
    <TextInput
      {...props}
      autoCapitalize="none"
      autoCorrect={false}
      placeholderTextColor="#777B86"
      style={[s.input, invalid && s.inputErro]}
    />
  );
}

function Message({ text }: { text: string }) {
  return text ? (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.message}>{text}</Text>
  ) : null;
}

function Button({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={s.button}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1017' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#931D3F', alignItems: 'center', justifyContent: 'center' },
  star: { color: '#fff', fontSize: 25 },
  heading: { color: '#F2F2F4', fontSize: 24, marginTop: 14, marginBottom: 24 },
  card: { width: '100%', maxWidth: 372, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 24 },
  title: { color: '#F2F2F4', fontSize: 21, marginBottom: 8 },
  description: { color: '#858894', fontSize: 13, lineHeight: 19, marginBottom: 20 },
  label: { color: '#E5E5E8', fontWeight: '700', fontSize: 14, marginBottom: 7 },
  input: { height: 41, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, color: '#fff', paddingHorizontal: 13, marginBottom: 15 },
  inputErro: { borderColor: '#FF8FA3' },
  button: { height: 41, backgroundColor: '#941D3E', borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  buttonText: { color: '#fff', fontWeight: '700' },
  message: { color: '#FF8FA3', fontSize: 13, lineHeight: 18, marginTop: -6, marginBottom: 12 },
  backBox: { width: '100%', maxWidth: 372, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, padding: 15, marginTop: 19 },
  back: { color: '#A92B50', textAlign: 'center' },
  footer: { color: '#676B76', fontSize: 12, marginTop: 24 },
  success: { color: '#fff', backgroundColor: '#931D3F', width: 56, height: 56, borderRadius: 28, overflow: 'hidden', textAlign: 'center', lineHeight: 56, fontSize: 34, alignSelf: 'center', marginBottom: 18 },
  center: { textAlign: 'center' },
});