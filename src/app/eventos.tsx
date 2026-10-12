import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Evento,
  EventoApiError,
  atualizarEvento,
  cadastrarEvento,
  desativarEvento,
  listarEventos,
  listarPalestrasDoEvento,
} from '@/services/eventoService';
import { Palestra } from '@/services/palestraService';
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
  dataInicio: string;
  horaInicio: string;
  dataTermino: string;
  horaTermino: string;
};

const FORM_VAZIO: FormState = {
  nome: '',
  descricao: '',
  dataInicio: '',
  horaInicio: '',
  dataTermino: '',
  horaTermino: '',
};

const REGEX_DATA = /^\d{2}\/\d{2}\/\d{4}$/;
const REGEX_HORA = /^\d{2}:\d{2}$/;

const formatarData = (texto: string) => {
  let valor = texto.replace(/\D/g, '');
  if (valor.length > 2) valor = valor.slice(0, 2) + '/' + valor.slice(2);
  if (valor.length > 5) valor = valor.slice(0, 5) + '/' + valor.slice(5, 9);
  return valor;
};

const formatarHora = (texto: string) => {
  let valor = texto.replace(/\D/g, '');
  if (valor.length > 2) valor = valor.slice(0, 2) + ':' + valor.slice(2, 4);
  return valor;
};

const dataValida = (data: string): boolean => {
  if (!REGEX_DATA.test(data)) return false;
  const [dia, mes, ano] = data.split('/').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
};

const horaValida = (horario: string): boolean => {
  if (!REGEX_HORA.test(horario)) return false;
  const [hora, minuto] = horario.split(':').map(Number);
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
};

const paraDataHora = (data: string, horario: string): Date => {
  const [dia, mes, ano] = data.split('/').map(Number);
  const [hora, minuto] = horario.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto);
};

const agoraSemSegundos = (): Date => {
  const agora = new Date();
  agora.setSeconds(0, 0);
  return agora;
};

const paraIso = (data: string, hora: string): string | undefined => {
  const dataLimpa = data.trim();
  if (!dataLimpa) return undefined;
  const [dia, mes, ano] = dataLimpa.split('/');
  if (!dia || !mes || !ano) return undefined;
  return `${ano}-${mes}-${dia}T${hora.trim() || '00:00'}:00`;
};

const isoParaData = (iso?: string): string => {
  if (!iso) return '';
  const [dataParte] = iso.split('T');
  const [ano, mes, dia] = dataParte.split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
};

// "2026-10-05T14:30:00" -> "14:30"
const isoParaHora = (iso?: string): string => {
  if (!iso) return '';
  const [, horaParte] = iso.split('T');
  return horaParte ? horaParte.slice(0, 5) : '';
};

