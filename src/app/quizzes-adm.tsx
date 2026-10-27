import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cadastrarQuiz, listarQuizzes, NovaPergunta, Quiz } from '@/services/quizService';

const mostrarAlerta = (titulo: string, mensagem: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

const novaPergunta = (): NovaPergunta => ({
  enunciado: '',
  alternativas: [
    { texto: '', correta: true },
    { texto: '', correta: false },
  ],
});

export default function QuizzesAdmScreen() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pontuacao, setPontuacao] = useState('');
  const [perguntas, setPerguntas] = useState<NovaPergunta[]>([novaPergunta()]);
  const [salvando, setSalvando] = useState(false);
  const [cadastrados, setCadastrados] = useState<Quiz[]>([]);

  const carregarCadastrados = useCallback(async () => {
    try {
      setCadastrados(await listarQuizzes());
    } catch {
      setCadastrados([]);
    }
  }, []);

  useEffect(() => {
    carregarCadastrados();
  }, [carregarCadastrados]);

  const alterarPergunta = (indice: number, alteracao: (p: NovaPergunta) => NovaPergunta) => {
    setPerguntas((atual) => atual.map((p, i) => (i === indice ? alteracao(p) : p)));
  };

  const salvar = async () => {
    if (!titulo.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o título do quiz.');
      return;
    }
    const pontos = Number(pontuacao);
    if (!Number.isInteger(pontos) || pontos <= 0) {
      mostrarAlerta('Pontuação inválida', 'Informe uma pontuação inteira maior que zero.');
      return;
    }
    for (const [i, p] of perguntas.entries()) {
      if (!p.enunciado.trim()) {
        mostrarAlerta('Pergunta incompleta', `Informe o enunciado da pergunta ${i + 1}.`);
        return;
      }
      if (p.alternativas.some((a) => !a.texto.trim())) {
        mostrarAlerta('Pergunta incompleta', `Preencha todas as alternativas da pergunta ${i + 1}.`);
        return;
      }
    }

    setSalvando(true);
    try {
      await cadastrarQuiz({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        pontuacao: pontos,
        perguntas: perguntas.map((p) => ({
          enunciado: p.enunciado.trim(),
          alternativas: p.alternativas.map((a) => ({ texto: a.texto.trim(), correta: a.correta })),
        })),
      });
      mostrarAlerta('Sucesso', 'Quiz cadastrado com sucesso!');
      setTitulo('');
      setDescricao('');
      setPontuacao('');
      setPerguntas([novaPergunta()]);
      carregarCadastrados();
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
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Opcional"
            placeholderTextColor="#777B86"
            value={descricao}
            onChangeText={setDescricao}
          />

          <Text style={styles.label}>Pontuação</Text>
          <TextInput
            style={styles.input}
            placeholder="Pontos para quem acertar tudo"
            placeholderTextColor="#777B86"
            keyboardType="number-pad"
            value={pontuacao}
            onChangeText={(texto) => setPontuacao(texto.replace(/\D/g, ''))}
          />

          {perguntas.map((pergunta, indice) => (
            <View key={indice} style={styles.pergunta}>
              <View style={styles.linha}>
                <Text style={styles.perguntaTitulo}>Pergunta {indice + 1}</Text>
                {perguntas.length > 1 && (
                  <Pressable onPress={() => setPerguntas((atual) => atual.filter((_, i) => i !== indice))}>
                    <Text style={styles.link}>Remover</Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Enunciado"
                placeholderTextColor="#777B86"
                value={pergunta.enunciado}
                onChangeText={(texto) => alterarPergunta(indice, (p) => ({ ...p, enunciado: texto }))}
              />

              <Text style={styles.dica}>Toque no círculo para marcar a alternativa correta.</Text>
              {pergunta.alternativas.map((alternativa, j) => (
                <View key={j} style={styles.linhaAlternativa}>
                  <Pressable
                    onPress={() =>
                      alterarPergunta(indice, (p) => ({
                        ...p,
                        alternativas: p.alternativas.map((a, k) => ({ ...a, correta: k === j })),
                      }))
                    }
                    hitSlop={8}
                  >
                    <View style={[styles.radio, alternativa.correta && styles.radioSelecionado]} />
                  </Pressable>
                  <TextInput
                    style={[styles.input, styles.inputAlternativa]}
                    placeholder={`Alternativa ${j + 1}`}
                    placeholderTextColor="#777B86"
                    value={alternativa.texto}
                    onChangeText={(texto) =>
                      alterarPergunta(indice, (p) => ({
                        ...p,
                        alternativas: p.alternativas.map((a, k) => (k === j ? { ...a, texto } : a)),
                      }))
                    }
                  />
                  {pergunta.alternativas.length > 2 && (
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        alterarPergunta(indice, (p) => {
                          const restantes = p.alternativas.filter((_, k) => k !== j);
                          // Se a correta foi removida, a primeira passa a ser a correta
                          if (!restantes.some((a) => a.correta)) restantes[0] = { ...restantes[0], correta: true };
                          return { ...p, alternativas: restantes };
                        })
                      }
                    >
                      <Text style={styles.remover}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}

              <Pressable
                onPress={() =>
                  alterarPergunta(indice, (p) => ({
                    ...p,
                    alternativas: [...p.alternativas, { texto: '', correta: false }],
                  }))
                }
              >
                <Text style={styles.link}>+ Adicionar alternativa</Text>
              </Pressable>
            </View>
          ))}

          <Pressable style={styles.buttonSecundario} onPress={() => setPerguntas((atual) => [...atual, novaPergunta()])}>
            <Text style={styles.buttonSecundarioText}>+ Adicionar pergunta</Text>
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
              <Text style={styles.perguntaTitulo}>{quiz.titulo}</Text>
              <Text style={styles.dica}>
                {quiz.perguntas.length} perguntas · {quiz.pontuacao} pontos
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
  pergunta: { borderTopWidth: 1, borderTopColor: '#3A2530', paddingTop: 16, marginTop: 4, marginBottom: 12 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  perguntaTitulo: { color: '#F2F2F4', fontSize: 15, fontWeight: '700' },
  dica: { color: '#A6A9B2', fontSize: 13, marginBottom: 10 },
  linhaAlternativa: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputAlternativa: { flex: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#7F1837', marginBottom: 15 },
  radioSelecionado: { backgroundColor: '#A92B50', borderColor: '#A92B50' },
  remover: { color: '#A6A9B2', fontSize: 16, marginBottom: 15 },
  link: { color: '#A92B50', fontSize: 13 },
  button: { height: 41, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonDesabilitado: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  buttonSecundario: { height: 41, borderRadius: 5, borderWidth: 1, borderColor: '#7F1837', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonSecundarioText: { color: '#E2E2E5', fontSize: 14, fontWeight: '700' },
  itemCadastrado: { borderTopWidth: 1, borderTopColor: '#3A2530', paddingTop: 10, marginTop: 6 },
});
