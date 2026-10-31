import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import {
  consultarAvaliacao,
  enviarAvaliacao,
  type RespostasAvaliacao,
} from '@/services/avaliacaoAplicativoService';

type CampoAvaliacao = Exclude<keyof RespostasAvaliacao, 'comentario'>;

const PERGUNTAS: { campo: CampoAvaliacao; texto: string }[] = [
  { campo: 'navegacao', texto: 'Navegar pelo aplicativo foi simples e sem complicações.' },
  { campo: 'clarezaInformacoes', texto: 'As informações apresentadas no app foram fáceis de entender.' },
  { campo: 'utilidadeFuncionalidades', texto: 'As funcionalidades do aplicativo foram úteis durante o evento.' },
  { campo: 'desempenhoTecnico', texto: 'O aplicativo teve um ótimo desempenho técnico.' },
  { campo: 'recomendacao', texto: 'Eu recomendaria este aplicativo para futuros eventos da faculdade.' },
];

const OPCOES = [
  { valor: 1, emoji: '😄', rotulo: 'Muito bom' },
  { valor: 2, emoji: '🙂', rotulo: 'Bom' },
  { valor: 3, emoji: '😐', rotulo: 'Regular' },
  { valor: 4, emoji: '🙁', rotulo: 'Ruim' },
  { valor: 5, emoji: '😞', rotulo: 'Muito ruim' },
];

