import { useAuth } from '@/contexts/AuthContext';
import {
  listarMinhasRespostas,
  listarQuizzes,
  Quiz,
  QuizErro,
  responderQuiz,
  ResultadoQuiz,
} from '@/services/quizService';
import { erro as mostrarErro } from '@/utils/notify';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
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
  const [erro, setErro] = useState('');

  const [quizAtual, setQuizAtual] = useState<Quiz | null>(null);
  // Alternativas marcadas por pergunta: uma pergunta pode ter mais de uma correta
  const [escolhas, setEscolhas] = useState<Record<number, number[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);

  const carregar = useCallback(async () => {
    if (!token) return;
    setErro('');
    try {
      const [lista, respostas] = await Promise.all([listarQuizzes(token), listarMinhasRespostas(token)]);
      setQuizzes(lista);
      setRespondidos(Object.fromEntries(respostas.map((r) => [r.quizId, r])));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os quizzes.');
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
  };

  const voltarParaLista = () => {
    setQuizAtual(null);
    setResultado(null);
    setEscolhas({});
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
    if (!quizAtual || !token) return;

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

  if (carregandoSessao) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#A92B50" style={styles.espaco} />
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.heading}>Quizzes</Text>
          <Text style={styles.textoSecundario}>Entre na sua conta para responder os quizzes e pontuar no ranking.</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Fazer login</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (resultado && quizAtual) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.card}>
            <Text style={styles.title}>{quizAtual.titulo}</Text>
            <Text style={styles.resultadoPontos}>+{resultado.pontosObtidos} pontos</Text>
            <Text style={styles.textoSecundario}>
              Você acertou {resultado.acertos} de {resultado.totalPerguntas} perguntas.
            </Text>
            {resultado.pontosObtidos === 0 && (
              <Text style={styles.textoSecundario}>Desta vez não foi possível pontuar.</Text>
            )}
            <Pressable style={styles.button} onPress={voltarParaLista}>
              <Text style={styles.buttonText}>Voltar para os quizzes</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (quizAtual) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <Pressable onPress={voltarParaLista}>
            <Text style={styles.link}>‹ Voltar</Text>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.title}>{quizAtual.titulo}</Text>
            {!!quizAtual.descricao && <Text style={styles.textoSecundario}>{quizAtual.descricao}</Text>}
            <Text style={styles.badge}>Vale até {quizAtual.pontuacao} pontos</Text>
            <Text style={styles.aviso}>Você só pode enviar uma vez. Marque todas as alternativas corretas.</Text>

            {quizAtual.perguntas.map((pergunta, indice) => (
              <View key={pergunta.id} style={styles.pergunta}>
                <Text style={styles.enunciado}>
                  {indice + 1}. {pergunta.enunciado}
                </Text>
                {pergunta.alternativas.map((alternativa) => {
                  const selecionada = escolhas[pergunta.id]?.includes(alternativa.id) ?? false;
                  return (
                    <Pressable
                      key={alternativa.id}
                      style={[styles.alternativa, selecionada && styles.alternativaSelecionada]}
                      onPress={() => alternarEscolha(pergunta.id, alternativa.id)}
                    >
                      <View style={[styles.checkbox, selecionada && styles.checkboxSelecionado]}>
                        {selecionada && <Text style={styles.check}>✓</Text>}
                      </View>
                      <Text style={styles.alternativaTexto}>{alternativa.texto}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <Pressable
              style={[styles.button, enviando && styles.buttonDesabilitado]}
              onPress={enviarRespostas}
              disabled={enviando}
            >
              {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Enviar respostas</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.heading}>Quizzes</Text>
        <Text style={styles.textoSecundario}>Responda e some pontos no ranking.</Text>

        {carregando && <ActivityIndicator color="#A92B50" style={styles.espaco} />}

        {!carregando && !!erro && (
          <View style={styles.espaco}>
            <Text style={styles.erro}>{erro}</Text>
            <Pressable style={styles.button} onPress={carregar}>
              <Text style={styles.buttonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {!carregando && !erro && quizzes.length === 0 && (
          <Text style={[styles.textoSecundario, styles.espaco]}>Nenhum quiz disponível no momento.</Text>
        )}

        {!carregando &&
          !erro &&
          quizzes.map((quiz) => {
            const resposta = respondidos[quiz.id];
            const jaRespondeu = !!resposta || quiz.respondido;
            const bloqueado = !jaRespondeu && !quiz.disponivel;
            const acao = bloqueado && quiz.bloqueio && quiz.bloqueio !== 'QUIZ_EMPTY' ? ROTA_DO_BLOQUEIO[quiz.bloqueio] : null;
            return (
              <Pressable
                key={quiz.id}
                style={[styles.card, styles.itemLista, (jaRespondeu || bloqueado) && styles.itemRespondido]}
                onPress={() => abrirQuiz(quiz)}
              >
                <Text style={styles.itemTitulo}>{quiz.titulo}</Text>
                <Text style={styles.textoSecundario}>{quiz.palestra.nome}</Text>
                {!!quiz.descricao && <Text style={styles.textoSecundario}>{quiz.descricao}</Text>}
                <Text style={styles.badge}>
                  {jaRespondeu
                    ? `Respondido · ${resposta?.pontosObtidos ?? 0} de ${quiz.pontuacao} pontos`
                    : `${quiz.totalPerguntas} ${quiz.totalPerguntas === 1 ? 'pergunta' : 'perguntas'} · ${quiz.pontuacao} pontos`}
                </Text>
                {bloqueado && !!quiz.mensagemBloqueio && <Text style={styles.aviso}>🔒 {quiz.mensagemBloqueio}</Text>}
                {!!acao && (
                  <Pressable style={styles.buttonSecundario} onPress={() => router.push(acao.rota)}>
                    <Text style={styles.buttonText}>{acao.texto}</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1017' },
  page: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  heading: { color: '#F2F2F4', fontSize: 24, fontWeight: '400', marginBottom: 6 },
  card: { width: '100%', maxWidth: 520, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 20, marginTop: 16 },
  itemLista: { gap: 6 },
  itemRespondido: { opacity: 0.6 },
  itemTitulo: { color: '#F2F2F4', fontSize: 17, fontWeight: '700' },
  title: { color: '#F2F2F4', fontSize: 21, fontWeight: '400', marginBottom: 8 },
  textoSecundario: { color: '#A6A9B2', fontSize: 14, textAlign: 'center' },
  badge: { color: '#A92B50', fontSize: 13, fontWeight: '700', marginTop: 8 },
  pergunta: { marginTop: 22 },
  enunciado: { color: '#E5E5E8', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  alternativa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#3A2530',
    borderRadius: 5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  alternativaSelecionada: { borderColor: '#A92B50', backgroundColor: '#1C1219' },
  alternativaTexto: { color: '#E2E2E5', fontSize: 14, flexShrink: 1 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#7F1837', alignItems: 'center', justifyContent: 'center' },
  checkboxSelecionado: { backgroundColor: '#A92B50', borderColor: '#A92B50' },
  check: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  button: { height: 41, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: 20 },
  buttonDesabilitado: { opacity: 0.6 },
  buttonSecundario: { height: 38, borderRadius: 5, borderWidth: 1, borderColor: '#A92B50', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  resultadoPontos: { color: '#F2F2F4', fontSize: 36, fontWeight: '700', textAlign: 'center', marginVertical: 12 },
  link: { color: '#A92B50', fontSize: 14, alignSelf: 'flex-start' },
  aviso: { color: '#D9A441', fontSize: 13, textAlign: 'center', marginTop: 10 },
  erro: { color: '#E06C75', fontSize: 14, textAlign: 'center' },
  espaco: { marginTop: 24 },
});
