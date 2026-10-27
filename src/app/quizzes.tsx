import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  listarQuizzes,
  listarRespostasDoUsuario,
  Quiz,
  ResultadoQuiz,
  responderQuiz,
} from '@/services/quizService';

const mostrarAlerta = (titulo: string, mensagem: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

export default function QuizScreen() {
  // Enquanto não há login, o usuário chega pela rota: /quizzes?usuarioId=1
  // Sem usuarioId a tela funciona em modo de teste: corrige, mas não pontua no ranking
  const params = useLocalSearchParams<{ usuarioId?: string }>();
  const idInformado = Number(params.usuarioId);
  const usuarioId = Number.isInteger(idInformado) && idInformado > 0 ? idInformado : undefined;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [respondidos, setRespondidos] = useState<Record<number, ResultadoQuiz>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [quizAtual, setQuizAtual] = useState<Quiz | null>(null);
  const [escolhas, setEscolhas] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [lista, respostas] = await Promise.all([
        listarQuizzes(),
        usuarioId ? listarRespostasDoUsuario(usuarioId) : Promise.resolve([]),
      ]);
      setQuizzes(lista);
      setRespondidos(Object.fromEntries(respostas.map((r) => [r.quizId, r])));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os quizzes.');
    } finally {
      setCarregando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirQuiz = (quiz: Quiz) => {
    setQuizAtual(quiz);
    setEscolhas({});
    setResultado(null);
  };

  const voltarParaLista = () => {
    setQuizAtual(null);
    setResultado(null);
    setEscolhas({});
  };

  const enviarRespostas = async () => {
    if (!quizAtual) return;

    const faltando = quizAtual.perguntas.filter((p) => escolhas[p.id] === undefined).length;
    if (faltando > 0) {
      mostrarAlerta('Quiz incompleto', `Responda todas as perguntas antes de enviar (${faltando} sem resposta).`);
      return;
    }

    setEnviando(true);
    try {
      const respostas = quizAtual.perguntas.map((p) => ({ perguntaId: p.id, alternativaId: escolhas[p.id] }));
      const res = await responderQuiz(quizAtual.id, usuarioId, respostas);
      setResultado(res);
      setRespondidos((atual) => ({ ...atual, [res.quizId]: res }));
    } catch (e) {
      mostrarAlerta('Erro', e instanceof Error ? e.message : 'Não foi possível enviar suas respostas.');
    } finally {
      setEnviando(false);
    }
  };

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
            {!usuarioId && <Text style={styles.aviso}>Modo de teste: pontos não foram enviados ao ranking.</Text>}
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

            {quizAtual.perguntas.map((pergunta, indice) => (
              <View key={pergunta.id} style={styles.pergunta}>
                <Text style={styles.enunciado}>
                  {indice + 1}. {pergunta.enunciado}
                </Text>
                {pergunta.alternativas.map((alternativa) => {
                  const selecionada = escolhas[pergunta.id] === alternativa.id;
                  return (
                    <Pressable
                      key={alternativa.id}
                      style={[styles.alternativa, selecionada && styles.alternativaSelecionada]}
                      onPress={() => setEscolhas((atual) => ({ ...atual, [pergunta.id]: alternativa.id }))}
                    >
                      <View style={[styles.radio, selecionada && styles.radioSelecionado]} />
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
        {!usuarioId && <Text style={styles.aviso}>Modo de teste: sem usuário, os pontos não vão para o ranking.</Text>}

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
            return (
              <Pressable
                key={quiz.id}
                style={[styles.card, styles.itemLista]}
                onPress={() => abrirQuiz(quiz)}
              >
                <Text style={styles.itemTitulo}>{quiz.titulo}</Text>
                {!!quiz.descricao && <Text style={styles.textoSecundario}>{quiz.descricao}</Text>}
                <Text style={styles.badge}>
                  {resposta
                    ? `Última tentativa · ${resposta.pontosObtidos} de ${quiz.pontuacao} pontos`
                    : `${quiz.perguntas.length} perguntas · ${quiz.pontuacao} pontos`}
                </Text>
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
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#7F1837' },
  radioSelecionado: { backgroundColor: '#A92B50', borderColor: '#A92B50' },
  button: { height: 41, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  buttonDesabilitado: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  resultadoPontos: { color: '#F2F2F4', fontSize: 36, fontWeight: '700', textAlign: 'center', marginVertical: 12 },
  link: { color: '#A92B50', fontSize: 14, alignSelf: 'flex-start' },
  aviso: { color: '#D9A441', fontSize: 13, textAlign: 'center', marginTop: 10 },
  erro: { color: '#E06C75', fontSize: 14, textAlign: 'center' },
  espaco: { marginTop: 24 },
});
