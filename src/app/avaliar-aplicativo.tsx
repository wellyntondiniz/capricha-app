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

type PerguntaItem = {
  campo: CampoAvaliacao;
  codigo: string;
  construto: string;
  texto: string;
};

const PERGUNTAS: PerguntaItem[] = [
  // 1. TAM — Facilidade de uso percebida (PEOU)
  {
    campo: 'peou01',
    codigo: 'PEOU01',
    construto: '1. Facilidade de uso percebida (PEOU)',
    texto: 'Aprender a utilizar o aplicativo foi fácil para mim.',
  },
  {
    campo: 'peou02',
    codigo: 'PEOU02',
    construto: '1. Facilidade de uso percebida (PEOU)',
    texto: 'Foi fácil realizar as atividades que eu desejava no aplicativo.',
  },
  {
    campo: 'peou03',
    codigo: 'PEOU03',
    construto: '1. Facilidade de uso percebida (PEOU)',
    texto: 'Minha interação com o aplicativo foi clara e compreensível.',
  },
  {
    campo: 'peou04',
    codigo: 'PEOU04',
    construto: '1. Facilidade de uso percebida (PEOU)',
    texto: 'Considero o aplicativo flexível para realizar as atividades disponíveis.',
  },
  {
    campo: 'peou05',
    codigo: 'PEOU05',
    construto: '1. Facilidade de uso percebida (PEOU)',
    texto: 'Foi fácil adquirir habilidade para utilizar o aplicativo.',
  },
  {
    campo: 'peou06',
    codigo: 'PEOU06',
    construto: '1. Facilidade de uso percebida (PEOU)',
    texto: 'De modo geral, considero o aplicativo fácil de usar.',
  },

  // 2. TAM — Utilidade percebida (PU)
  {
    campo: 'pu01',
    codigo: 'PU01',
    construto: '2. Utilidade percebida (PU)',
    texto: 'O aplicativo permitiu que eu acompanhasse minha participação no evento com maior eficiência.',
  },
  {
    campo: 'pu02',
    codigo: 'PU02',
    construto: '2. Utilidade percebida (PU)',
    texto: 'O aplicativo facilitou a realização das atividades propostas durante o evento.',
  },
  {
    campo: 'pu03',
    codigo: 'PU03',
    construto: '2. Utilidade percebida (PU)',
    texto: 'O aplicativo contribuiu para melhorar minha participação na Semana de Computação.',
  },
  {
    campo: 'pu04',
    codigo: 'PU04',
    construto: '2. Utilidade percebida (PU)',
    texto: 'O aplicativo tornou mais práticas as atividades de check-in, quizzes, conexões e votação.',
  },
  {
    campo: 'pu05',
    codigo: 'PU05',
    construto: '2. Utilidade percebida (PU)',
    texto: 'O aplicativo foi útil para minha experiência no evento.',
  },
  {
    campo: 'pu06',
    codigo: 'PU06',
    construto: '2. Utilidade percebida (PU)',
    texto: 'De modo geral, considero o aplicativo uma ferramenta útil para participar de eventos acadêmicos.',
  },

  // 3. GAMEFULQUEST — Realização (AC)
  {
    campo: 'ac01',
    codigo: 'AC01',
    construto: '3. Realização (AC)',
    texto: 'Utilizar o aplicativo me proporcionou uma sensação de conquista.',
  },
  {
    campo: 'ac02',
    codigo: 'AC02',
    construto: '3. Realização (AC)',
    texto: 'Senti satisfação ao concluir as missões do aplicativo.',
  },
  {
    campo: 'ac03',
    codigo: 'AC03',
    construto: '3. Realização (AC)',
    texto: 'O aplicativo me incentivou a alcançar objetivos durante o evento.',
  },
  {
    campo: 'ac04',
    codigo: 'AC04',
    construto: '3. Realização (AC)',
    texto: 'Acompanhar meu progresso no aplicativo foi gratificante.',
  },
  {
    campo: 'ac05',
    codigo: 'AC05',
    construto: '3. Realização (AC)',
    texto: 'Senti que estava progredindo ao completar as atividades propostas.',
  },
  {
    campo: 'ac06',
    codigo: 'AC06',
    construto: '3. Realização (AC)',
    texto: 'Concluir as missões me proporcionou uma sensação de sucesso.',
  },
  {
    campo: 'ac07',
    codigo: 'AC07',
    construto: '3. Realização (AC)',
    texto: 'As recompensas do aplicativo fizeram com que minhas conquistas parecessem importantes.',
  },
  {
    campo: 'ac08',
    codigo: 'AC08',
    construto: '3. Realização (AC)',
    texto: 'O aplicativo me motivou a completar novos desafios.',
  },

  // 4. GAMEFULQUEST — Experiência social (SE)
  {
    campo: 'se01',
    codigo: 'SE01',
    construto: '4. Experiência social (SE)',
    texto: 'Utilizar o aplicativo proporcionou oportunidades de interação social.',
  },
  {
    campo: 'se02',
    codigo: 'SE02',
    construto: '4. Experiência social (SE)',
    texto: 'O aplicativo me incentivou a interagir com outros participantes.',
  },
  {
    campo: 'se03',
    codigo: 'SE03',
    construto: '4. Experiência social (SE)',
    texto: 'Senti que fazia parte de uma experiência compartilhada com outras pessoas.',
  },
  {
    campo: 'se04',
    codigo: 'SE04',
    construto: '4. Experiência social (SE)',
    texto: 'As atividades do aplicativo favoreceram meu contato com outros participantes.',
  },
  {
    campo: 'se05',
    codigo: 'SE05',
    construto: '4. Experiência social (SE)',
    texto: 'O aplicativo tornou a interação com outras pessoas mais interessante.',
  },
  {
    campo: 'se06',
    codigo: 'SE06',
    construto: '4. Experiência social (SE)',
    texto: 'A participação de outras pessoas contribuiu para minha experiência com o aplicativo.',
  },
  {
    campo: 'se07',
    codigo: 'SE07',
    construto: '4. Experiência social (SE)',
    texto: 'O aplicativo me proporcionou oportunidades de conhecer novas pessoas.',
  },
  {
    campo: 'se08',
    codigo: 'SE08',
    construto: '4. Experiência social (SE)',
    texto: 'As interações sociais foram uma parte importante da minha experiência com o aplicativo.',
  },

  // 5. Modelo 3C — Comunicação (COM)
  {
    campo: 'com01',
    codigo: 'COM01',
    construto: '5. Comunicação (COM)',
    texto: 'O aplicativo facilitou o início de conversas com outros participantes do evento.',
  },
  {
    campo: 'com02',
    codigo: 'COM02',
    construto: '5. Comunicação (COM)',
    texto: 'As conexões realizadas pelo aplicativo favoreceram a troca de informações sobre as atividades do evento.',
  },
  {
    campo: 'com03',
    codigo: 'COM03',
    construto: '5. Comunicação (COM)',
    texto: 'O aplicativo incentivou o compartilhamento de conhecimentos ou experiências entre participantes.',
  },

  // 6. Modelo 3C — Coordenação (COO)
  {
    campo: 'coo01',
    codigo: 'COO01',
    construto: '6. Coordenação (COO)',
    texto: 'O aplicativo facilitou a combinação de atividades com outros participantes.',
  },
  {
    campo: 'coo02',
    codigo: 'COO02',
    construto: '6. Coordenação (COO)',
    texto: 'As conexões realizadas pelo aplicativo ajudaram a organizar encontros ou interações durante o evento.',
  },
  {
    campo: 'coo03',
    codigo: 'COO03',
    construto: '6. Coordenação (COO)',
    texto: 'O aplicativo favoreceu a organização de ações conjuntas, como visitar pôsteres ou participar de atividades.',
  },

  // 7. Modelo 3C — Cooperação (COP)
  {
    campo: 'cop01',
    codigo: 'COP01',
    construto: '7. Cooperação (COP)',
    texto: 'O aplicativo favoreceu situações de ajuda mútua entre participantes.',
  },
  {
    campo: 'cop02',
    codigo: 'COP02',
    construto: '7. Cooperação (COP)',
    texto: 'As interações incentivadas pelo aplicativo contribuíram para a realização de atividades em conjunto.',
  },
  {
    campo: 'cop03',
    codigo: 'COP03',
    construto: '7. Cooperação (COP)',
    texto: 'O aplicativo facilitou a cooperação entre participantes para alcançar objetivos compartilhados.',
  },
];

