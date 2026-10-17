import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { LectureCheckInAction } from '@/features/check-in/lecture-check-in-action';
import { useAuth } from '@/contexts/AuthContext';
import {
  Evento,
  EventoApiError,
  atualizarEvento,
  cadastrarEvento,
  desativarEvento,
  listarEventos,
  listarPalestrasDoEvento,
} from '@/services/eventoService';
import { Palestra, obterUrlImagemPalestra } from '@/services/palestraService';

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
  return `${data}${hora ? ' às ' + hora : ''}`;
};

export default function EventoScreen() {
  const { usuario } = useAuth();
  const ehAdmin =
    usuario?.perfil?.toUpperCase() === 'ADMIN' ||
    usuario?.perfil?.toUpperCase() === 'ADMINISTRADOR';

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
      // ignora erro de exclusão
    } finally {
      setModalExcluir(false);
      setItemSelecionado(null);
    }
  }

  if (eventoAberto) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.conteudo}>
          <View style={styles.cabecalho}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar para eventos"
              onPress={() => setEventoAberto(null)}
              style={styles.botaoVoltar}>
              <Ionicons name="arrow-back" size={22} color={Cores.texto} />
            </Pressable>
            <View style={styles.titulos}>
              <Text style={styles.titulo} numberOfLines={1}>
                {eventoAberto.nome}
              </Text>
              <Text style={styles.subtitulo}>Detalhes e programação do evento</Text>
            </View>
          </View>

          <View style={styles.cardDetalheEvento}>
            {!!eventoAberto.descricao && (
              <Text style={styles.detalheDescricao}>{eventoAberto.descricao}</Text>
            )}
            {!!eventoAberto.dataInicio && (
              <View style={styles.metaLinha}>
                <Ionicons name="calendar-outline" size={16} color={Cores.destaque} />
                <Text style={styles.metaTexto}>
                  {formatarDataHora(eventoAberto.dataInicio)}
                  {eventoAberto.dataTermino ? ` até ${formatarDataHora(eventoAberto.dataTermino)}` : ''}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() =>
                router.push({ pathname: '/resumos', params: { eventoId: String(eventoAberto.id) } })
              }
              style={({ pressed }) => [styles.resumosBotao, pressed && { opacity: 0.8 }]}
              accessibilityRole="button">
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.resumosTexto}>Ver resumos do evento</Text>
            </Pressable>
          </View>

          <Text style={styles.tituloSecao}>Palestras do evento</Text>

          {carregandoPalestras ? (
            <View style={styles.centralizado}>
              <ActivityIndicator size="large" color={Cores.destaque} />
              <Text style={styles.textoSuave}>Carregando palestras...</Text>
            </View>
          ) : (
            <FlatList
              data={palestras}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={palestras.length === 0 ? styles.listaVazia : styles.lista}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.estadoVazio}>
                  <Ionicons name="mic-off-outline" size={38} color={Cores.vinhoClaro} />
                  <Text style={styles.estadoTitulo}>Nenhuma palestra neste evento</Text>
                  <Text style={styles.textoSuave}>
                    Este evento ainda não possui palestras cadastradas.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const urlImagem = obterUrlImagemPalestra(item.imagem);

                return (
                  <View style={styles.cardPalestra}>
                    {urlImagem ? (
                      <Image
                        source={{ uri: urlImagem }}
                        style={styles.imagemPalestra}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagemSemImagem}>
                        <Ionicons name="image-outline" size={36} color={Cores.vinhoClaro} />
                      </View>
                    )}
                    <View style={styles.cardPalestraCorpo}>
                      <Text style={styles.cardTitulo}>{item.nome}</Text>
                      {!!item.descricao && (
                        <Text style={styles.cardDescricao}>{item.descricao}</Text>
                      )}
                      <View style={styles.metaLinha}>
                        <Ionicons name="person-outline" size={15} color={Cores.textoSuave} />
                        <Text style={styles.metaTexto}>{item.palestrante}</Text>
                      </View>
                      <View style={styles.metaLinha}>
                        <Ionicons name="time-outline" size={15} color={Cores.textoSuave} />
                        <Text style={styles.metaTexto}>
                          {item.data} às {item.horario}
                        </Text>
                      </View>
                      <LectureCheckInAction lectureId={item.id} />
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.conteudo}>
        {/* Cabeçalho no padrão do projeto */}
        <View style={styles.cabecalho}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            style={styles.botaoVoltar}>
            <Ionicons name="arrow-back" size={22} color={Cores.texto} />
          </Pressable>

          <View style={styles.titulos}>
            <Text accessibilityRole="header" style={styles.titulo}>
              Eventos
            </Text>
            <Text style={styles.subtitulo}>
              {ehAdmin ? 'Gerencie e consulte os eventos cadastrados' : 'Consulte os eventos disponíveis'}
            </Text>
          </View>

          {ehAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cadastrar novo evento"
              onPress={abrirNovo}
              style={({ pressed }) => [styles.novoBotao, pressed && { opacity: 0.8 }]}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.novoTexto}>Novo</Text>
            </Pressable>
          )}
        </View>

        {/* Barra de pesquisa */}
        <View style={styles.pesquisaBox}>
          <Ionicons name="search-outline" size={18} color={Cores.inativo} />
          <TextInput
            style={styles.pesquisaInput}
            placeholder="Pesquisar evento pelo nome..."
            value={pesquisa}
            onChangeText={setPesquisa}
            placeholderTextColor={Cores.inativo}
          />
          {pesquisa.length > 0 && (
            <Pressable onPress={() => setPesquisa('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Cores.inativo} />
            </Pressable>
          )}
        </View>

        {carregando ? (
          <View style={styles.centralizado}>
            <ActivityIndicator size="large" color={Cores.destaque} />
            <Text style={styles.textoSuave}>Carregando eventos...</Text>
          </View>
        ) : erroCarregar ? (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={42} color={Cores.destaque} />
            <Text style={styles.estadoTitulo}>Não foi possível carregar</Text>
            <Text style={styles.textoSuave}>{erroCarregar}</Text>
            <Pressable style={styles.tentarNovamente} onPress={carregar}>
              <Text style={styles.tentarNovamenteTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={eventosFiltrados}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={eventosFiltrados.length === 0 ? styles.listaVazia : styles.lista}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.estadoVazio}>
                <Ionicons name="calendar-outline" size={42} color={Cores.vinhoClaro} />
                <Text style={styles.estadoTitulo}>Nenhum evento encontrado</Text>
                <Text style={styles.textoSuave}>
                  {ehAdmin
                    ? 'Toque no botão "+ Novo" no topo para cadastrar um evento.'
                    : 'Não há eventos disponíveis no momento.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Pressable
                  style={({ pressed }) => [styles.cardInfo, pressed && { opacity: 0.85 }]}
                  onPress={() => abrirEvento(item)}>
                  <View style={styles.cardTopo}>
                    <View style={styles.iconeEventoBox}>
                      <Ionicons name="calendar" size={22} color={Cores.destaque} />
                    </View>
                    <View style={styles.cardTextos}>
                      <Text style={styles.cardTitulo}>{item.nome}</Text>
                      {!!item.dataInicio ? (
                        <View style={styles.metaLinha}>
                          <Ionicons name="time-outline" size={14} color={Cores.textoSuave} />
                          <Text style={styles.metaTexto}>
                            {formatarDataHora(item.dataInicio)}
                            {item.dataTermino ? ` até ${formatarDataHora(item.dataTermino)}` : ''}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.metaTexto}>Data a definir</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Cores.textoSuave} />
                  </View>

                  {!!item.descricao && (
                    <Text style={styles.cardDescricao} numberOfLines={2}>
                      {item.descricao}
                    </Text>
                  )}
                </Pressable>

                {ehAdmin && (
                  <View style={styles.cardAcoes}>
                    <Pressable
                      onPress={() => abrirEditar(item)}
                      style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}>
                      <Ionicons name="create-outline" size={16} color={Cores.vinhoClaro} />
                      <Text style={styles.editarTexto}>Editar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setItemSelecionado(item);
                        setModalExcluir(true);
                      }}
                      style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}>
                      <Ionicons name="trash-outline" size={16} color="#E5484D" />
                      <Text style={styles.excluirTexto}>Excluir</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          />
        )}

        {/* Modal de cadastro / edição de evento */}
        <Modal
          visible={modalVisivel}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisivel(false)}>
          <KeyboardAvoidingView
            style={styles.overlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.overlayScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.modal}>
                <View style={styles.modalCabecalho}>
                  <View style={styles.modalIconeTitulo}>
                    <Ionicons name="calendar" size={20} color={Cores.destaque} />
                  </View>
                  <Text style={styles.modalTitulo}>
                    {editandoId !== null ? 'Editar evento' : 'Novo evento'}
                  </Text>
                  <Pressable
                    onPress={() => setModalVisivel(false)}
                    hitSlop={8}
                    style={styles.modalFechar}>
                    <Ionicons name="close" size={22} color={Cores.textoSuave} />
                  </Pressable>
                </View>

                <Text style={styles.label}>Nome do evento *</Text>
                <TextInput
                  style={styles.input}
                  value={form.nome}
                  onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))}
                  placeholder="Ex: Semana Acadêmica de Computação"
                  placeholderTextColor={Cores.inativo}
                  autoCapitalize="sentences"
                />

                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.descricao}
                  onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))}
                  placeholder="Descreva os detalhes do evento"
                  placeholderTextColor={Cores.inativo}
                  autoCapitalize="sentences"
                  multiline
                  textAlignVertical="top"
                />

                <Text style={styles.label}>Início (opcional)</Text>
                <View style={styles.linhaDataHora}>
                  <TextInput
                    style={[styles.input, styles.inputData]}
                    value={form.dataInicio}
                    onChangeText={(v) => setForm((f) => ({ ...f, dataInicio: formatarData(v) }))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={Cores.inativo}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <TextInput
                    style={[styles.input, styles.inputHora]}
                    value={form.horaInicio}
                    onChangeText={(v) => setForm((f) => ({ ...f, horaInicio: formatarHora(v) }))}
                    placeholder="HH:MM"
                    placeholderTextColor={Cores.inativo}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>

                <Text style={styles.label}>Término (opcional)</Text>
                <View style={styles.linhaDataHora}>
                  <TextInput
                    style={[styles.input, styles.inputData]}
                    value={form.dataTermino}
                    onChangeText={(v) => setForm((f) => ({ ...f, dataTermino: formatarData(v) }))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={Cores.inativo}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <TextInput
                    style={[styles.input, styles.inputHora]}
                    value={form.horaTermino}
                    onChangeText={(v) => setForm((f) => ({ ...f, horaTermino: formatarHora(v) }))}
                    placeholder="HH:MM"
                    placeholderTextColor={Cores.inativo}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>

                {!!erroForm && (
                  <View style={styles.erroBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#FF6B70" />
                    <Text style={styles.erroTexto}>{erroForm}</Text>
                  </View>
                )}

                <View style={styles.modalAcoes}>
                  <Pressable
                    onPress={() => setModalVisivel(false)}
                    disabled={salvando}
                    style={({ pressed }) => [styles.cancelarBtn, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.cancelarTexto}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={salvar}
                    disabled={salvando}
                    style={({ pressed }) => [
                      styles.salvarBtn,
                      (pressed || salvando) && { opacity: 0.7 },
                    ]}>
                    {salvando ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.salvarTexto}>
                        {editandoId !== null ? 'Salvar alterações' : 'Cadastrar evento'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
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
            <View style={styles.modalExcluirContainer}>
              <Text style={styles.modalExcluirTitulo}>Excluir evento?</Text>
              <Text style={styles.modalExcluirTexto}>
                Deseja realmente excluir o evento{' '}
                <Text style={styles.modalExcluirDestaque}>{itemSelecionado?.nome}</Text>?
              </Text>

              <View style={styles.modalExcluirAcoes}>
                <Pressable
                  style={({ pressed }) => [styles.cancelarBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setModalExcluir(false)}>
                  <Text style={styles.cancelarTexto}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalExcluirConfirmar,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={confirmarExclusao}>
                  <Text style={styles.salvarTexto}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  botaoVoltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
  },
  titulos: { flex: 1 },
  titulo: { color: Cores.texto, fontSize: 24, fontWeight: '700' },
  subtitulo: { color: Cores.textoSuave, fontSize: 13, marginTop: 2 },
  novoBotao: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
  },
  novoTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  pesquisaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    marginBottom: 14,
  },
  pesquisaInput: {
    flex: 1,
    color: Cores.texto,
    fontSize: 15,
    height: '100%',
  },

  centralizado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lista: { gap: 14, paddingBottom: 32 },
  listaVazia: { flexGrow: 1, justifyContent: 'center', paddingBottom: 48 },

  estadoVazio: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    gap: 6,
  },
  estadoTitulo: { color: Cores.texto, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  textoSuave: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  tentarNovamente: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Cores.vinhoClaro,
  },
  tentarNovamenteTexto: { color: Cores.vinhoClaro, fontWeight: '700' },

  card: {
    borderRadius: 16,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: 16,
    gap: 12,
  },
  cardInfo: { gap: 10 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconeEventoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Cores.vinhoSuave,
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 111, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextos: { flex: 1, gap: 3 },
  cardTitulo: { color: Cores.texto, fontSize: 17, fontWeight: '700' },
  cardDescricao: { color: Cores.textoSuave, fontSize: 13, lineHeight: 19 },
  metaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTexto: { color: Cores.textoSuave, fontSize: 13 },

  cardAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingTop: 10,
  },
  acaoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  editarTexto: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '600' },
  excluirTexto: { color: '#E5484D', fontSize: 14, fontWeight: '600' },

  // Detalhe do evento
  cardDetalheEvento: {
    borderRadius: 16,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  detalheDescricao: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20 },
  resumosBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
  },
  resumosTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  tituloSecao: { color: Cores.texto, fontSize: 18, fontWeight: '700', marginBottom: 12 },

  cardPalestra: {
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
  },
  imagemPalestra: { width: 120, minHeight: 120 },
  imagemSemImagem: {
    width: 120,
    minHeight: 120,
    backgroundColor: Cores.vinhoSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPalestraCorpo: { flex: 1, padding: 14, gap: 6 },

  // Modal de cadastro / edição
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  overlayScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    padding: 22,
    gap: 8,
  },
  modalCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalIconeTitulo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Cores.vinhoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitulo: { flex: 1, color: Cores.texto, fontSize: 20, fontWeight: '700' },
  modalFechar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Cores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: Cores.texto, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Cores.texto,
    backgroundColor: Cores.fundo,
  },
  textArea: { minHeight: 96, paddingTop: 12 },
  linhaDataHora: { flexDirection: 'row', gap: 10 },
  inputData: { flex: 2 },
  inputHora: { flex: 1 },
  erroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 72, 77, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(229, 72, 77, 0.4)',
  },
  erroTexto: { flex: 1, color: '#FF6B70', fontSize: 13, fontWeight: '600' },
  modalAcoes: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelarBtn: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Cores.fundo,
  },
  cancelarTexto: { color: Cores.texto, fontSize: 15, fontWeight: '600' },
  salvarBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salvarTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Modal de exclusão
  modalExcluirOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalExcluirContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 22,
    borderRadius: 16,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    gap: 10,
  },
  modalExcluirTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700' },
  modalExcluirTexto: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20 },
  modalExcluirDestaque: { color: Cores.texto, fontWeight: '700' },
  modalExcluirAcoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalExcluirConfirmar: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#E5484D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
