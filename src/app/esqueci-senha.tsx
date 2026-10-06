import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoFormulario } from '@/components/campo-formulario';
import { Mensagem, MensagemFormulario } from '@/components/mensagem-formulario';
import { MENSAGEM_CORRIJA_CAMPOS } from '@/constants/formulario';
import { useFormulario } from '@/hooks/use-formulario';
import { ErroApi } from '@/services/erro-api';
import { recuperacaoSenhaService } from '@/services/recuperacaoSenhaService';
import { validarEmail } from '@/utils/validacao';

type Campo = 'email';

export default function EsqueciSenha() {
  const parametros = useLocalSearchParams<{ email?: string }>();
  const formulario = useFormulario<Campo>(
    { email: typeof parametros.email === 'string' ? parametros.email : '' },
    (_campo, valores) => validarEmail(valores.email),
  );
  const { valores, erros } = formulario;
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [carregando, setCarregando] = useState(false);

  async function solicitar() {
    if (carregando) return;
    setMensagem(null);
    if (!formulario.validarCampos()) {
      setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      return;
    }

    setCarregando(true);
    try {
      const resposta = await recuperacaoSenhaService.solicitar(valores.email.trim().toLowerCase());
      setMensagem({ texto: resposta.mensagem, tipo: 'info' });
      if (resposta.desafio) router.push({ pathname: '/codigo-recuperacao', params: {
        desafio: resposta.desafio, simulado: String(resposta.simulado), canal: 'email',
      } });
    } catch (erro) {
      if (erro instanceof ErroApi && formulario.definirErros(erro.campos)) {
        setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      } else {
        setMensagem({ texto: erro instanceof Error ? erro.message : 'Falha na solicitação.', tipo: 'erro' });
      }
    } finally { setCarregando(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.icon}><Text style={s.star}>✦</Text></View>
    <Text style={s.heading}>Recuperar senha</Text>
    <View style={s.card}>
      <Text style={s.title}>Recuperação de senha</Text>
      <Text style={s.description}>Informe o e-mail cadastrado. Enviaremos um código de 6 dígitos válido por 10 minutos. No modo local, o código aparece no terminal da API.</Text>
      <CampoFormulario
        rotulo="E-mail cadastrado"
        erro={erros.email}
        value={valores.email}
        onChangeText={(valor) => { formulario.alterar('email', valor); setMensagem(null); }}
        onBlur={() => formulario.sair('email')}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <MensagemFormulario mensagem={mensagem} />
      <Pressable disabled={carregando} onPress={solicitar} style={[s.button, carregando && s.buttonDisabled]}>
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Enviar código por e-mail</Text>}
      </Pressable>
      <Pressable onPress={() => router.push('/cadastro')}><Text style={[s.back, { marginTop: 20 }]}>Ainda não tenho conta — cadastrar</Text></Pressable>
    </View>
    <Pressable style={s.backBox} onPress={() => router.replace('/')}><Text style={s.back}>Voltar para o login</Text></Pressable>
    <Text style={s.footer}>© 2026 · Sistema de Usuários</Text>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#0D1017'},page:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:24},icon:{width:48,height:48,borderRadius:24,backgroundColor:'#931D3F',alignItems:'center',justifyContent:'center'},star:{color:'#fff',fontSize:25},heading:{color:'#F2F2F4',fontSize:24,marginTop:14,marginBottom:24},card:{width:'100%',maxWidth:372,borderWidth:1,borderColor:'#7F1837',borderRadius:7,padding:24},title:{color:'#F2F2F4',fontSize:21,marginBottom:8},description:{color:'#858894',fontSize:13,lineHeight:19,marginBottom:20},button:{height:41,backgroundColor:'#941D3E',borderRadius:5,alignItems:'center',justifyContent:'center',marginTop:5},buttonDisabled:{opacity:0.6},buttonText:{color:'#fff',fontWeight:'700'},backBox:{width:'100%',maxWidth:372,borderWidth:1,borderColor:'#7F1837',borderRadius:5,padding:15,marginTop:19},back:{color:'#A92B50',textAlign:'center'},footer:{color:'#676B76',fontSize:12,marginTop:24}});