// "2026-10-05T14:30:00" -> "05/10/2026 14:30"
const formatarDataHora = (iso?: string): string => {
  const data = isoParaData(iso);
  const hora = isoParaHora(iso);
  return `${data}${hora ? ' ' + hora : ''}`;
};

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

  // Detalhe do evento (palestras)
  const [eventoAberto, setEventoAberto] = useState<Evento | null>(null);
  const [palestras, setPalestras] = useState<Palestra[]>([]);
  const [carregandoPalestras, setCarregandoPalestras] = useState(false);

  const eventosFiltrados = eventos.filter((item) =>
    (item.nome ?? '').toLowerCase().includes(pesquisa.toLowerCase())
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

  async function abrirEvento(evento: Evento) {
    setEventoAberto(evento);
    setCarregandoPalestras(true);
    setPalestras([]);

    try {
      const dados = await listarPalestrasDoEvento(evento.id!);
      setPalestras(dados);
    } catch {
      setPalestras([]);
    } finally {
      setCarregandoPalestras(false);
    }
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErroForm(null);
    setModalVisivel(true);
  }

  function abrirEditar(evento: Evento) {
    setEditandoId(evento.id!);
    setForm({
      nome: evento.nome ?? '',
      descricao: evento.descricao ?? '',
      dataInicio: isoParaData(evento.dataInicio),
      horaInicio: isoParaHora(evento.dataInicio),
      dataTermino: isoParaData(evento.dataTermino),
      horaTermino: isoParaHora(evento.dataTermino),
    });
    setErroForm(null);
    setModalVisivel(true);
  }

  function validarFormulario(): boolean {
    if (!form.nome || form.nome.trim() === '') {
      setErroForm('Nome é obrigatório.');
      return false;
    }

    const temInicio = form.dataInicio.trim() !== '' || form.horaInicio.trim() !== '';
    const temTermino = form.dataTermino.trim() !== '' || form.horaTermino.trim() !== '';

    let inicio: Date | null = null;

    if (temInicio) {
      if (!dataValida(form.dataInicio.trim())) {
        setErroForm('Data de início inválida. Use o formato dd/mm/aaaa.');
        return false;
      }

      if (!horaValida(form.horaInicio.trim())) {
        setErroForm('Horário de início inválido. Use o formato hh:mm.');
        return false;
      }

      inicio = paraDataHora(form.dataInicio.trim(), form.horaInicio.trim());

      if (editandoId === null && inicio < agoraSemSegundos()) {
        setErroForm('O início do evento não pode ser em uma data e horário que já passaram.');
        return false;
      }
    }

    if (temTermino) {
      if (!inicio) {
        setErroForm('Para informar o término, informe também o início do evento.');
        return false;
      }

      if (!dataValida(form.dataTermino.trim())) {
        setErroForm('Data de término inválida. Use o formato dd/mm/aaaa.');
        return false;
      }

      if (!horaValida(form.horaTermino.trim())) {
        setErroForm('Horário de término inválido. Use o formato hh:mm.');
        return false;
      }

      const termino = paraDataHora(form.dataTermino.trim(), form.horaTermino.trim());

      if (termino.getTime() === inicio.getTime()) {
        setErroForm('O início e o término do evento não podem ser no mesmo horário.');
        return false;
      }

      if (termino < inicio) {
        setErroForm('O término não pode ser anterior ao início do evento.');
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
        dataInicio: paraIso(form.dataInicio, form.horaInicio),
        dataTermino: paraIso(form.dataTermino, form.horaTermino),
      };

      if (editandoId !== null) {
        await atualizarEvento(editandoId, dados);
      } else {
        await cadastrarEvento(dados);
      }
      setModalVisivel(false);
      await carregar();
    } catch (e) {
      const erro = e as EventoApiError;
      setErroForm(erro?.message || 'Não foi possível salvar o evento.');
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
    } finally {
      setModalExcluir(false);
      setItemSelecionado(null);
    }
  }

  if (eventoAberto) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => setEventoAberto(null)} hitSlop={8}>
              <ThemedText themeColor="text" style={styles.voltar}>
                {'← Voltar para eventos'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.detalhe}>
            <ThemedText type="subtitle">{eventoAberto.nome}</ThemedText>
            {!!eventoAberto.descricao && (
              <ThemedText type="small" themeColor="textSecondary">
                {eventoAberto.descricao}
              </ThemedText>
            )}
            {!!eventoAberto.dataInicio && (
              <ThemedText type="small" themeColor="textSecondary">
                {formatarDataHora(eventoAberto.dataInicio)}
                {eventoAberto.dataTermino ? ` até ${formatarDataHora(eventoAberto.dataTermino)}` : ''}
              </ThemedText>
            )}
            <ThemedText type="smallBold" style={styles.tituloSecao}>
              Palestras
            </ThemedText>
          </View>

          {carregandoPalestras ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <FlatList
              data={palestras}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.lista}
              ListEmptyComponent={
                <View style={styles.vazio}>
                  <ThemedText type="smallBold">Este evento não possui palestras cadastradas.</ThemedText>
                </View>
              }
              renderItem={({ item }) => (
                <ThemedView type="backgroundElement" style={styles.cardPalestra}>
                  <ThemedText type="smallBold">{item.nome}</ThemedText>
                  {!!item.descricao && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.descricao}
                    </ThemedText>
                  )}
                  <ThemedText type="small" themeColor="textSecondary">
                    Palestrante: {item.palestrante}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.data} às {item.horario}
                  </ThemedText>
                </ThemedView>
              )}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    );
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
                <Pressable style={styles.cardInfo} onPress={() => abrirEvento(item)}>
                  <ThemedText type="smallBold">{item.nome}</ThemedText>
                  {!!item.descricao && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.descricao}
                    </ThemedText>
                  )}
                  {!!item.dataInicio && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatarDataHora(item.dataInicio)}
                      {item.dataTermino ? ` até ${formatarDataHora(item.dataTermino)}` : ''}
                    </ThemedText>
                  )}
                </Pressable>
                <View style={styles.cardAcoes}>
                  <Pressable
                    onPress={() => abrirEditar(item)}
                    style={({ pressed }) => [styles.editarBtn, pressed && { opacity: 0.7 }]}>
                    <ThemedText type="small" style={styles.editarTexto}>
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
                  Início (opcional)
                </ThemedText>
                <View style={styles.linhaDataHora}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputData,
                      { borderColor: theme.backgroundSelected, color: theme.text },
                    ]}
                    value={form.dataInicio}
                    onChangeText={(v) => setForm((f) => ({ ...f, dataInicio: formatarData(v) }))}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputHora,
                      { borderColor: theme.backgroundSelected, color: theme.text },
                    ]}
                    value={form.horaInicio}
                    onChangeText={(v) => setForm((f) => ({ ...f, horaInicio: formatarHora(v) }))}
                    placeholder="hh:mm"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>

                <ThemedText type="smallBold" style={styles.label}>
                  Término (opcional)
                </ThemedText>
                <View style={styles.linhaDataHora}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputData,
                      { borderColor: theme.backgroundSelected, color: theme.text },
                    ]}
                    value={form.dataTermino}
                    onChangeText={(v) => setForm((f) => ({ ...f, dataTermino: formatarData(v) }))}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputHora,
                      { borderColor: theme.backgroundSelected, color: theme.text },
                    ]}
                    value={form.horaTermino}
                    onChangeText={(v) => setForm((f) => ({ ...f, horaTermino: formatarHora(v) }))}
                    placeholder="hh:mm"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>

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
    backgroundColor: '#A71948',
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
  editarTexto: {
    color: '#A92B50',
  },
  excluirBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  excluirTexto: {
    color: '#e53935',
  },
  detalhe: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  tituloSecao: {
    marginTop: Spacing.three,
  },
  cardPalestra: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: 2,
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
  linhaDataHora: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  inputData: {
    flex: 2,
  },
  inputHora: {
    flex: 1,
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