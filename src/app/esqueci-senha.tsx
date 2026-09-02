import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recuperacaoSenhaService } from '@/services/recuperacaoSenhaService';

export default function EsqueciSenha() {
  const parametros = useLocalSearchParams<{ token?: string }>();
  const [etapa, setEtapa] = useState<'email' | 'senha' | 'sucesso'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (typeof parametros.token === 'string' && parametros.token.length > 0) {
      setToken(parametros.token);
      setEtapa('senha');
      setMensagem('Link validado. Escolha uma nova senha.');
    }
  }, [parametros.token]);

  async function solicitar() {
    if (!email.includes('@')) return setMensagem('Informe um e-mail válido.');
    setCarregando(true); setMensagem('');
    try {
      const resposta = await recuperacaoSenhaService.solicitar(email);
      setMensagem(resposta.mensagem);
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Falha na solicitação.'); }
    finally { setCarregando(false); }
  }

  async function redefinir() {
    if (senha.length < 8) return setMensagem('A senha deve possuir pelo menos 8 caracteres.');
    if (senha !== confirmacao) return setMensagem('As senhas não coincidem.');
    setCarregando(true); setMensagem('');
    try { await recuperacaoSenhaService.redefinir(token, senha); setEtapa('sucesso'); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Falha ao alterar senha.'); }
    finally { setCarregando(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.icon}><Text style={s.star}>✦</Text></View>
    <Text style={s.heading}>{etapa === 'email' ? 'Recuperar senha' : etapa === 'senha' ? 'Crie uma nova senha' : 'Senha alterada'}</Text>
    <View style={s.card}>
      {etapa === 'email' && <><Text style={s.title}>Recuperação de senha</Text><Text style={s.description}>Informe o e-mail cadastrado para iniciar a recuperação.</Text><Label>E-mail</Label><Input value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" /><Message text={mensagem} /><Button label="Enviar instruções" loading={carregando} onPress={solicitar} /></>}
      {etapa === 'senha' && <><Text style={s.title}>Redefinir senha</Text><Text style={s.description}>Use o token recebido e escolha uma nova senha.</Text><Label>Token de recuperação</Label><Input value={token} onChangeText={setToken} placeholder="Cole o token recebido" /><Label>Nova senha</Label><Input value={senha} onChangeText={setSenha} placeholder="Mínimo de 8 caracteres" secureTextEntry /><Label>Confirmar senha</Label><Input value={confirmacao} onChangeText={setConfirmacao} placeholder="Digite novamente" secureTextEntry /><Message text={mensagem} /><Button label="Alterar senha" loading={carregando} onPress={redefinir} /></>}
      {etapa === 'sucesso' && <><Text style={s.success}>✓</Text><Text style={[s.title, s.center]}>Recuperação realizada com sucesso!</Text><Text style={[s.description, s.center]}>Você já pode acessar sua conta com a nova senha.</Text><Button label="Voltar para o login" loading={false} onPress={() => router.replace('/')} /></>}
    </View>
    {etapa !== 'sucesso' && <Pressable style={s.backBox} onPress={() => router.back()}><Text style={s.back}>Voltar para o login</Text></Pressable>}
    <Text style={s.footer}>© 2026 · Sistema de Usuários</Text>
  </ScrollView></SafeAreaView>;
}

function Label({ children }: { children: React.ReactNode }) { return <Text style={s.label}>{children}</Text>; }
function Input(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} autoCapitalize="none" placeholderTextColor="#777B86" style={s.input} />; }
function Message({ text }: { text: string }) { return text ? <Text style={s.message}>{text}</Text> : null; }
function Button({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) { return <Pressable disabled={loading} onPress={onPress} style={s.button}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{label}</Text>}</Pressable>; }

const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#0D1017'},page:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:24},icon:{width:48,height:48,borderRadius:24,backgroundColor:'#931D3F',alignItems:'center',justifyContent:'center'},star:{color:'#fff',fontSize:25},heading:{color:'#F2F2F4',fontSize:24,marginTop:14,marginBottom:24},card:{width:'100%',maxWidth:372,borderWidth:1,borderColor:'#7F1837',borderRadius:7,padding:24},title:{color:'#F2F2F4',fontSize:21,marginBottom:8},description:{color:'#858894',fontSize:13,lineHeight:19,marginBottom:20},label:{color:'#E5E5E8',fontWeight:'700',fontSize:14,marginBottom:7},input:{height:41,borderWidth:1,borderColor:'#7F1837',borderRadius:5,color:'#fff',paddingHorizontal:13,marginBottom:15},button:{height:41,backgroundColor:'#941D3E',borderRadius:5,alignItems:'center',justifyContent:'center',marginTop:5},buttonText:{color:'#fff',fontWeight:'700'},message:{color:'#D98AA2',fontSize:12,marginBottom:8},backBox:{width:'100%',maxWidth:372,borderWidth:1,borderColor:'#7F1837',borderRadius:5,padding:15,marginTop:19},back:{color:'#A92B50',textAlign:'center'},footer:{color:'#676B76',fontSize:12,marginTop:24},success:{color:'#fff',backgroundColor:'#931D3F',width:56,height:56,borderRadius:28,textAlign:'center',fontSize:34,alignSelf:'center',marginBottom:18},center:{textAlign:'center'}});