export default function AvaliarAplicativoScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [respostas, setRespostas] = useState<Partial<Record<CampoAvaliacao, number>>>({});
  const [comentario, setComentario] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [respondida, setRespondida] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const totalRespondidas = useMemo(
    () => PERGUNTAS.filter(({ campo }) => respostas[campo] !== undefined).length,
    [respostas],
  );

  useEffect(() => {
    let ativo = true;
    async function consultar() {
      if (!usuario?.token) {
        if (ativo) {
          setErro('Sua sessão expirou. Faça login novamente.');
          setCarregando(false);
        }
        return;
      }
      try {
        const jaRespondida = await consultarAvaliacao(usuario.token);
        if (ativo) setRespondida(jaRespondida);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar a avaliação.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void consultar();
    return () => { ativo = false; };
  }, [usuario?.token]);

  function selecionar(campo: CampoAvaliacao, valor: number) {
    setRespostas((atuais) => ({ ...atuais, [campo]: valor }));
    setErro('');
  }

  async function enviar() {
    if (!usuario?.token || enviando) return;
    if (totalRespondidas !== PERGUNTAS.length) {
      setErro('Responda todas as perguntas antes de enviar.');
      return;
    }

    setErro('');
    setEnviando(true);
    try {
      const texto = await enviarAvaliacao(usuario.token, {
        navegacao: respostas.navegacao!,
        clarezaInformacoes: respostas.clarezaInformacoes!,
        utilidadeFuncionalidades: respostas.utilidadeFuncionalidades!,
        desempenhoTecnico: respostas.desempenhoTecnico!,
        recomendacao: respostas.recomendacao!,
        comentario: comentario.trim() || undefined,
      });
      setMensagem(texto);
      setRespondida(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.voltar}>
              <Ionicons name="arrow-back" size={24} color={Cores.texto} />
            </Pressable>
            <View style={styles.headerTextos}>
              <Text accessibilityRole="header" style={styles.titulo}>Avaliar aplicativo</Text>
              <Text style={styles.subtitulo}>Sua opinião ajuda a melhorar a experiência dos próximos eventos.</Text>
            </View>
          </View>

          {carregando ? (
            <View style={styles.estado}>
              <ActivityIndicator size="large" color={Cores.destaque} />
              <Text style={styles.estadoTexto}>Carregando avaliação...</Text>
            </View>
          ) : respondida ? (
            <View style={styles.sucessoCard}>
              <View style={styles.sucessoIcone}>
                <Ionicons name="checkmark" size={38} color="#34D399" />
              </View>
              <Text style={styles.sucessoTitulo}>Avaliação enviada!</Text>
              <Text style={styles.sucessoTexto}>{mensagem || 'Você já respondeu à avaliação. Obrigado pela participação!'}</Text>
              <Pressable onPress={() => router.replace('/(tabs)/home')} style={styles.botaoPrincipal}>
                <Text style={styles.botaoPrincipalTexto}>Voltar para o início</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.instrucaoCard}>
                <Ionicons name="information-circle-outline" size={23} color={Cores.destaque} />
                <View style={styles.instrucaoTextos}>
                  <Text style={styles.instrucaoTitulo}>Conte como foi sua experiência</Text>
                  <Text style={styles.instrucaoTexto}>Escolha a opção que melhor representa sua opinião em cada afirmação.</Text>
                </View>
                <Text style={styles.contador}>{totalRespondidas}/{PERGUNTAS.length}</Text>
              </View>

              {PERGUNTAS.map((pergunta, indice) => (
                <View key={pergunta.campo} style={styles.perguntaCard}>
                  <View style={styles.perguntaCabecalho}>
                    <View style={styles.numero}><Text style={styles.numeroTexto}>{indice + 1}</Text></View>
                    <Text style={styles.perguntaTexto}>{pergunta.texto}</Text>
                  </View>

                  <View accessibilityRole="radiogroup" style={styles.opcoes}>
                    {OPCOES.map((opcao) => {
                      const selecionada = respostas[pergunta.campo] === opcao.valor;
                      return (
                        <Pressable
                          key={opcao.valor}
                          accessibilityRole="radio"
                          accessibilityLabel={`${opcao.rotulo}, valor ${opcao.valor}`}
                          accessibilityState={{ selected: selecionada }}
                          onPress={() => selecionar(pergunta.campo, opcao.valor)}
                          style={({ pressed }) => [
                            styles.opcao,
                            selecionada && styles.opcaoSelecionada,
                            pressed && styles.pressionado,
                          ]}>
                          <Text style={styles.emoji}>{opcao.emoji}</Text>
                          <Text style={[styles.opcaoTexto, selecionada && styles.opcaoTextoSelecionado]}>{opcao.rotulo}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.comentarioCard}>
                <Text style={styles.comentarioTitulo}>Deseja deixar algum comentário ou sugestão?</Text>
                <Text style={styles.comentarioOpcional}>Opcional</Text>
                <TextInput
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Escreva aqui..."
                  placeholderTextColor={Cores.inativo}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={styles.comentarioInput}
                />
                <Text style={styles.caracteres}>{comentario.length}/1000</Text>
              </View>

              {!!erro && (
                <View style={styles.erroCard}>
                  <Ionicons name="alert-circle-outline" size={20} color="#FB7185" />
                  <Text style={styles.erroTexto}>{erro}</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={enviando}
                onPress={enviar}
                style={({ pressed }) => [styles.botaoPrincipal, pressed && styles.pressionado, enviando && styles.desabilitado]}>
                {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.botaoPrincipalTexto}>Enviar avaliação</Text>}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  scroll: { flexGrow: 1, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  voltar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  headerTextos: { flex: 1, gap: 5 },
  titulo: { color: Cores.texto, fontSize: 28, fontWeight: '800' },
  subtitulo: { color: Cores.textoSuave, fontSize: 15, lineHeight: 21 },
  estado: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 14 },
  estadoTexto: { color: Cores.textoSuave, fontSize: 15 },
  instrucaoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: Cores.vinhoSuave, borderWidth: 1, borderColor: Cores.vinhoClaro },
  instrucaoTextos: { flex: 1, gap: 3 },
  instrucaoTitulo: { color: Cores.texto, fontSize: 15, fontWeight: '800' },
  instrucaoTexto: { color: Cores.textoSuave, fontSize: 13, lineHeight: 18 },
  contador: { color: Cores.destaque, fontSize: 14, fontWeight: '800' },
  perguntaCard: { padding: 18, gap: 18, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  perguntaCabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinhoSuave },
  numeroTexto: { color: Cores.destaque, fontSize: 14, fontWeight: '800' },
  perguntaTexto: { flex: 1, color: Cores.texto, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  opcoes: { flexDirection: 'row', gap: 7 },
  opcao: { flex: 1, minWidth: 52, minHeight: 88, paddingVertical: 10, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: Cores.superficieAlta, borderWidth: 1, borderColor: Cores.borda },
  opcaoSelecionada: { backgroundColor: Cores.vinho, borderColor: Cores.destaque, shadowColor: Cores.destaque, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  emoji: { fontSize: 27 },
  opcaoTexto: { color: Cores.textoSuave, fontSize: 10, lineHeight: 13, textAlign: 'center', fontWeight: '700' },
  opcaoTextoSelecionado: { color: '#FFFFFF' },
  comentarioCard: { padding: 18, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  comentarioTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '700', paddingRight: 70 },
  comentarioOpcional: { position: 'absolute', top: 18, right: 18, color: Cores.destaque, fontSize: 12, fontWeight: '700' },
  comentarioInput: { minHeight: 120, marginTop: 14, padding: 14, borderRadius: 12, color: Cores.texto, backgroundColor: Cores.superficieAlta, borderWidth: 1, borderColor: Cores.borda, fontSize: 15 },
  caracteres: { marginTop: 7, color: Cores.textoSuave, fontSize: 11, textAlign: 'right' },
  erroCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: 'rgba(251,113,133,0.10)', borderWidth: 1, borderColor: 'rgba(251,113,133,0.30)' },
  erroTexto: { flex: 1, color: '#FB7185', fontSize: 14 },
  botaoPrincipal: { minHeight: 54, paddingHorizontal: 22, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinho },
  botaoPrincipalTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressionado: { opacity: 0.78 },
  desabilitado: { opacity: 0.6 },
  sucessoCard: { marginTop: 38, padding: 32, alignItems: 'center', gap: 14, borderRadius: 20, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  sucessoIcone: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52,211,153,0.12)' },
  sucessoTitulo: { color: Cores.texto, fontSize: 24, fontWeight: '800' },
  sucessoTexto: { color: Cores.textoSuave, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
});
