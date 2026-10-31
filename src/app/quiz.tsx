import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import {
  listarMinhasRespostas,
  listarQuizzes,
  Quiz,
  QuizErro,
  responderQuiz,
  ResultadoQuiz,
} from '@/services/quizService';
import { info, erro as mostrarErro, sucesso } from '@/utils/notify';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Onde o participante resolve cada bloqueio (o servidor é quem decide se o quiz está liberado)
const ROTA_DO_BLOQUEIO = {
  EVENT_CHECK_IN_REQUIRED: { rota: '/check-in', texto: 'Fazer check-in no evento' },
  LECTURE_CHECK_IN_REQUIRED: { rota: '/check-in-palestras', texto: 'Fazer check-in na palestra' },
} as const;

export default function QuizScreen() {
  // Cada usuário logado responde cada quiz uma única vez; o servidor identifica o usuário pela sessão
  const { usuario, carregando: carregandoSessao } = useAuth();
  const token = usuario?.token;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [respondidos, setRespondidos] = useState<Record<number, ResultadoQuiz>>({});
  const [carregando, setCarregando] = useState(true);
  // Só indica que a listagem falhou (para mostrar "Tentar novamente"); a mensagem vai em toast
  const [falhou, setFalhou] = useState(false);

  const [quizAtual, setQuizAtual] = useState<Quiz | null>(null);
  // Alternativas marcadas por pergunta: uma pergunta pode ter mais de uma correta
  const [escolhas, setEscolhas] = useState<Record<number, number[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);

  const carregar = useCallback(async () => {
    if (!token) return;
    setFalhou(false);
    try {
      const [lista, respostas] = await Promise.all([listarQuizzes(token), listarMinhasRespostas(token)]);
      setQuizzes(lista);
      setRespondidos(Object.fromEntries(respostas.map((r) => [r.quizId, r])));
    } catch (e) {
      setFalhou(true);
      mostrarErro('Erro', e instanceof Error ? e.message : 'Não foi possível carregar os quizzes.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  // Recarrega sempre que a tela volta ao foco: depois de um check-in o quiz precisa aparecer liberado
  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      carregar();
    }, [carregar])
  );

  useEffect(() => {
    if (!carregandoSessao && !token) {
      info('Faça login', 'Entre na sua conta para responder os quizzes e pontuar no ranking.');
    }
  }, [carregandoSessao, token]);

  const abrirQuiz = (quiz: Quiz) => {
    const resposta = respondidos[quiz.id];
    if (resposta || quiz.respondido) {
      mostrarErro(
        'Quiz já respondido',
        resposta
          ? `Você já respondeu este quiz e fez ${resposta.pontosObtidos} de ${quiz.pontuacao} pontos.`
          : 'Você já respondeu este quiz.'
      );
      return;
    }
    if (!quiz.disponivel) {
      mostrarErro('Quiz indisponível', quiz.mensagemBloqueio ?? 'Este quiz não está disponível no momento.');
      return;
    }
    setQuizAtual(quiz);
    setEscolhas({});
    setResultado(null);
    info('Antes de começar', 'Você só pode enviar uma vez. Marque todas as alternativas corretas.');
  };

  const voltarParaLista = () => {
    setQuizAtual(null);
    setResultado(null);
    setEscolhas({});
  };

  const voltar = () => {
    if (quizAtual) {
      voltarParaLista();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const alternarEscolha = (perguntaId: number, alternativaId: number) => {
    setEscolhas((atual) => {
      const marcadas = atual[perguntaId] ?? [];
      return {
        ...atual,
        [perguntaId]: marcadas.includes(alternativaId)
          ? marcadas.filter((id) => id !== alternativaId)
          : [...marcadas, alternativaId],
      };
    });
  };

  const enviarRespostas = async () => {
    if (!quizAtual || !token || enviando) return;

    const faltando = quizAtual.perguntas.filter((p) => !escolhas[p.id]?.length).length;
    if (faltando > 0) {
      mostrarErro('Quiz incompleto', `Responda todas as perguntas antes de enviar (${faltando} sem resposta).`);
      return;
    }

    setEnviando(true);
    try {
      const respostas = quizAtual.perguntas.map((p) => ({ perguntaId: p.id, alternativaIds: escolhas[p.id] }));
      const res = await responderQuiz(token, quizAtual.id, respostas);
      setResultado(res);
      setRespondidos((atual) => ({ ...atual, [res.quizId]: res }));
      if (res.pontosObtidos === 0) {
        info('Quiz enviado', 'Desta vez não foi possível pontuar.');
      } else {
        sucesso('Respostas enviadas!', `Você ganhou ${res.pontosObtidos} pontos.`);
      }
    } catch (e) {
      // 403/409: o servidor recusou por regra (sem check-in, já respondido, evento encerrado...).
      // Volta para a lista, que é recarregada com a situação real do quiz.
      if (e instanceof QuizErro && (e.status === 403 || e.status === 409)) {
        mostrarErro(e.status === 409 ? 'Quiz indisponível' : 'Check-in necessário', e.message);
        voltarParaLista();
        setCarregando(true);
        carregar();
        return;
      }
      mostrarErro('Erro', e instanceof Error ? e.message : 'Não foi possível enviar suas respostas.');
    } finally {
      setEnviando(false);
    }
  };

  // Cabeçalho padrão do app (botão voltar redondo + título), igual às telas de ranking, resumos e avaliação
  const cabecalho = (titulo: string, subtitulo?: string) => (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={voltar} style={styles.voltar}>
        <Ionicons name="arrow-back" size={24} color={Cores.texto} />
      </Pressable>
      <View style={styles.headerTextos}>
        <Text accessibilityRole="header" style={styles.titulo}>
          {titulo}
        </Text>
        {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
      </View>
    </View>
  );

  if (carregandoSessao) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Cores.destaque} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.container}>
            {cabecalho('Quizzes')}
            <View style={styles.estadoVazio}>
              <Ionicons name="lock-closed-outline" size={40} color={Cores.destaque} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/')}
                style={({ pressed }) => [styles.botaoPrincipal, styles.botaoLargo, pressed && styles.pressionado]}>
                <Text style={styles.botaoPrincipalTexto}>Fazer login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (resultado && quizAtual) {
    const aproveitamento =
      resultado.totalPerguntas > 0 ? Math.round((resultado.acertos / resultado.totalPerguntas) * 100) : 0;
    const pontuou = resultado.pontosObtidos > 0;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {cabecalho('Resultado', quizAtual.titulo)}

            <View style={styles.resultadoCard}>
              <View style={[styles.resultadoIcone, !pontuou && styles.resultadoIconeNeutro]}>
                <Ionicons
                  name={pontuou ? 'trophy' : 'remove-circle-outline'}
                  size={38}
                  color={pontuou ? '#34D399' : Cores.textoSuave}
                />
              </View>
              <Text style={styles.resultadoRotulo}>Você fez</Text>
              <Text style={styles.resultadoPontos}>+{resultado.pontosObtidos} pontos</Text>

              <View style={styles.resultadoLinha}>
                <Text style={styles.resultadoTexto}>
                  {resultado.acertos} de {resultado.totalPerguntas}{' '}
                  {resultado.totalPerguntas === 1 ? 'pergunta correta' : 'perguntas corretas'}
                </Text>
                <Text style={styles.resultadoPercentual}>{aproveitamento}%</Text>
              </View>
              <View style={styles.barra}>
                <View style={[styles.barraPreenchida, { width: `${aproveitamento}%` }]} />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={voltarParaLista}
                style={({ pressed }) => [styles.botaoPrincipal, styles.botaoLargo, pressed && styles.pressionado]}>
                <Text style={styles.botaoPrincipalTexto}>Voltar para os quizzes</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (quizAtual) {
    const respondidas = quizAtual.perguntas.filter((p) => !!escolhas[p.id]?.length).length;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {cabecalho(quizAtual.titulo, quizAtual.descricao || quizAtual.palestra.nome)}

            <View style={styles.instrucaoCard}>
              <Ionicons name="trophy-outline" size={23} color={Cores.destaque} />
              <View style={styles.instrucaoTextos}>
                <Text style={styles.instrucaoTitulo}>Vale até {quizAtual.pontuacao} pontos</Text>
                <Text style={styles.instrucaoTexto}>{quizAtual.palestra.nome}</Text>
              </View>
              <Text style={styles.contador}>
                {respondidas}/{quizAtual.perguntas.length}
              </Text>
            </View>

            {quizAtual.perguntas.map((pergunta, indice) => (
              <View key={pergunta.id} style={styles.perguntaCard}>
                <View style={styles.perguntaCabecalho}>
                  <View style={styles.numero}>
                    <Text style={styles.numeroTexto}>{indice + 1}</Text>
                  </View>
                  <Text style={styles.perguntaTexto}>{pergunta.enunciado}</Text>
                </View>

                <View style={styles.opcoes}>
                  {pergunta.alternativas.map((alternativa) => {
                    const selecionada = escolhas[pergunta.id]?.includes(alternativa.id) ?? false;
                    return (
                      <Pressable
                        key={alternativa.id}
                        accessibilityRole="checkbox"
                        accessibilityLabel={alternativa.texto}
                        accessibilityState={{ checked: selecionada }}
                        onPress={() => alternarEscolha(pergunta.id, alternativa.id)}
                        style={({ pressed }) => [
                          styles.opcao,
                          selecionada && styles.opcaoSelecionada,
                          pressed && styles.pressionado,
                        ]}>
                        <View style={[styles.checkbox, selecionada && styles.checkboxSelecionado]}>
                          {selecionada && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.opcaoTexto, selecionada && styles.opcaoTextoSelecionado]}>
                          {alternativa.texto}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              onPress={enviarRespostas}
              style={({ pressed }) => [styles.botaoPrincipal, pressed && styles.pressionado, enviando && styles.desabilitado]}>
              {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.botaoPrincipalTexto}>Enviar respostas</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {cabecalho('Quizzes', 'Responda e some pontos no ranking.')}

          {carregando && (
            <View style={styles.estado}>
              <ActivityIndicator size="large" color={Cores.destaque} />
              <Text style={styles.estadoTexto}>Carregando quizzes...</Text>
            </View>
          )}

          {!carregando && falhou && (
            <View style={styles.estadoVazio}>
              <Ionicons name="cloud-offline-outline" size={40} color={Cores.destaque} />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCarregando(true);
                  carregar();
                }}
                style={({ pressed }) => [styles.botaoSecundario, styles.botaoLargo, pressed && styles.pressionado]}>
                <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}

          {!carregando && !falhou && quizzes.length === 0 && (
            <View style={styles.estadoVazio}>
              <Ionicons name="help-circle-outline" size={40} color={Cores.destaque} />
              <Text style={styles.estadoTitulo}>Nenhum quiz disponível no momento.</Text>
            </View>
          )}

          {!carregando &&
            !falhou &&
            quizzes.map((quiz) => {
              const resposta = respondidos[quiz.id];
              const jaRespondeu = !!resposta || quiz.respondido;
              const bloqueado = !jaRespondeu && !quiz.disponivel;
              const acao =
                bloqueado && quiz.bloqueio && quiz.bloqueio !== 'QUIZ_EMPTY' ? ROTA_DO_BLOQUEIO[quiz.bloqueio] : null;

              return (
                <View
                  key={quiz.id}
                  style={[styles.quizCard, (jaRespondeu || bloqueado) && styles.quizCardInativo]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => abrirQuiz(quiz)}
                    style={({ pressed }) => [styles.quizConteudo, pressed && styles.pressionado]}>
                  <View style={styles.quizCabecalho}>
                    <Text style={styles.quizTitulo}>{quiz.titulo}</Text>
                    <Ionicons
                      name={jaRespondeu ? 'checkmark-circle' : bloqueado ? 'lock-closed' : 'chevron-forward'}
                      size={jaRespondeu || bloqueado ? 22 : 20}
                      color={jaRespondeu ? '#34D399' : bloqueado ? Cores.inativo : Cores.destaque}
                    />
                  </View>

                  <View style={styles.metaLinha}>
                    <Ionicons name="mic-outline" size={16} color={Cores.textoSuave} />
                    <Text style={styles.quizPalestra}>{quiz.palestra.nome}</Text>
                  </View>

                  {!!quiz.descricao && <Text style={styles.quizDescricao}>{quiz.descricao}</Text>}

                  <View
                    style={[
                      styles.badge,
                      jaRespondeu && styles.badgeRespondido,
                      bloqueado && styles.badgeBloqueado,
                    ]}>
                    <Text
                      style={[
                        styles.badgeTexto,
                        jaRespondeu && styles.badgeTextoRespondido,
                        bloqueado && styles.badgeTextoBloqueado,
                      ]}>
                      {jaRespondeu
                        ? `Respondido · ${resposta?.pontosObtidos ?? 0} de ${quiz.pontuacao} pontos`
                        : `${quiz.totalPerguntas} ${quiz.totalPerguntas === 1 ? 'pergunta' : 'perguntas'} · ${quiz.pontuacao} pontos`}
                    </Text>
                  </View>
                  </Pressable>

                  {!!acao && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(acao.rota)}
                      style={({ pressed }) => [styles.botaoSecundario, pressed && styles.pressionado]}>
                      <Text style={styles.botaoSecundarioTexto}>{acao.texto}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  scroll: { flexGrow: 1, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, gap: 18 },
  loader: { flex: 1, alignSelf: 'center' },

  // Cabeçalho
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  voltar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  headerTextos: { flex: 1, gap: 5, justifyContent: 'center', minHeight: 48 },
  titulo: { color: Cores.texto, fontSize: 28, fontWeight: '800' },
  subtitulo: { color: Cores.textoSuave, fontSize: 15, lineHeight: 21 },

  // Estados (carregando / vazio / erro)
  estado: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 14 },
  estadoTexto: { color: Cores.textoSuave, fontSize: 15 },
  estadoVazio: { width: '100%', alignItems: 'center', padding: 28, gap: 12, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  estadoTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  // Lista de quizzes
  quizCard: { padding: 18, gap: 10, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  quizCardInativo: { opacity: 0.75 },
  quizConteudo: { gap: 10 },
  quizCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quizTitulo: { flex: 1, color: Cores.texto, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  metaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quizPalestra: { flex: 1, color: Cores.textoSuave, fontSize: 14 },
  quizDescricao: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Cores.vinhoSuave, borderWidth: 1, borderColor: 'rgba(217, 70, 111, 0.35)' },
  badgeTexto: { color: Cores.destaque, fontSize: 12, fontWeight: '700' },
  badgeRespondido: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.30)' },
  badgeTextoRespondido: { color: '#34D399' },
  badgeBloqueado: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.12)' },
  badgeTextoBloqueado: { color: Cores.textoSuave },

  // Quiz em andamento
  instrucaoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: Cores.vinhoSuave, borderWidth: 1, borderColor: Cores.vinhoClaro },
  instrucaoTextos: { flex: 1, gap: 3 },
  instrucaoTitulo: { color: Cores.texto, fontSize: 15, fontWeight: '800' },
  instrucaoTexto: { color: Cores.textoSuave, fontSize: 13, lineHeight: 18 },
  contador: { color: Cores.destaque, fontSize: 14, fontWeight: '800' },
  perguntaCard: { padding: 18, gap: 16, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  perguntaCabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinhoSuave },
  numeroTexto: { color: Cores.destaque, fontSize: 14, fontWeight: '800' },
  perguntaTexto: { flex: 1, color: Cores.texto, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  opcoes: { gap: 9 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 13, backgroundColor: Cores.superficieAlta, borderWidth: 1, borderColor: Cores.borda },
  opcaoSelecionada: { backgroundColor: Cores.vinhoSuave, borderColor: Cores.destaque },
  opcaoTexto: { flex: 1, color: Cores.textoSuave, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  opcaoTextoSelecionado: { color: Cores.texto },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Cores.vinhoEscuro, alignItems: 'center', justifyContent: 'center' },
  checkboxSelecionado: { backgroundColor: Cores.vinho, borderColor: Cores.destaque },

  // Resultado
  resultadoCard: { marginTop: 20, padding: 32, alignItems: 'center', gap: 8, borderRadius: 20, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  resultadoIcone: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52,211,153,0.12)', marginBottom: 8 },
  resultadoIconeNeutro: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  resultadoRotulo: { color: Cores.textoSuave, fontSize: 14, fontWeight: '600' },
  resultadoPontos: { color: Cores.destaque, fontSize: 40, fontWeight: '800' },
  resultadoLinha: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  resultadoTexto: { color: Cores.texto, fontSize: 15, fontWeight: '600' },
  resultadoPercentual: { color: Cores.destaque, fontSize: 15, fontWeight: '800' },
  barra: { width: '100%', height: 8, borderRadius: 4, backgroundColor: Cores.superficieAlta, overflow: 'hidden' },
  barraPreenchida: { height: '100%', borderRadius: 4, backgroundColor: Cores.vinho },

  // Botões
  botaoPrincipal: { minHeight: 54, paddingHorizontal: 22, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinho },
  botaoPrincipalTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  botaoSecundario: { minHeight: 44, marginTop: 4, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Cores.vinhoEscuro, alignItems: 'center', justifyContent: 'center' },
  botaoSecundarioTexto: { color: Cores.texto, fontSize: 15, fontWeight: '600' },
  botaoLargo: { alignSelf: 'stretch', marginTop: 12 },
  pressionado: { opacity: 0.78 },
  desabilitado: { opacity: 0.6 },
});