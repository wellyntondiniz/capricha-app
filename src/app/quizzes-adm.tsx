import { useAuth } from '@/contexts/AuthContext';
import { listarPalestras, Palestra } from '@/services/palestraService';
import { cadastrarQuiz, listarQuizzes, Quiz } from '@/services/quizService';
import { erro } from '@/utils/notify';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

const mostrarAlerta = (titulo: string, mensagem: string) => {
  erro(titulo, mensagem);
};

// Limites alinhados com a API
const TAMANHO_MAXIMO = 255;
const TAMANHO_MINIMO_TITULO = 3;
const PONTUACAO_MAXIMA = 1000;

// As perguntas do quiz são as cadastradas na palestra escolhida (tela Cadastro de perguntas)
export default function QuizzesAdmScreen() {
  const { usuario } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pontuacao, setPontuacao] = useState('');
  const [palestras, setPalestras] = useState<Palestra[]>([]);
  const [palestraId, setPalestraId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cadastrados, setCadastrados] = useState<Quiz[]>([]);

  const token = usuario?.token;

  const carregar = useCallback(async () => {
    const [quizzes, lista] = await Promise.allSettled([
      token ? listarQuizzes(token) : Promise.reject(new Error('Sem sessão')),
      listarPalestras(),
    ]);
    setCadastrados(quizzes.status === 'fulfilled' ? quizzes.value : []);
    setPalestras(lista.status === 'fulfilled' ? lista.value : []);
  }, [token]);

  // Recarrega ao voltar do cadastro de perguntas
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const salvar = async () => {
    if (!usuario?.token) {
      mostrarAlerta('Sessão expirada', 'Faça login novamente para cadastrar quizzes.');
      return;
    }
    if (!titulo.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o título do quiz.');
      return;
    }
    if (titulo.trim().length < TAMANHO_MINIMO_TITULO) {
      mostrarAlerta('Título inválido', `O título precisa ter pelo menos ${TAMANHO_MINIMO_TITULO} caracteres.`);
      return;
    }
    const pontos = Number(pontuacao);
    if (!Number.isInteger(pontos) || pontos <= 0) {
      mostrarAlerta('Pontuação inválida', 'Informe uma pontuação inteira maior que zero.');
      return;
    }
    if (pontos > PONTUACAO_MAXIMA) {
      mostrarAlerta('Pontuação inválida', `A pontuação pode ser no máximo ${PONTUACAO_MAXIMA}.`);
      return;
    }
    if (palestraId === null) {
      mostrarAlerta('Campo obrigatório', 'Selecione a palestra do quiz.');
      return;
    }
    const tituloRepetido = cadastrados.some(
      (quiz) => quiz.palestra.id === palestraId && quiz.titulo.trim().toLowerCase() === titulo.trim().toLowerCase()
    );
    if (tituloRepetido) {
      mostrarAlerta('Quiz duplicado', 'Já existe um quiz com este título para a palestra selecionada.');
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
      mostrarAlerta('Sucesso', 'Quiz cadastrado com sucesso!');
      setTitulo('');
      setDescricao('');
      setPontuacao('');
      setPalestraId(null);
      carregar();
    } catch (e) {
      mostrarAlerta('Erro', e instanceof Error ? e.message : 'Não foi possível cadastrar o quiz.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Administração de quizzes</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Novo quiz</Text>

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

          <Text style={styles.label}>Palestra</Text>
          <Text style={styles.dica}>O quiz usa as perguntas ativas cadastradas na palestra.</Text>
          {palestras.length === 0 && <Text style={styles.dica}>Nenhuma palestra cadastrada.</Text>}
          {palestras.map((palestra) => {
            const selecionada = palestra.id === palestraId;
            return (
              <Pressable
                key={palestra.id}
                style={[styles.opcao, selecionada && styles.opcaoSelecionada]}
                onPress={() => setPalestraId(palestra.id ?? null)}
              >
                <View style={[styles.radio, selecionada && styles.radioSelecionado]} />
                <Text style={styles.opcaoTexto}>{palestra.nome}</Text>
              </Pressable>
            );
          })}

          <Pressable style={styles.buttonSecundario} onPress={() =>
              router.push(
                palestraId === null
                  ? '/cadastro-perguntas'
                  : { pathname: '/cadastro-perguntas', params: { palestraId: String(palestraId) } }
              )
            }>
            <Text style={styles.buttonSecundarioText}>+ Cadastrar perguntas</Text>
          </Pressable>

          <Pressable
            style={[styles.button, salvando && styles.buttonDesabilitado]}
            onPress={salvar}
            disabled={salvando}
          >
            {salvando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Cadastrar quiz</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Quizzes cadastrados</Text>
          {cadastrados.length === 0 && <Text style={styles.dica}>Nenhum quiz cadastrado ainda.</Text>}
          {cadastrados.map((quiz) => (
            <View key={quiz.id} style={styles.itemCadastrado}>
              <Text style={styles.itemTitulo}>{quiz.titulo}</Text>
              <Text style={styles.dica}>
                {quiz.palestra.nome} · {quiz.totalPerguntas} perguntas · {quiz.pontuacao} pontos
              </Text>
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
  heading: { color: '#F2F2F4', fontSize: 24, fontWeight: '400', marginBottom: 6 },
  card: { width: '100%', maxWidth: 560, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 20, marginTop: 16 },
  title: { color: '#F2F2F4', fontSize: 21, fontWeight: '400', marginBottom: 16 },
  label: { color: '#E5E5E8', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { height: 41, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingHorizontal: 13, color: '#FFFFFF', fontSize: 14, marginBottom: 15 },
  itemTitulo: { color: '#F2F2F4', fontSize: 15, fontWeight: '700' },
  dica: { color: '#A6A9B2', fontSize: 13, marginBottom: 10 },
  opcao: {
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
  opcaoSelecionada: { borderColor: '#A92B50', backgroundColor: '#1C1219' },
  opcaoTexto: { color: '#E2E2E5', fontSize: 14, flexShrink: 1 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#7F1837' },
  radioSelecionado: { backgroundColor: '#A92B50', borderColor: '#A92B50' },
  button: { height: 41, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonDesabilitado: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  buttonSecundario: { height: 41, borderRadius: 5, borderWidth: 1, borderColor: '#7F1837', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonSecundarioText: { color: '#E2E2E5', fontSize: 14, fontWeight: '700' },
  itemCadastrado: { borderTopWidth: 1, borderTopColor: '#3A2530', paddingTop: 10, marginTop: 6 },
});
