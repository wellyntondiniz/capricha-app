import { useAuth } from '@/contexts/AuthContext';
import {
  agruparPorPalestra,
  perguntaValida,
  resumirPerguntas,
  textoPerguntas,
} from '@/features/quiz/perguntas-quiz';
import { listarPalestras, Palestra } from '@/services/palestraService';
import { listarPerguntas, Pergunta } from '@/services/perguntaService';
import { cadastrarQuiz, listarQuizzes, Quiz } from '@/services/quizService';
import { erro as mostrarErro, sucesso } from '@/utils/notify';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Limites alinhados com a API
const TAMANHO_MAXIMO = 255;
const TAMANHO_MINIMO_TITULO = 3;
const PONTUACAO_MAXIMA = 1000;

const MENSAGEM_PALESTRA_COM_QUIZ =
  'Esta palestra já tem um quiz cadastrado. Edite o quiz existente para alterar as perguntas.';

// As perguntas do quiz são as cadastradas na palestra escolhida (tela Cadastro de perguntas).
// Cada palestra tem no máximo um quiz.
export default function QuizzesAdmScreen() {
  const { usuario } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pontuacao, setPontuacao] = useState('');
  const [palestras, setPalestras] = useState<Palestra[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [palestraId, setPalestraId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [cadastrados, setCadastrados] = useState<Quiz[]>([]);

  const token = usuario?.token;

  const carregar = useCallback(async () => {
    const [quizzes, lista, todasPerguntas] = await Promise.allSettled([
      token ? listarQuizzes(token) : Promise.reject(new Error('Sem sessão')),
      listarPalestras(),
      listarPerguntas(),
    ]);
    setCadastrados(quizzes.status === 'fulfilled' ? quizzes.value : []);
    setPalestras(lista.status === 'fulfilled' ? lista.value : []);
    setPerguntas(todasPerguntas.status === 'fulfilled' ? todasPerguntas.value : []);
    setCarregando(false);
  }, [token]);

  // Recarrega ao voltar do cadastro/edição de perguntas, para a contagem estar sempre atual
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const perguntasPorPalestra = useMemo(() => agruparPorPalestra(perguntas), [perguntas]);
  const palestrasComQuiz = useMemo(
    () => new Set(cadastrados.map((quiz) => quiz.palestra.id)),
    [cadastrados]
  );

  const palestraSelecionada = palestras.find((p) => p.id === palestraId) ?? null;
  const perguntasDaPalestra = palestraId === null ? [] : perguntasPorPalestra.get(palestraId) ?? [];
  const resumo = resumirPerguntas(perguntasDaPalestra);
  const palestraJaTemQuiz = palestraId !== null && palestrasComQuiz.has(palestraId);
  const podeCadastrar = palestraId !== null && !palestraJaTemQuiz && resumo.validas > 0;

  const salvar = async () => {
    if (!usuario?.token) {
      mostrarErro('Sessão expirada', 'Faça login novamente para cadastrar quizzes.');
      return;
    }
    if (palestraId === null) {
      mostrarErro('Campo obrigatório', 'Selecione a palestra do quiz.');
      return;
    }
    if (palestraJaTemQuiz) {
      mostrarErro('Quiz duplicado', MENSAGEM_PALESTRA_COM_QUIZ);
      return;
    }
    if (resumo.validas === 0) {
      mostrarErro(
        'Sem perguntas',
        'Cadastre ao menos uma pergunta com duas alternativas e uma correta nesta palestra.'
      );
      return;
    }
    if (!titulo.trim()) {
      mostrarErro('Campo obrigatório', 'É necessário informar o título do quiz.');
      return;
    }
    if (titulo.trim().length < TAMANHO_MINIMO_TITULO) {
      mostrarErro('Título inválido', `O título precisa ter pelo menos ${TAMANHO_MINIMO_TITULO} caracteres.`);
      return;
    }
    const pontos = Number(pontuacao);
    if (!Number.isInteger(pontos) || pontos <= 0) {
      mostrarErro('Pontuação inválida', 'Informe uma pontuação inteira maior que zero.');
      return;
    }
    if (pontos > PONTUACAO_MAXIMA) {
      mostrarErro('Pontuação inválida', `A pontuação pode ser no máximo ${PONTUACAO_MAXIMA}.`);
      return;
    }

    setSalvando(true);
    try {
      await cadastrarQuiz(usuario.token, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        pontuacao: pontos,
        palestraId,
      });
      sucesso('Sucesso', 'Quiz cadastrado com sucesso!');
      setTitulo('');
      setDescricao('');
      setPontuacao('');
      setPalestraId(null);
    } catch (e) {
      mostrarErro('Erro', e instanceof Error ? e.message : 'Não foi possível cadastrar o quiz.');
    } finally {
      setSalvando(false);
      carregar();
    }
  };

  const abrirCadastroPergunta = () =>
    router.push(
      palestraId === null
        ? '/cadastro-perguntas'
        : { pathname: '/cadastro-perguntas', params: { palestraId: String(palestraId) } }
    );

  const textoBotao = !palestraSelecionada
    ? 'Cadastrar quiz'
    : `Cadastrar quiz com ${textoPerguntas(resumo.validas)}`;

  const motivoBloqueio = !palestraSelecionada
    ? null
    : palestraJaTemQuiz
      ? MENSAGEM_PALESTRA_COM_QUIZ
      : resumo.validas === 0
        ? 'Cadastre ao menos uma pergunta válida nesta palestra para criar o quiz.'
        : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Administração de quizzes</Text>
        <Text style={styles.subheading}>Cada palestra tem um quiz, montado com as perguntas dela.</Text>

        {/* 1. Palestra */}
        <View style={styles.card}>
          <Text style={styles.passo}>PASSO 1</Text>
          <Text style={styles.title}>Escolha a palestra</Text>

          {carregando && <ActivityIndicator color="#A92B50" style={styles.loading} />}
          {!carregando && palestras.length === 0 && <Text style={styles.dica}>Nenhuma palestra cadastrada.</Text>}

          {palestras.map((palestra) => {
            const id = palestra.id;
            if (id === undefined) return null;
            const selecionada = id === palestraId;
            const jaTemQuiz = palestrasComQuiz.has(id);
            const eventoDesativado = palestra.evento?.ativo === false;
            const bloqueada = jaTemQuiz || eventoDesativado;
            const quantidade = resumirPerguntas(perguntasPorPalestra.get(id) ?? []);
            return (
              <Pressable
                key={id}
                disabled={bloqueada}
                style={[
                  styles.opcao,
                  selecionada && styles.opcaoSelecionada,
                  bloqueada && styles.opcaoBloqueada,
                ]}
                onPress={() => setPalestraId(id)}
              >
                <View style={[styles.radio, selecionada && styles.radioSelecionado]} />
                <View style={styles.opcaoCorpo}>
                  <Text style={[styles.opcaoTexto, bloqueada && styles.textoApagado]} numberOfLines={2}>
                    {palestra.nome}
                  </Text>
                  <View style={styles.chips}>
                    {jaTemQuiz ? (
                      <Text style={[styles.chip, styles.chipNeutro]}>Já tem quiz</Text>
                    ) : eventoDesativado ? (
                      <Text style={[styles.chip, styles.chipNeutro]}>Evento desativado</Text>
                    ) : quantidade.validas > 0 ? (
                      <Text style={[styles.chip, styles.chipOk]}>{textoPerguntas(quantidade.validas)}</Text>
                    ) : (
                      <Text style={[styles.chip, styles.chipAlerta]}>Sem perguntas</Text>
                    )}
                    {!bloqueada && quantidade.incompletas > 0 && (
                      <Text style={[styles.chip, styles.chipAlerta]}>
                        {quantidade.incompletas} incompleta{quantidade.incompletas === 1 ? '' : 's'}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 2. Perguntas da palestra escolhida */}
        {palestraSelecionada && (
          <View style={styles.card}>
            <Text style={styles.passo}>PASSO 2</Text>
            <Text style={styles.title}>Perguntas do quiz</Text>

            <View style={styles.contador}>
              <Text style={[styles.contadorNumero, resumo.validas === 0 && styles.contadorZero]}>
                {resumo.validas}
              </Text>
              <View style={styles.contadorTextos}>
                <Text style={styles.contadorTitulo}>
                  {resumo.validas === 1 ? 'pergunta no quiz' : 'perguntas no quiz'}
                </Text>
                <Text style={styles.dicaCompacta} numberOfLines={2}>
                  {palestraSelecionada.nome}
                </Text>
              </View>
            </View>

            {resumo.incompletas > 0 && (
              <Text style={styles.aviso}>
                {resumo.incompletas === 1
                  ? '1 pergunta está incompleta e não entra no quiz.'
                  : `${resumo.incompletas} perguntas estão incompletas e não entram no quiz.`}{' '}
                Cada pergunta precisa de pelo menos duas alternativas e uma correta.
              </Text>
            )}

            {perguntasDaPalestra.length === 0 ? (
              <Text style={styles.dica}>Esta palestra ainda não tem perguntas cadastradas.</Text>
            ) : (
              perguntasDaPalestra.map((pergunta, index) => {
                const alternativas = pergunta.alternativas ?? [];
                const corretas = alternativas.filter((a) => a.correta).length;
                const valida = perguntaValida(pergunta);
                return (
                  <View key={pergunta.id ?? index} style={styles.perguntaLinha}>
                    <View style={[styles.numero, !valida && styles.numeroIncompleto]}>
                      <Text style={styles.numeroTexto}>{index + 1}</Text>
                    </View>
                    <View style={styles.perguntaCorpo}>
                      <Text style={styles.perguntaEnunciado} numberOfLines={3}>
                        {pergunta.enunciado}
                      </Text>
                      <Text style={valida ? styles.perguntaMeta : styles.perguntaMetaAlerta}>
                        {alternativas.length} alternativas · {corretas} {corretas === 1 ? 'correta' : 'corretas'}
                        {valida ? '' : ' · incompleta, fora do quiz'}
                      </Text>
                    </View>
                    {pergunta.id !== undefined && (
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          router.push({ pathname: '/editar-pergunta', params: { id: String(pergunta.id) } })
                        }
                      >
                        <Text style={styles.link}>Editar</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}

            <Pressable style={styles.buttonSecundario} onPress={abrirCadastroPergunta}>
              <Text style={styles.buttonSecundarioText}>+ Cadastrar pergunta nesta palestra</Text>
            </Pressable>
          </View>
        )}

        {/* 3. Dados do quiz */}
        <View style={styles.card}>
          <Text style={styles.passo}>{palestraSelecionada ? 'PASSO 3' : 'PASSO 2'}</Text>
          <Text style={styles.title}>Dados do quiz</Text>

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Fundamentos de Java"
            placeholderTextColor="#777B86"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={TAMANHO_MAXIMO}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Opcional"
            placeholderTextColor="#777B86"
            value={descricao}
            onChangeText={setDescricao}
            maxLength={TAMANHO_MAXIMO}
          />

          <Text style={styles.label}>Pontuação</Text>
          <TextInput
            style={styles.input}
            placeholder="Pontos para quem acertar tudo"
            placeholderTextColor="#777B86"
            keyboardType="number-pad"
            maxLength={4}
            value={pontuacao}
            onChangeText={(texto) => setPontuacao(texto.replace(/\D/g, ''))}
          />

          {motivoBloqueio && <Text style={styles.aviso}>{motivoBloqueio}</Text>}

          <Pressable
            style={[styles.button, (salvando || !podeCadastrar) && styles.buttonDesabilitado]}
            onPress={salvar}
            disabled={salvando || !podeCadastrar}
          >
            {salvando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{textoBotao}</Text>}
          </Pressable>
          {!palestraSelecionada && <Text style={styles.dicaCentral}>Escolha uma palestra para continuar.</Text>}
        </View>

        {/* Quizzes já cadastrados */}
        <View style={styles.card}>
          <Text style={styles.title}>Quizzes cadastrados</Text>
          {cadastrados.length === 0 && <Text style={styles.dica}>Nenhum quiz cadastrado ainda.</Text>}
          {cadastrados.map((quiz) => (
            <View key={quiz.id} style={styles.itemCadastrado}>
              <View style={styles.itemTopo}>
                <View style={styles.itemTextos}>
                  <Text style={styles.itemTitulo}>{quiz.titulo}</Text>
                  <Text style={styles.dicaCompacta} numberOfLines={2}>
                    {quiz.palestra.nome}
                  </Text>
                </View>
                <Pressable
                  style={styles.botaoEditar}
                  onPress={() => router.push({ pathname: '/editar-quiz', params: { id: String(quiz.id) } })}
                >
                  <Text style={styles.botaoEditarTexto}>Editar</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                <Text style={[styles.chip, quiz.totalPerguntas > 0 ? styles.chipOk : styles.chipAlerta]}>
                  {textoPerguntas(quiz.totalPerguntas)}
                </Text>
                <Text style={[styles.chip, styles.chipNeutro]}>{quiz.pontuacao} pontos</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1017' },
  page: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  heading: { color: '#F2F2F4', fontSize: 24, fontWeight: '400', marginBottom: 6, textAlign: 'center' },
  subheading: { color: '#A6A9B2', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  card: { width: '100%', maxWidth: 560, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 20, marginTop: 16 },
  passo: { color: '#D9466F', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  title: { color: '#F2F2F4', fontSize: 21, fontWeight: '400', marginBottom: 16 },
  label: { color: '#E5E5E8', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { height: 41, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingHorizontal: 13, color: '#FFFFFF', fontSize: 14, marginBottom: 15 },
  loading: { marginVertical: 12 },
  dica: { color: '#A6A9B2', fontSize: 13, marginBottom: 10 },
  dicaCompacta: { color: '#A6A9B2', fontSize: 13 },
  dicaCentral: { color: '#A6A9B2', fontSize: 12, textAlign: 'center', marginTop: 10 },
  aviso: {
    color: '#F0B66B',
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: 'rgba(240,182,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,182,107,0.35)',
    borderRadius: 5,
    padding: 10,
    marginBottom: 12,
  },

  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#3A2530',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  opcaoSelecionada: { borderColor: '#A92B50', backgroundColor: '#1C1219' },
  opcaoBloqueada: { opacity: 0.55 },
  opcaoCorpo: { flex: 1, gap: 6 },
  opcaoTexto: { color: '#E2E2E5', fontSize: 14, flexShrink: 1 },
  textoApagado: { color: '#A6A9B2' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#7F1837' },
  radioSelecionado: { backgroundColor: '#A92B50', borderColor: '#A92B50' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 11, fontWeight: '700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  chipOk: { color: '#5FD08A', backgroundColor: 'rgba(95,208,138,0.12)' },
  chipAlerta: { color: '#F0B66B', backgroundColor: 'rgba(240,182,107,0.12)' },
  chipNeutro: { color: '#B9BCC6', backgroundColor: 'rgba(185,188,198,0.12)' },

  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1C1219',
    borderWidth: 1,
    borderColor: '#3A2530',
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  contadorNumero: { color: '#F2F2F4', fontSize: 40, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  contadorZero: { color: '#F0B66B' },
  contadorTextos: { flex: 1, gap: 2 },
  contadorTitulo: { color: '#F2F2F4', fontSize: 15, fontWeight: '700' },

  perguntaLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#3A2530',
    paddingVertical: 10,
  },
  numero: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#7F1837', alignItems: 'center', justifyContent: 'center' },
  numeroIncompleto: { backgroundColor: '#6B5A3A' },
  numeroTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  perguntaCorpo: { flex: 1, gap: 3 },
  perguntaEnunciado: { color: '#E2E2E5', fontSize: 14, lineHeight: 20 },
  perguntaMeta: { color: '#A6A9B2', fontSize: 12 },
  perguntaMetaAlerta: { color: '#F0B66B', fontSize: 12 },
  link: { color: '#D9466F', fontSize: 13, fontWeight: '700', paddingTop: 2 },

  button: { height: 44, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDesabilitado: { opacity: 0.45 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  buttonSecundario: { height: 41, borderRadius: 5, borderWidth: 1, borderColor: '#7F1837', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  buttonSecundarioText: { color: '#E2E2E5', fontSize: 14, fontWeight: '700' },

  itemCadastrado: { borderTopWidth: 1, borderTopColor: '#3A2530', paddingTop: 12, marginTop: 8, gap: 8 },
  itemTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemTextos: { flex: 1, gap: 2 },
  itemTitulo: { color: '#F2F2F4', fontSize: 15, fontWeight: '700' },
  botaoEditar: { borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingHorizontal: 14, paddingVertical: 7 },
  botaoEditarTexto: { color: '#E2E2E5', fontSize: 13, fontWeight: '700' },
});