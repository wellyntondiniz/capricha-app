import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Evento,
  atualizarEvento,
  cadastrarEvento,
  desativarEvento,
  listarEventos,
} from '@/services/eventoService';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FormState = {
  nome: string;
  descricao: string;
  dataInicio: string; // dd/mm/aaaa
  dataTermino: string; // dd/mm/aaaa
};

const FORM_VAZIO: FormState = {
  nome: '',
  descricao: '',
  dataInicio: '',
  dataTermino: '',
};

const REGEX_DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function dataParaIso(data: string): string | undefined {
  const match = data.trim().match(REGEX_DATA);
  if (!match) return undefined;
  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}T00:00:00`;
}

function isoParaData(iso?: string): string {
  if (!iso) return '';
  const [dataParte] = iso.split('T');
  const [ano, mes, dia] = dataParte.split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

export default function EventoScreen() {
  const theme = useTheme();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Evento | null>(null);

  const [pesquisa, setPesquisa] = useState('');

  const eventosFiltrados = eventos.filter((item) =>
    item.nome.toLowerCase().includes(pesquisa.toLowerCase())
  );

  async function carregar() {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const dados = await listarEventos();
      setEventos(dados);
    } catch {
      setErroCarregar('Não foi possível carregar os eventos.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErroForm(null);
    setModalVisivel(true);
  }

  function abrirEditar(evento: Evento) {
    setEditandoId(evento.id!);
    setForm({
      nome: evento.nome,
      descricao: evento.descricao ?? '',
      dataInicio: isoParaData(evento.dataInicio),
      dataTermino: isoParaData(evento.dataTermino),
    });
    setErroForm(null);
    setModalVisivel(true);
  }

  function validarFormulario(): boolean {
    if (!form.nome || form.nome.trim() === '') {
      setErroForm('Nome é obrigatório.');
      return false;
    }

    if (form.dataInicio && !REGEX_DATA.test(form.dataInicio.trim())) {
      setErroForm('Data de início inválida. Use o formato dd/mm/aaaa.');
      return false;
    }

    if (form.dataTermino && !REGEX_DATA.test(form.dataTermino.trim())) {
      setErroForm('Data de término inválida. Use o formato dd/mm/aaaa.');
      return false;
    }

    if (form.dataTermino && !form.dataInicio) {
      setErroForm('Data de término só pode existir se houver data de início.');
      return false;
    }

    if (form.dataInicio && form.dataTermino) {
      const inicio = dataParaIso(form.dataInicio);
      const termino = dataParaIso(form.dataTermino);
      if (inicio && termino && termino < inicio) {
        setErroForm('Data de término não pode ser antes da data de início.');
        return false;
      }
    }

    setErroForm(null);
    return true;
  }

  async function salvar() {
    if (!validarFormulario()) return;

    setSalvando(true);
    try {
      const dados = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        dataInicio: dataParaIso(form.dataInicio),
        dataTermino: dataParaIso(form.dataTermino),
      };

      if (editandoId !== null) {
        await atualizarEvento(editandoId, dados);
      } else {
        await cadastrarEvento(dados);
      }
      setModalVisivel(false);
      await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Não foi possível salvar o evento.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!itemSelecionado) return;

    try {
      await desativarEvento(itemSelecionado.id!);
      await carregar();
    } catch {
      // mantém o modal fechado mesmo se der erro; a lista não muda, refletindo o estado real
    } finally {
      setModalExcluir(false);
      setItemSelecionado(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
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
          <ThemedText type="subtitle">Eventos</ThemedText>
          <Pressable onPress={abrirNovo} style={styles.novoBotao}>
            <ThemedText style={styles.novoTexto}>+ Novo</ThemedText>
          </Pressable>
        </View>

        <View style={styles.pesquisaContainer}>
          <TextInput
            style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
            placeholder="Pesquisar evento..."
            value={pesquisa}
            onChangeText={setPesquisa}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {carregando ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : erroCarregar ? (
          <View style={styles.vazio}>
            <ThemedText themeColor="textSecondary">{erroCarregar}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={eventosFiltrados}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <View style={styles.vazio}>
                <ThemedText type="smallBold">Nenhum evento cadastrado.</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Toque em &quot;+ Novo&quot; para adicionar.
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.cardInfo}>
                  <ThemedText type="smallBold">{item.nome}</ThemedText>
                  {!!item.descricao && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.descricao}
                    </ThemedText>
                  )}
                  {!!item.dataInicio && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {isoParaData(item.dataInicio)}
                      {item.dataTermino ? ` até ${isoParaData(item.dataTermino)}` : ''}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.cardAcoes}>
                  <Pressable
                    onPress={() => abrirEditar(item)}
                    style={({ pressed }) => [styles.editarBtn, pressed && { opacity: 0.7 }]}>
                    <ThemedText type="small" themeColor="linkPrimary">
                      Editar
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setItemSelecionado(item);
                      setModalExcluir(true);
                    }}
                    style={({ pressed }) => [styles.excluirBtn, pressed && { opacity: 0.7 }]}>
                    <ThemedText type="small" style={styles.excluirTexto}>
                      Excluir
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            )}
          />
        )}

        {/* Modal de formulário */}
        <Modal
          visible={modalVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisivel(false)}>
          <KeyboardAvoidingView
            style={styles.overlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <ThemedView style={styles.modal}>
                <ThemedText type="subtitle" style={styles.modalTitulo}>
                  {editandoId !== null ? 'Editar evento' : 'Novo evento'}
                </ThemedText>

                <ThemedText type="smallBold" style={styles.label}>
                  Nome *
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  value={form.nome}
                  onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))}
                  placeholder="Ex: Semana Acadêmica de Computação"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="sentences"
                />

                <ThemedText type="smallBold" style={styles.label}>
                  Descrição
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  value={form.descricao}
                  onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))}
                  placeholder="Digite uma descrição"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="sentences"
                  multiline
                />

                <ThemedText type="smallBold" style={styles.label}>
                  Data de início
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  value={form.dataInicio}
                  onChangeText={(v) => setForm((f) => ({ ...f, dataInicio: v }))}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />

                <ThemedText type="smallBold" style={styles.label}>
                  Data de término
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  value={form.dataTermino}
                  onChangeText={(v) => setForm((f) => ({ ...f, dataTermino: v }))}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />

                {!!erroForm && (
                  <ThemedText type="small" style={styles.erroTexto}>
                    {erroForm}
                  </ThemedText>
                )}

                <View style={styles.modalAcoes}>
                  <Pressable
                    onPress={() => setModalVisivel(false)}
                    style={({ pressed }) => [
                      styles.cancelarBtn,
                      { borderColor: theme.backgroundSelected },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <ThemedText type="smallBold">Cancelar</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={salvar}
                    disabled={salvando}
                    style={({ pressed }) => [
                      styles.salvarBtn,
                      { backgroundColor: theme.text },
                      (pressed || salvando) && { opacity: 0.7 },
                    ]}>
                    {salvando ? (
                      <ActivityIndicator color={theme.background} size="small" />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: theme.background }}>
                        Salvar
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </ThemedView>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal de confirmação de exclusão */}
        <Modal
          visible={modalExcluir}
          transparent
          animationType="fade"
          onRequestClose={() => setModalExcluir(false)}>
          <View style={styles.modalExcluirOverlay}>
            <ThemedView style={styles.modalExcluirContainer}>
              <ThemedText type="smallBold">Confirmar exclusão</ThemedText>
              <ThemedText type="small">
                Deseja realmente excluir{' '}
                <ThemedText type="smallBold">{itemSelecionado?.nome}</ThemedText>?
              </ThemedText>

              <View style={styles.modalExcluirAcoes}>
                <Pressable
                  style={[styles.modalExcluirCancelar, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => setModalExcluir(false)}>
                  <ThemedText type="smallBold">Cancelar</ThemedText>
                </Pressable>
                <Pressable style={styles.modalExcluirConfirmar} onPress={confirmarExclusao}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    Excluir
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  voltar: {
    fontSize: 16,
    fontWeight: '600',
  },
  novoBotao: {
    backgroundColor: '#3c87f7',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  novoTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
  },
  lista: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
    gap: Spacing.one,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardAcoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editarBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  excluirBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  excluirTexto: {
    color: '#e53935',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  overlayScroll: {
    justifyContent: 'flex-end',
    flexGrow: 1,
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitulo: {
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  label: {
    marginTop: Spacing.one,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  erroTexto: {
    color: '#e53935',
    marginTop: Spacing.one,
  },
  modalAcoes: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  cancelarBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  salvarBtn: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  modalExcluirOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalExcluirContainer: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    width: '80%',
    gap: Spacing.two,
  },
  modalExcluirAcoes: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modalExcluirCancelar: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  modalExcluirConfirmar: {
    flex: 1,
    paddingVertical: Spacing.two,
    backgroundColor: '#e53935',
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  pesquisaContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
});
