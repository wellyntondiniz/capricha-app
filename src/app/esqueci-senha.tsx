import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recuperacaoSenhaService } from '@/services/recuperacaoSenhaService';

export default function EsqueciSenha() {
  const parametros = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof parametros.email === 'string' ? parametros.email : '');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function solicitar() {
    if (!email.includes('@')) return setMensagem('Informe um e-mail válido.');
    setCarregando(true); setMensagem('');
    try {
      const resposta = await recuperacaoSenhaService.solicitar(email.trim().toLowerCase());
      setMensagem(resposta.mensagem);
      if (resposta.desafio) router.push({ pathname: '/codigo-recuperacao', params: {
        desafio: resposta.desafio, simulado: String(resposta.simulado), canal: 'email',
      } });
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Falha na solicitação.'); }
    finally { setCarregando(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.icon}><Text style={s.star}>✦</Text></View>
    <Text style={s.heading}>Recuperar senha</Text>
    <View style={s.card}>
      <><Text style={s.title}>Recuperação de senha</Text><Text style={s.description}>Informe o e-mail cadastrado. Enviaremos um código de 6 dígitos válido por 10 minutos. No modo local, o código aparece no terminal da API.</Text><Label>E-mail cadastrado</Label><Input value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" /><Message text={mensagem} /><Button label="Enviar código por e-mail" loading={carregando} onPress={solicitar} /><Pressable onPress={() => router.push('/cadastro')}><Text style={[s.back, { marginTop: 20 }]}>Ainda não tenho conta — cadastrar</Text></Pressable></>
    </View>
    <Pressable style={s.backBox} onPress={() => router.replace('/')}><Text style={s.back}>Voltar para o login</Text></Pressable>
    <Text style={s.footer}>© 2026 · Sistema de Usuários</Text>
  </ScrollView></SafeAreaView>;
}

function Label({ children }: { children: React.ReactNode }) { return <Text style={s.label}>{children}</Text>; }
function Input(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} autoCapitalize="none" placeholderTextColor="#777B86" style={s.input} />; }
function Message({ text }: { text: string }) { return text ? <Text style={s.message}>{text}</Text> : null; }
function Button({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) { return <Pressable disabled={loading} onPress={onPress} style={s.button}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{label}</Text>}</Pressable>; }

const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#0D1017'},page:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:24},icon:{width:48,height:48,borderRadius:24,backgroundColor:'#931D3F',alignItems:'center',justifyContent:'center'},star:{color:'#fff',fontSize:25},heading:{color:'#F2F2F4',fontSize:24,marginTop:14,marginBottom:24},card:{width:'100%',maxWidth:372,borderWidth:1,borderColor:'#7F1837',borderRadius:7,padding:24},title:{color:'#F2F2F4',fontSize:21,marginBottom:8},description:{color:'#858894',fontSize:13,lineHeight:19,marginBottom:20},label:{color:'#E5E5E8',fontWeight:'700',fontSize:14,marginBottom:7},input:{height:41,borderWidth:1,borderColor:'#7F1837',borderRadius:5,color:'#fff',paddingHorizontal:13,marginBottom:15},button:{height:41,backgroundColor:'#941D3E',borderRadius:5,alignItems:'center',justifyContent:'center',marginTop:5},buttonText:{color:'#fff',fontWeight:'700'},message:{color:'#D98AA2',fontSize:12,marginBottom:8},backBox:{width:'100%',maxWidth:372,borderWidth:1,borderColor:'#7F1837',borderRadius:5,padding:15,marginTop:19},back:{color:'#A92B50',textAlign:'center'},footer:{color:'#676B76',fontSize:12,marginTop:24},success:{color:'#fff',backgroundColor:'#931D3F',width:56,height:56,borderRadius:28,textAlign:'center',fontSize:34,alignSelf:'center',marginBottom:18},center:{textAlign:'center'}});