const OPCOES = [
  { valor: 1, emoji: '😞', rotulo: 'Discordo totalmente' },
  { valor: 2, emoji: '🙁', rotulo: 'Discordo' },
  { valor: 3, emoji: '😐', rotulo: 'Neutro' },
  { valor: 4, emoji: '🙂', rotulo: 'Concordo' },
  { valor: 5, emoji: '😄', rotulo: 'Concordo totalmente' },
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
      setErro(`Responda todas as perguntas antes de enviar (${totalRespondidas}/${PERGUNTAS.length} respondidas).`);
      return;
    }

    setErro('');
    setEnviando(true);
    try {
      const payload = {
        ...(respostas as Record<CampoAvaliacao, number>),
        comentario: comentario.trim() || undefined,
      };
      const texto = await enviarAvaliacao(usuario.token, payload);
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
              <Text style={styles.subtitulo}>Sua opinião ajuda a avaliar e aprimorar a experiência nos eventos acadêmicos.</Text>
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
                  <Text style={styles.instrucaoTexto}>Indique seu grau de concordância (de 1 = Discordo totalmente a 5 = Concordo totalmente) para cada afirmação.</Text>
                </View>
                <Text style={styles.contador}>{totalRespondidas}/{PERGUNTAS.length}</Text>
              </View>

              {PERGUNTAS.map((pergunta, indice) => {
                const mostrarSecao =
                  indice === 0 || PERGUNTAS[indice - 1].construto !== pergunta.construto;

                return (
                  <View key={pergunta.campo} style={styles.blocoQuestao}>
                    {mostrarSecao && (
                      <View style={styles.secaoHeader}>
                        <Text style={styles.secaoTitulo}>{pergunta.construto}</Text>
                      </View>
                    )}

                    <View style={styles.perguntaCard}>
                      <View style={styles.perguntaCabecalho}>
                        <View style={styles.numero}>
                          <Text style={styles.numeroTexto}>{indice + 1}</Text>
                        </View>
                        <View style={styles.perguntaConteudo}>
                          <Text style={styles.codigoBadge}>{pergunta.codigo}</Text>
                          <Text style={styles.perguntaTexto}>{pergunta.texto}</Text>
                        </View>
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
                              <Text style={[styles.opcaoValor, selecionada && styles.opcaoTextoSelecionado]}>{opcao.valor}</Text>
                              <Text style={[styles.opcaoTexto, selecionada && styles.opcaoTextoSelecionado]}>{opcao.rotulo}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}

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
  blocoQuestao: { gap: 10 },
  secaoHeader: { marginTop: 6, paddingHorizontal: 4 },
  secaoTitulo: { color: Cores.destaque, fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  perguntaCard: { padding: 18, gap: 18, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  perguntaCabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinhoSuave },
  numeroTexto: { color: Cores.destaque, fontSize: 14, fontWeight: '800' },
  perguntaConteudo: { flex: 1, gap: 4 },
  codigoBadge: { color: Cores.destaque, fontSize: 12, fontWeight: '800' },
  perguntaTexto: { color: Cores.texto, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  opcoes: { flexDirection: 'row', gap: 7 },
  opcao: { flex: 1, minWidth: 52, minHeight: 96, paddingVertical: 10, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 13, backgroundColor: Cores.superficieAlta, borderWidth: 1, borderColor: Cores.borda },
  opcaoSelecionada: { backgroundColor: Cores.vinho, borderColor: Cores.destaque, shadowColor: Cores.destaque, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  emoji: { fontSize: 24 },
  opcaoValor: { color: Cores.texto, fontSize: 12, fontWeight: '800' },
  opcaoTexto: { color: Cores.textoSuave, fontSize: 10, lineHeight: 12, textAlign: 'center', fontWeight: '700' },
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
