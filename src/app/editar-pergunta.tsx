import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  atualizarPergunta,
  listarPerguntas,
  type Pergunta,
} from '@/services/perguntaService';

import { erro, sucesso } from '@/utils/notify';

// Limites alinhados com a API
const TAMANHO_MAXIMO = 255;
const TAMANHO_MINIMO_ENUNCIADO = 5;
const MINIMO_ALTERNATIVAS = 2;
const MAXIMO_ALTERNATIVAS = 6;

type AlternativaFormulario = {
  id?: number;
  texto: string;
  correta: boolean;
};

export default function EditarPergunta() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [perguntaId, setPerguntaId] = useState<number | null>(null);
  const [enunciado, setEnunciado] = useState('');
  const [alternativas, setAlternativas] =
    useState<AlternativaFormulario[]>([]);
  const [perguntaOriginal, setPerguntaOriginal] =
    useState<Pergunta | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarPergunta();
  }, [id]);

  async function carregarPergunta() {
    try {
      setCarregando(true);

      const idNumerico = Number(id);

      if (!id || !Number.isInteger(idNumerico) || idNumerico <= 0) {
        erro('Erro', 'ID da pergunta inválido.');
        router.back();
        return;
      }

      const perguntas = await listarPerguntas();

      const encontrada = perguntas.find(
        (item) => item.id === idNumerico
      );

      if (!encontrada) {
        erro('Erro', 'Pergunta não encontrada.');
        router.back();
        return;
      }

      setPerguntaId(idNumerico);
      setPerguntaOriginal(encontrada);
      setEnunciado(encontrada.enunciado ?? '');

      const alternativasOriginais = encontrada.alternativas ?? [];

      const formulario = alternativasOriginais.map((alternativa) => ({
        id: alternativa.id,
        texto: alternativa.texto ?? '',
        correta: alternativa.correta ?? false,
      }));

      setAlternativas(formulario);
    } catch {
      erro('Erro', 'Não foi possível carregar a pergunta.');
    } finally {
      setCarregando(false);
    }
  }

  function atualizarTexto(texto: string, index: number) {
    setAlternativas((atuais) =>
      atuais.map((alternativa, i) =>
        i === index ? { ...alternativa, texto } : alternativa
      )
    );
  }

  function alternarCorreta(index: number) {
    setAlternativas((atuais) =>
      atuais.map((alternativa, i) =>
        i === index
          ? { ...alternativa, correta: !alternativa.correta }
          : alternativa
      )
    );
  }

  function adicionarAlternativa() {
    setAlternativas((atuais) =>
      atuais.length >= MAXIMO_ALTERNATIVAS ? atuais : [...atuais, { texto: '', correta: false }]
    );
  }

  function removerAlternativa(index: number) {
    setAlternativas((atuais) =>
      atuais.length <= MINIMO_ALTERNATIVAS ? atuais : atuais.filter((_, i) => i !== index)
    );
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/lista-perguntas');
  }

  async function salvarAlteracoes() {
    if (
      perguntaId === null ||
      perguntaOriginal === null
    ) {
      erro('Erro', 'Não foi possível identificar a pergunta.');
      return;
    }

    if (!enunciado.trim()) {
      erro('Campo obrigatório', 'Digite o enunciado da pergunta.');
      return;
    }

    if (enunciado.trim().length < TAMANHO_MINIMO_ENUNCIADO) {
      erro('Atenção', `O enunciado precisa ter pelo menos ${TAMANHO_MINIMO_ENUNCIADO} caracteres.`);
      return;
    }

    if (alternativas.length < MINIMO_ALTERNATIVAS) {
      erro('Atenção', `A pergunta precisa de pelo menos ${MINIMO_ALTERNATIVAS} alternativas.`);
      return;
    }

    if (alternativas.some((a) => !a.texto.trim())) {
      erro('Campo obrigatório', 'Preencha o texto de todas as alternativas.');
      return;
    }

    const textos = alternativas.map((a) => a.texto.trim().toLowerCase());
    if (new Set(textos).size !== textos.length) {
      erro('Atenção', 'As alternativas não podem se repetir.');
      return;
    }

    if (!alternativas.some((a) => a.correta)) {
      erro(
        'Campo obrigatório',
        'Selecione pelo menos uma alternativa correta.'
      );
      return;
    }

    if (alternativas.every((a) => a.correta)) {
      erro('Atenção', 'Pelo menos uma alternativa precisa ser incorreta.');
      return;
    }

    try {
      setSalvando(true);

      const perguntaAtualizada: Pergunta = {
        ...perguntaOriginal,
        id: perguntaId,
        enunciado: enunciado.trim(),
        ativo: perguntaOriginal.ativo ?? true,
        palestra: perguntaOriginal.palestra,
        alternativas: alternativas.map((alternativa) => ({
          ...alternativa,
          texto: alternativa.texto.trim(),
          pergunta: { id: perguntaId },
        })),
      };

      await atualizarPergunta(perguntaId, perguntaAtualizada);

      sucesso(
        'Pergunta atualizada!',
        'As alterações foram salvas com sucesso.'
      );

      voltar();
    } catch (e) {
      erro(
        'Erro',
        e instanceof Error
          ? e.message
          : 'Não foi possível atualizar a pergunta. Verifique a API.'
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#A52A4F" />
          <Text style={styles.textoCarregamento}>
            Carregando pergunta...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoTexto}>✦</Text>
          </View>

          <Text style={styles.titulo}>Editar pergunta</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitulo}>
            Alterar pergunta existente
          </Text>

          <View style={styles.campo}>
            <Text style={styles.label}>
              Enunciado da pergunta
            </Text>

            <TextInput
              style={styles.textarea}
              placeholder="Digite o enunciado da pergunta..."
              placeholderTextColor="#8B949E"
              value={enunciado}
              onChangeText={setEnunciado}
              multiline
              maxLength={TAMANHO_MAXIMO}
              editable={!salvando}
            />
          </View>

          <View style={styles.alternativasContainer}>
            <Text style={styles.label}>Alternativas</Text>

            {alternativas.map((alternativa, index) => (
              <View style={styles.alternativa} key={index}>
                <TextInput
                  style={styles.inputAlternativa}
                  placeholder={`Alternativa ${index + 1}`}
                  placeholderTextColor="#8B949E"
                  value={alternativa.texto}
                  onChangeText={(texto) =>
                    atualizarTexto(texto, index)
                  }
                  maxLength={TAMANHO_MAXIMO}
                  editable={!salvando}
                />

                <TouchableOpacity
                  style={styles.corretamente}
                  onPress={() => alternarCorreta(index)}
                  disabled={salvando}
                >
                  <View
                    style={[
                      styles.checkbox,
                      alternativa.correta &&
                        styles.checkboxSelecionado,
                    ]}
                  >
                    {alternativa.correta && (
                      <Text style={styles.check}>✓</Text>
                    )}
                  </View>

                  <Text style={styles.textoCorreta}>Correta</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.remover,
                    alternativas.length <= MINIMO_ALTERNATIVAS &&
                      styles.removerDesabilitado,
                  ]}
                  onPress={() => removerAlternativa(index)}
                  disabled={
                    salvando || alternativas.length <= MINIMO_ALTERNATIVAS
                  }
                  accessibilityLabel={`Remover alternativa ${index + 1}`}
                >
                  <Text style={styles.removerTexto}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {alternativas.length < MAXIMO_ALTERNATIVAS && (
              <TouchableOpacity
                style={styles.botaoAdicionar}
                onPress={adicionarAlternativa}
                disabled={salvando}
              >
                <Text style={styles.textoAdicionar}>+ Adicionar alternativa</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.hint}>
              Marque uma ou mais alternativas como corretas (pelo menos uma deve
              ficar incorreta). De {MINIMO_ALTERNATIVAS} a {MAXIMO_ALTERNATIVAS}{' '}
              alternativas.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.botao,
              salvando && styles.botaoDesabilitado,
            ]}
            onPress={salvarAlteracoes}
            disabled={salvando}
          >
            <Text style={styles.textoBotao}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={voltar}
            disabled={salvando}
          >
            <Text style={styles.textoVoltar}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Edite o enunciado e as alternativas da pergunta.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  conteudo: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    padding: 24,
    justifyContent: 'center',
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCarregamento: {
    color: '#E6EDF3',
    marginTop: 12,
  },
  logo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B1B38',
    borderRadius: 24,
  },
  logoTexto: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  titulo: {
    fontSize: 24,
    color: '#E6EDF3',
  },
  card: {
    padding: 24,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  subtitulo: {
    marginBottom: 20,
    fontSize: 20,
    color: '#E6EDF3',
  },
  campo: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#E6EDF3',
  },
  textarea: {
    width: '100%',
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0D1117',
    color: '#E6EDF3',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  alternativasContainer: {
    marginTop: 4,
  },
  alternativa: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputAlternativa: {
    flex: 1,
    minWidth: 0,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: '#0D1117',
    color: '#E6EDF3',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,
    fontSize: 14,
  },
  corretamente: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#7B1B38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelecionado: {
    backgroundColor: '#A52A4F',
    borderColor: '#A52A4F',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textoCorreta: {
    marginLeft: 6,
    fontSize: 13,
    color: '#8B949E',
  },
  remover: {
    width: 30,
    height: 30,
    marginLeft: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#872332',
  },
  removerDesabilitado: {
    opacity: 0.35,
  },
  removerTexto: {
    color: '#FCE7EB',
    fontSize: 14,
    fontWeight: 'bold',
  },
  botaoAdicionar: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,
  },
  textoAdicionar: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    marginTop: 5,
    marginBottom: 12,
    fontSize: 12,
    color: '#8B949E',
  },
  botao: {
    width: '100%',
    minHeight: 42,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B1B38',
    borderRadius: 6,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  textoBotao: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  botaoVoltar: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  textoVoltar: {
    color: '#A52A4F',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#8B949E',
  },
});