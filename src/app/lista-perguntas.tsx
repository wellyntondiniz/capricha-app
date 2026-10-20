import { ThemedText } from '@/components/themed-text';
import { Alternativa } from '@/services/alternativaService';
import { Palestra } from '@/services/palestraService';
import { deletarPerguntaById, listarPerguntas, Pergunta } from '@/services/perguntaService';
import { erro, sucesso } from '@/utils/notify';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type PerguntaComPalestra = {
  pergunta: Pergunta;
  palestra: Palestra | null;
};

export default function ListarPerguntas() {
  const router = useRouter();

  const [perguntas, setPerguntas] = useState<PerguntaComPalestra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro_, setErro] = useState<string | null>(null);
  const [modalExcluirVisivel, setModalExcluirVisivel] = useState(false);
  const [perguntaParaExcluir, setPerguntaParaExcluir] = useState<number | undefined>(undefined);
  const [excluindo, setExcluindo] = useState(false);

  const deletarPergunta = async (id: number | undefined) => {
  if (id === undefined) {
    erro('Erro', 'Não foi possível identificar a pergunta.');
    return;
  }
  try {
    await deletarPerguntaById(id);

    setPerguntas((listaAtual) =>
      listaAtual.filter(
        (item) => item.pergunta.id !== id
      )
    );

    sucesso('Sucesso', 'Pergunta excluída com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir pergunta:', error);
    erro('Erro', 'Não foi possível excluir a pergunta.');
  }

};

const solicitarExclusao = (id?: number) => {
  if (id === undefined) {
    erro('Erro', 'Não foi possível identificar a pergunta.');
    return;
  }

  setPerguntaParaExcluir(id);
  setModalExcluirVisivel(true);
};

