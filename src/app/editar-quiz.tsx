import { useAuth } from '@/contexts/AuthContext';
import { perguntaValida, resumirPerguntas, textoPerguntas } from '@/features/quiz/perguntas-quiz';
import { listarPerguntas as listarPerguntasDaPalestra } from '@/services/palestraService';
import { deletarPerguntaById, Pergunta } from '@/services/perguntaService';
import { atualizarQuiz, listarQuizzes, Quiz } from '@/services/quizService';
import { erro as mostrarErro, sucesso } from '@/utils/notify';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
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

// Edição do quiz: dados do quiz e as perguntas da palestra (adicionar, editar e excluir)
export default function EditarQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useAuth();
  const token = usuario?.token;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pontuacao, setPontuacao] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [perguntaParaExcluir, setPerguntaParaExcluir] = useState<Pergunta | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // O formulário só é preenchido na primeira carga: voltar do cadastro de perguntas não apaga o que foi digitado
  const formularioPreenchido = useRef(false);

  const carregar = useCallback(async () => {
    const quizId = Number(id);
    if (!token || !Number.isInteger(quizId) || quizId <= 0) {
      setFalhou(true);
      setCarregando(false);
      return;
    }
    try {
      const quizzes = await listarQuizzes(token);
      const encontrado = quizzes.find((q) => q.id === quizId);
      if (!encontrado) {
        setFalhou(true);
        return;
      }
      const daPalestra = await listarPerguntasDaPalestra(encontrado.palestra.id);
      setQuiz(encontrado);
      setPerguntas(daPalestra.filter((p) => p.ativo !== false));
      if (!formularioPreenchido.current) {
        setTitulo(encontrado.titulo);
        setDescricao(encontrado.descricao ?? '');
        setPontuacao(String(encontrado.pontuacao));
        formularioPreenchido.current = true;
      }
      setFalhou(false);
    } catch (e) {
      if (!formularioPreenchido.current) setFalhou(true);
      mostrarErro('Erro', e instanceof Error ? e.message : 'Não foi possível carregar o quiz.');
    } finally {
      setCarregando(false);
    }
  }, [id, token]);

  // Recarrega ao voltar do cadastro e da edição de perguntas
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const voltar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/quizzes-adm');
  };

  const salvar = async () => {
    if (!token || !quiz) {
      mostrarErro('Sessão expirada', 'Faça login novamente para editar quizzes.');
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
      await atualizarQuiz(token, quiz.id, { titulo: titulo.trim(), descricao: descricao.trim(), pontuacao: pontos });
      sucesso('Quiz atualizado!', 'As alterações foram salvas com sucesso.');
      voltar();
    } catch (e) {
      mostrarErro('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar o quiz.');
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!perguntaParaExcluir?.id || excluindo) return;
    try {
      setExcluindo(true);
      await deletarPerguntaById(perguntaParaExcluir.id);
      setPerguntaParaExcluir(null);
      sucesso('Pergunta excluída', 'A pergunta saiu do quiz.');
      await carregar();
    } catch (e) {
      mostrarErro('Erro', e instanceof Error ? e.message : 'Não foi possível excluir a pergunta.');
    } finally {
      setExcluindo(false);
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#A92B50" />
          <Text style={styles.dica}>Carregando quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (falhou || !quiz) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centralizado}>
          <Text style={styles.title}>Quiz não encontrado</Text>
          <Text style={styles.dica}>Ele pode ter sido removido ou o evento foi desativado.</Text>
          <Pressable style={styles.buttonSecundario} onPress={voltar}>
            <Text style={styles.buttonSecundarioText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const resumo = resumirPerguntas(perguntas);
  const ultimaValida =
    perguntaParaExcluir !== null && perguntaValida(perguntaParaExcluir) && resumo.validas === 1;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.topo}>
          <Pressable onPress={voltar} hitSlop={8}>
            <Text style={styles.voltar}>{'← Voltar'}</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>Editar quiz</Text>

        {/* Dados do quiz */}
        <View style={styles.card}>
          <Text style={styles.title}>Dados do quiz</Text>

          <Text style={styles.label}>Palestra</Text>
          <View style={styles.palestraFixa}>
            <Text style={styles.palestraNome}>{quiz.palestra.nome}</Text>
            <Text style={styles.dicaCompacta}>A palestra do quiz não pode ser alterada.</Text>
          </View>

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Fundamentos de Java"
            placeholderTextColor="#777B86"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={TAMANHO_MAXIMO}
            editable={!salvando}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Opcional"
            placeholderTextColor="#777B86"
            value={descricao}
            onChangeText={setDescricao}
            maxLength={TAMANHO_MAXIMO}
            editable={!salvando}
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
            editable={!salvando}
          />
          <Text style={styles.dica}>Quem já respondeu mantém os pontos que recebeu.</Text>

          <Pressable
            style={[styles.button, salvando && styles.buttonDesabilitado]}
            onPress={salvar}
            disabled={salvando}
          >
            {salvando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Salvar alterações</Text>}
          </Pressable>
        </View>

        {/* Perguntas */}
        <View style={styles.card}>
          <Text style={styles.title}>Perguntas do quiz</Text>

          <View style={styles.contador}>
            <Text style={[styles.contadorNumero, resumo.validas === 0 && styles.contadorZero]}>{resumo.validas}</Text>
            <View style={styles.contadorTextos}>
              <Text style={styles.contadorTitulo}>
                {resumo.validas === 1 ? 'pergunta no quiz' : 'perguntas no quiz'}
              </Text>
              <Text style={styles.dicaCompacta}>
                {resumo.incompletas > 0
                  ? `${resumo.incompletas} incompleta${resumo.incompletas === 1 ? '' : 's'} (fora do quiz)`
                  : 'Todas as perguntas estão completas'}
              </Text>
            </View>
          </View>

          {resumo.validas === 0 && (
            <Text style={styles.aviso}>
              Sem perguntas válidas os participantes não conseguem responder o quiz. Adicione uma pergunta com
              duas alternativas e ao menos uma correta.
            </Text>
          )}

          {perguntas.map((pergunta, index) => {
            const alternativas = pergunta.alternativas ?? [];
            const corretas = alternativas.filter((a) => a.correta).length;
            const valida = perguntaValida(pergunta);
            return (
              <View key={pergunta.id ?? index} style={styles.perguntaLinha}>
                <View style={[styles.numero, !valida && styles.numeroIncompleto]}>
                  <Text style={styles.numeroTexto}>{index + 1}</Text>
                </View>
                <View style={styles.perguntaCorpo}>
                  <Text style={styles.perguntaEnunciado}>{pergunta.enunciado}</Text>
                  <Text style={valida ? styles.perguntaMeta : styles.perguntaMetaAlerta}>
                    {alternativas.length} alternativas · {corretas} {corretas === 1 ? 'correta' : 'corretas'}
                    {valida ? '' : ' · incompleta, fora do quiz'}
                  </Text>
                  <View style={styles.acoes}>
                    <Pressable
                      style={styles.acao}
                      onPress={() =>
                        router.push({ pathname: '/editar-pergunta', params: { id: String(pergunta.id) } })
                      }
                    >
                      <Text style={styles.acaoTexto}>Editar</Text>
                    </Pressable>
                    <Pressable style={[styles.acao, styles.acaoExcluir]} onPress={() => setPerguntaParaExcluir(pergunta)}>
                      <Text style={styles.acaoTexto}>Excluir</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}

          <Pressable
            style={styles.buttonSecundario}
            onPress={() =>
              router.push({ pathname: '/cadastro-perguntas', params: { palestraId: String(quiz.palestra.id) } })
            }
          >
            <Text style={styles.buttonSecundarioText}>+ Adicionar pergunta</Text>
          </Pressable>
        </View>

        <Text style={styles.rodape}>
          {textoPerguntas(resumo.validas)} · {quiz.pontuacao} pontos
        </Text>
      </ScrollView>

      <Modal
        visible={perguntaParaExcluir !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPerguntaParaExcluir(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Excluir pergunta?</Text>
            <Text style={styles.modalMensagem}>
              {ultimaValida
                ? 'Esta é a única pergunta válida do quiz. Sem ela, os participantes não conseguirão responder até você adicionar outra. '
                : ''}
              A pergunta e suas alternativas saem do quiz. Essa ação não pode ser desfeita.
            </Text>
            <View style={styles.modalBotoes}>
              <Pressable
                style={styles.botaoCancelar}
                onPress={() => setPerguntaParaExcluir(null)}
                disabled={excluindo}
              >
                <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.botaoConfirmar} onPress={confirmarExclusao} disabled={excluindo}>
                <Text style={styles.textoBotaoConfirmar}>{excluindo ? 'Excluindo...' : 'Excluir'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1017' },
  page: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  centralizado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  topo: { width: '100%', maxWidth: 560, marginBottom: 12 },
  voltar: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  heading: { color: '#F2F2F4', fontSize: 24, fontWeight: '400', marginBottom: 6, textAlign: 'center' },
  card: { width: '100%', maxWidth: 560, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 20, marginTop: 16 },
  title: { color: '#F2F2F4', fontSize: 21, fontWeight: '400', marginBottom: 16 },
  label: { color: '#E5E5E8', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { height: 41, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingHorizontal: 13, color: '#FFFFFF', fontSize: 14, marginBottom: 15 },
  dica: { color: '#A6A9B2', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  dicaCompacta: { color: '#A6A9B2', fontSize: 13 },
  palestraFixa: { borderWidth: 1, borderColor: '#3A2530', borderRadius: 5, padding: 12, marginBottom: 15, gap: 3, backgroundColor: '#12151D' },
  palestraNome: { color: '#E2E2E5', fontSize: 14, fontWeight: '700' },
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
    paddingVertical: 12,
  },
  numero: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#7F1837', alignItems: 'center', justifyContent: 'center' },
  numeroIncompleto: { backgroundColor: '#6B5A3A' },
  numeroTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  perguntaCorpo: { flex: 1, gap: 4 },
  perguntaEnunciado: { color: '#E2E2E5', fontSize: 14, lineHeight: 20 },
  perguntaMeta: { color: '#A6A9B2', fontSize: 12 },
  perguntaMetaAlerta: { color: '#F0B66B', fontSize: 12 },
  acoes: { flexDirection: 'row', gap: 8, marginTop: 6 },
  acao: { borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingHorizontal: 14, paddingVertical: 7 },
  acaoExcluir: { borderColor: '#872332', backgroundColor: 'rgba(135,35,50,0.25)' },
  acaoTexto: { color: '#E2E2E5', fontSize: 13, fontWeight: '700' },

  button: { height: 44, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDesabilitado: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  buttonSecundario: { height: 41, minWidth: 140, paddingHorizontal: 16, borderRadius: 5, borderWidth: 1, borderColor: '#7F1837', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  buttonSecundarioText: { color: '#E2E2E5', fontSize: 14, fontWeight: '700' },
  rodape: { color: '#A6A9B2', fontSize: 12, marginTop: 20, marginBottom: 8 },

  modalFundo: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#171B26', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#303544' },
  modalTitulo: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  modalMensagem: { color: '#AAB1C2', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  modalBotoes: { flexDirection: 'row', gap: 12 },
  botaoCancelar: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#292F3D', alignItems: 'center' },
  textoBotaoCancelar: { color: '#FFFFFF', fontWeight: '600' },
  botaoConfirmar: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#7B1B38', alignItems: 'center' },
  textoBotaoConfirmar: { color: '#FFFFFF', fontWeight: 'bold' },
});