const confirmarExclusao = async () => {
  if (perguntaParaExcluir === undefined || excluindo) {
    return;
  }

  try {
    setExcluindo(true);

    await deletarPergunta(perguntaParaExcluir);

    setPerguntas((listaAtual) =>
      listaAtual.filter(
        (item) => item.pergunta.id !== perguntaParaExcluir
      )
    );

    setModalExcluirVisivel(false);
    setPerguntaParaExcluir(undefined);

    sucesso('Sucesso', 'Pergunta excluída com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir pergunta:', error);
    erro('Erro', 'Não foi possível excluir a pergunta.');
  } finally {
    setExcluindo(false);
  }
};

  useEffect(() => {
   async function carregarPerguntas() {
    try {
      setCarregando(true);
      setErro(null);

      const dadosPerguntas = await listarPerguntas();

      const resultado: PerguntaComPalestra[] = dadosPerguntas.map(
        (pergunta) => ({
          pergunta,
          palestra: pergunta.palestra ?? null,
        })
      );

      setPerguntas(resultado);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      setErro('Não foi possível carregar as perguntas.');
    } finally {
      setCarregando(false);
    }
  }

  carregarPerguntas();
  }, []);

  function renderAlternativa(
    alternativa: Alternativa,
    index: number
  ) {
    const correta = alternativa.correta === true;

    return (
      <View
        key={alternativa.id ?? index}
        style={[
          styles.alternativa,
          correta
            ? styles.alternativaCorreta
            : styles.alternativaIncorreta,
        ]}
      >
        <View
          style={[
            styles.letraAlternativa,
            correta
              ? styles.letraCorreta
              : styles.letraIncorreta,
          ]}
        >
          <Text style={styles.letraTexto}>
            {String.fromCharCode(65 + index)}
          </Text>
        </View>

        <Text style={styles.textoAlternativa}>
          {alternativa.texto ?? 'Alternativa sem texto'}
        </Text>

        {correta && (
          <Text style={styles.indicadorCorreta}>
            ✓
          </Text>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Botões do cabeçalho */}
          <View style={styles.botoesCabecalho}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                }
              }}
              hitSlop={8}>
              <ThemedText themeColor="text" style={styles.voltar}>
                {'← Voltar'}
              </ThemedText>
            </Pressable>

            {/* Adicionar — direita */}
            <TouchableOpacity
              style={styles.botao}
              activeOpacity={0.7}
              onPress={() => router.push("/cadastro-perguntas")}
            >
              <Text style={styles.botaoTexto}>
                +
              </Text>
            </TouchableOpacity>
          </View>
          {/* Cabeçalho */}
          <View style={styles.logo}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoSymbol}>✦</Text>
            </View>

            <Text style={styles.titulo}>
              Perguntas cadastradas
            </Text>

            <Text style={styles.subtituloCabecalho}>
              Consulte as perguntas e suas alternativas
            </Text>
          </View>

          {/* Conteúdo */}
          <View style={styles.cardPrincipal}>
            <Text style={styles.tituloCard}>
              Todas as perguntas
            </Text>

            <Text style={styles.subtitulo}>
              {carregando
                ? 'Carregando perguntas...'
                : `${perguntas.length} ${
                    perguntas.length === 1
                      ? 'pergunta encontrada'
                      : 'perguntas encontradas'
                  }`}
            </Text>

            {carregando ? (
              <ActivityIndicator
                size="large"
                color="#7B1B38"
                style={styles.loading}
              />
            ) : erro_ ? (
              <Text style={styles.mensagem}>
                {erro_}
              </Text>
            ) : perguntas.length === 0 ? (
              <View style={styles.vazio}>
                <Text style={styles.simboloVazio}>✦</Text>

                <Text style={styles.tituloVazio}>
                  Nenhuma pergunta cadastrada
                </Text>

                <Text style={styles.mensagem}>
                  As perguntas aparecerão aqui quando forem
                  cadastradas.
                </Text>
              </View>
            ) : (
              perguntas.map(({ pergunta, palestra }, index) => (
                <View
                  key={pergunta.id ?? index}
                  style={styles.perguntaCard}
                >
                  {/* Número e enunciado */}
                  <View style={styles.perguntaCabecalho}>
                    <View style={styles.numeroPergunta}>
                      <Text style={styles.numeroTexto}>
                        {index + 1}
                      </Text>
                    </View>

                    <Text style={styles.enunciado}>
                      {pergunta.enunciado ??
                        'Pergunta sem enunciado'}
                    </Text>

                    <TouchableOpacity
                      style={styles.botaoExcluir}
                      activeOpacity={0.7}
                      onPress={() => solicitarExclusao(pergunta.id)}
                    >
                      <Text style={styles.botaoExcluirTexto}>
                        🗑
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Alternativas */}
                  <View style={styles.alternativasContainer}>
                    {(pergunta.alternativas ?? []).map(
                      (alternativa, alternativaIndex) =>
                        renderAlternativa(
                          alternativa,
                          alternativaIndex
                        )
                    )}

                    {(!pergunta.alternativas ||
                      pergunta.alternativas.length === 0) && (
                      <Text style={styles.mensagem}>
                        Nenhuma alternativa cadastrada.
                      </Text>
                    )}
                  </View>

                  {/* Palestra */}
                  <View style={styles.palestraContainer}>
                    <Text style={styles.palestraLabel}>
                      PALESTRA
                    </Text>

                    <Text style={styles.palestraNome}>
                      {palestra?.nome ??
                        (pergunta.palestra?.id !== undefined
                          ? `Palestra #${pergunta.palestra.id}`
                          : 'Palestra não informada')}
                    </Text>

                    <TouchableOpacity
                      style={styles.botaoExcluir}
                      activeOpacity={0.7}
                      onPress={() => solicitarExclusao(pergunta.id)}
                    >
                      <Text style={styles.botaoExcluirTexto}>
                        🗑
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.footer}>
            Capricha · Eventos
          </Text>
        </View>
      </ScrollView>
      <Modal
        visible={modalExcluirVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExcluirVisivel(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcone}>
              <Text style={styles.modalIconeTexto}>!</Text>
            </View>

            <Text style={styles.modalTitulo}>
              Excluir pergunta?
            </Text>

            <Text style={styles.modalMensagem}>
              Tem certeza de que deseja excluir esta pergunta?
              Essa ação não pode ser desfeita.
            </Text>

            <View style={styles.modalBotoes}>
              <Pressable
                style={styles.botaoCancelar}
                onPress={() => {
                  setModalExcluirVisivel(false);
                  setPerguntaParaExcluir(undefined);
                }}
                disabled={excluindo}
              >
                <Text style={styles.textoBotaoCancelar}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={styles.botaoConfirmarExcluir}
                onPress={confirmarExclusao}
                disabled={excluindo}
              >
                <Text style={styles.textoBotaoExcluir}>
                  {excluindo ? 'Excluindo...' : 'Excluir'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 24,
  },

  logo: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
    backgroundColor: '#7B1B38',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoSymbol: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  titulo: {
    color: '#E6EDF3',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
  },

  subtituloCabecalho: {
    color: '#8B949E',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  cardPrincipal: {
    padding: 20,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  tituloCard: {
    color: '#E6EDF3',
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 8,
  },

  subtitulo: {
    color: '#8B949E',
    fontSize: 14,
    marginBottom: 20,
  },

  perguntaCard: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 8,
    backgroundColor: '#111720',
  },

  perguntaCabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },

  numeroPergunta: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7B1B38',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  numeroTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  enunciado: {
    flex: 1,
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    paddingTop: 4,
  },

  alternativasContainer: {
    gap: 8,
  },

  alternativa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },

  alternativaCorreta: {
    backgroundColor: '#10291F',
    borderColor: '#238636',
  },

  alternativaIncorreta: {
    backgroundColor: '#171C24',
    borderColor: '#30363D',
  },

  letraAlternativa: {
    width: 26,
    height: 26,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  letraCorreta: {
    backgroundColor: '#238636',
  },

  letraIncorreta: {
    backgroundColor: '#30363D',
  },

  letraTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  textoAlternativa: {
    flex: 1,
    color: '#E6EDF3',
    fontSize: 13,
    lineHeight: 19,
  },

  indicadorCorreta: {
    color: '#3FB950',
    fontSize: 18,
    fontWeight: 'bold',
  },

  palestraContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#30363D',
  },

  palestraLabel: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  palestraNome: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '500',
  },

  loading: {
    marginVertical: 24,
  },

  mensagem: {
    color: '#8B949E',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginVertical: 16,
  },

  vazio: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  simboloVazio: {
    color: '#7B1B38',
    fontSize: 36,
    marginBottom: 12,
  },

  tituloVazio: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  botoesCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },

  botao: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7B1B38',
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoTexto: {
    color: '#E6EDF3',
    fontSize: 22,
    fontWeight: 'bold',
  },

  footer: {
    color: '#8B949E',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 12,
  },

  botaoExcluir: {
    marginLeft: 'auto',
    padding: 8,
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#872332',
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoExcluirTexto: {
    fontSize: 18,
    color: '#FCE7EB',
  },

  modalFundo: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24,
},

modalCard: {
  width: '100%',
  maxWidth: 420,
  backgroundColor: '#171B26',
  borderRadius: 20,
  padding: 24,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#303544',
},

modalIcone: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: '#3B202B',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 16,
},

modalIconeTexto: {
  color: '#F87171',
  fontSize: 28,
  fontWeight: 'bold',
},

modalTitulo: {
  color: '#FFFFFF',
  fontSize: 20,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 10,
},

modalMensagem: {
  color: '#AAB1C2',
  fontSize: 14,
  textAlign: 'center',
  lineHeight: 21,
  marginBottom: 24,
},

modalBotoes: {
  flexDirection: 'row',
  width: '100%',
  gap: 12,
},

botaoCancelar: {
  flex: 1,
  paddingVertical: 13,
  borderRadius: 10,
  backgroundColor: '#292F3D',
  alignItems: 'center',
},

textoBotaoCancelar: {
  color: '#FFFFFF',
  fontWeight: '600',
},

botaoConfirmarExcluir: {
  flex: 1,
  paddingVertical: 13,
  borderRadius: 10,
  backgroundColor: '#7B1B38',
  alignItems: 'center',
},

textoBotaoExcluir: {
  color: '#FFFFFF',
  fontWeight: 'bold',
},

voltar: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});