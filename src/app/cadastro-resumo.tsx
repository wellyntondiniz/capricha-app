import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerResumo } from '@/components/banner-resumo';
import { Cores } from '@/constants/cores';
import { listarEventos, type Evento } from '@/services/eventoService';
import { atualizarResumo, buscarResumo, cadastrarResumo, type DadosResumo } from '@/services/resumoService';
import { erro as notificarErro, sucesso } from '@/utils/notify';

const MAX_TITULO = 200;
const MAX_TEXTO = 20000;
const MAX_AUTORES = 20;
const MAX_PALAVRAS = 15;

type Campo = 'titulo' | 'texto' | 'autores' | 'palavrasChave' | 'evento';
type Erros = Partial<Record<Campo, string>>;

// Mesma regra da API: separa por vírgula, ponto e vírgula ou quebra de linha e ignora repetidos.
function contarItens(bruto: string): number {
  const vistos = new Set(
    bruto
      .split(/[\r\n;,]+/)
      .map((parte) => parte.trim().toLowerCase())
      .filter(Boolean)
  );
  return vistos.size;
}

export default function CadastroResumoScreen() {
  const { id: idParam, eventoId: eventoIdParam } = useLocalSearchParams<{ id?: string; eventoId?: string }>();
  const resumoId = idParam ? Number(idParam) : null;
  const editando = resumoId !== null;

  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [autores, setAutores] = useState('');
  const [palavrasChave, setPalavrasChave] = useState('');
  const [eventoId, setEventoId] = useState<number | null>(
    eventoIdParam && Number.isInteger(Number(eventoIdParam)) ? Number(eventoIdParam) : null
  );

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [bannerAtual, setBannerAtual] = useState<string | null>(null);
  const [novoBanner, setNovoBanner] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [removerBanner, setRemoverBanner] = useState(false);
  const [escolhendoImagem, setEscolhendoImagem] = useState(false);

  const [carregando, setCarregando] = useState(editando);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    listarEventos()
      .then(setEventos)
      .catch(() => setEventos([]));
  }, []);

  useEffect(() => {
    if (!editando) return;
    buscarResumo(resumoId!)
      .then((resumo) => {
        setTitulo(resumo.titulo);
        setTexto(resumo.texto);
        setAutores(resumo.autores.join(', '));
        setPalavrasChave(resumo.palavrasChave.join(', '));
        setEventoId(resumo.eventoId);
        setBannerAtual(resumo.banner);
      })
      .catch((e) => setErroCarregar(e instanceof Error ? e.message : 'Não foi possível carregar o resumo.'))
      .finally(() => setCarregando(false));
  }, [editando, resumoId]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/eventos');
  }

  function limparErro(campo: Campo) {
    setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErroGeral(null);
  }

  async function escolherImagem() {
    try {
      if (Platform.OS !== 'web') {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissao.granted) {
          setErroGeral('Permita o acesso às fotos para escolher um banner.');
          return;
        }
      }
      setEscolhendoImagem(true);
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!resultado.canceled) {
        setNovoBanner(resultado.assets[0]);
        setRemoverBanner(false);
        setErroGeral(null);
      }
    } catch {
      setErroGeral('Não foi possível selecionar a imagem.');
    } finally {
      setEscolhendoImagem(false);
    }
  }

  function validar(): Erros {
    const resultado: Erros = {};
    if (!titulo.trim()) resultado.titulo = 'Informe o título do resumo.';
    else if (titulo.trim().length > MAX_TITULO) resultado.titulo = `O título deve ter no máximo ${MAX_TITULO} caracteres.`;

    if (!texto.trim()) resultado.texto = 'Informe o texto do resumo.';
    else if (texto.trim().length > MAX_TEXTO) resultado.texto = `O texto deve ter no máximo ${MAX_TEXTO} caracteres.`;

    const totalAutores = contarItens(autores);
    if (totalAutores === 0) resultado.autores = 'Informe ao menos um autor.';
    else if (totalAutores > MAX_AUTORES) resultado.autores = `Informe no máximo ${MAX_AUTORES} autores.`;

    if (contarItens(palavrasChave) > MAX_PALAVRAS) {
      resultado.palavrasChave = `Informe no máximo ${MAX_PALAVRAS} palavras-chave.`;
    }

    if (eventoId === null) resultado.evento = 'Selecione o evento do resumo.';
    return resultado;
  }

  async function salvar() {
    if (enviando) return;
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setErroGeral('Corrija os campos destacados.');
      return;
    }
    setErroGeral(null);

    const dados: DadosResumo = {
      titulo: titulo.trim(),
      texto: texto.trim(),
      autores,
      palavrasChave,
      eventoId: eventoId!,
    };

    setEnviando(true);
    try {
      if (editando) {
        await atualizarResumo(resumoId!, dados, { banner: novoBanner, removerBanner });
        sucesso('Alterações salvas');
      } else {
        await cadastrarResumo(dados, novoBanner);
        sucesso('Resumo cadastrado');
      }
      voltar();
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Não foi possível salvar o resumo.';
      setErroGeral(mensagem);
      notificarErro('Não foi possível salvar', mensagem);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={Cores.destaque} />
          <Text style={styles.ajuda}>Carregando resumo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (erroCarregar) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.pagina}>
          <View style={styles.cabecalho}>
            <Pressable
              onPress={voltar}
              style={styles.botaoVoltar}
              accessibilityRole="button"
              accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={Cores.texto} />
            </Pressable>
            <View style={styles.titulos}>
              <Text accessibilityRole="header" style={styles.tituloCabecalho}>
                {editando ? 'Editar resumo' : 'Novo resumo'}
              </Text>
            </View>
          </View>

          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={42} color={Cores.destaque} />
            <Text style={styles.ajuda}>{erroCarregar}</Text>
            <Pressable onPress={voltar} style={styles.botaoSecundario}>
              <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const temBannerAtual = !!bannerAtual && !removerBanner && !novoBanner;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.pagina}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.cabecalho}>
            <Pressable
              onPress={voltar}
              style={styles.botaoVoltar}
              accessibilityRole="button"
              accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={Cores.texto} />
            </Pressable>
            <View style={styles.titulos}>
              <Text accessibilityRole="header" style={styles.tituloCabecalho}>
                {editando ? 'Editar resumo' : 'Novo resumo'}
              </Text>
              <Text style={styles.subtituloCabecalho}>
                {editando
                  ? 'Atualize os dados do trabalho científico'
                  : 'Preencha os dados para cadastrar um novo resumo'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.rotulo}>Evento</Text>
            {eventos.length === 0 ? (
              <Text style={styles.ajuda}>Nenhum evento disponível. Cadastre um evento antes de criar resumos.</Text>
            ) : (
              <View style={styles.chips}>
                {eventos.map((evento) => {
                  const selecionado = evento.id === eventoId;
                  return (
                    <Pressable
                      key={evento.id}
                      onPress={() => {
                        setEventoId(evento.id ?? null);
                        limparErro('evento');
                      }}
                      style={[styles.chip, selecionado && styles.chipSelecionado]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selecionado }}>
                      <Text style={[styles.chipTexto, selecionado && styles.chipTextoSelecionado]}>{evento.nome}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!!erros.evento && <Text style={styles.erro}>{erros.evento}</Text>}

            <Text style={styles.rotulo}>Título</Text>
            <TextInput
              style={[styles.input, !!erros.titulo && styles.inputErro]}
              value={titulo}
              onChangeText={(v) => {
                setTitulo(v);
                limparErro('titulo');
              }}
              placeholder="Título do trabalho"
              placeholderTextColor={Cores.inativo}
              maxLength={MAX_TITULO + 50}
            />
            {!!erros.titulo && <Text style={styles.erro}>{erros.titulo}</Text>}

            <Text style={styles.rotulo}>Autores</Text>
            <TextInput
              style={[styles.input, !!erros.autores && styles.inputErro]}
              value={autores}
              onChangeText={(v) => {
                setAutores(v);
                limparErro('autores');
              }}
              placeholder="Ana Souza, Bruno Lima"
              placeholderTextColor={Cores.inativo}
            />
            <Text style={styles.dica}>Separe os nomes com vírgula.</Text>
            {!!erros.autores && <Text style={styles.erro}>{erros.autores}</Text>}

            <Text style={styles.rotulo}>Texto do resumo</Text>
            <TextInput
              style={[styles.input, styles.areaTexto, !!erros.texto && styles.inputErro]}
              value={texto}
              onChangeText={(v) => {
                setTexto(v);
                limparErro('texto');
              }}
              placeholder="Cole ou escreva o resumo completo"
              placeholderTextColor={Cores.inativo}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.dica}>
              {texto.trim().length} / {MAX_TEXTO} caracteres
            </Text>
            {!!erros.texto && <Text style={styles.erro}>{erros.texto}</Text>}

            <Text style={styles.rotulo}>Palavras-chave (opcional)</Text>
            <TextInput
              style={[styles.input, !!erros.palavrasChave && styles.inputErro]}
              value={palavrasChave}
              onChangeText={(v) => {
                setPalavrasChave(v);
                limparErro('palavrasChave');
              }}
              placeholder="saúde, extensão, dados"
              placeholderTextColor={Cores.inativo}
            />
            <Text style={styles.dica}>Separe as palavras com vírgula.</Text>
            {!!erros.palavrasChave && <Text style={styles.erro}>{erros.palavrasChave}</Text>}

            <Text style={styles.rotulo}>Banner (opcional)</Text>
            {novoBanner || temBannerAtual ? (
              <View style={styles.bannerBloco}>
                <BannerResumo banner={temBannerAtual ? bannerAtual : null} uriLocal={novoBanner?.uri} />
                <View style={styles.bannerAcoes}>
                  <Pressable
                    onPress={escolherImagem}
                    disabled={escolhendoImagem}
                    hitSlop={8}
                    style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="image-outline" size={16} color={Cores.vinhoClaro} />
                    <Text style={styles.acaoEditar}>Trocar imagem</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setNovoBanner(null);
                      setRemoverBanner(true);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="trash-outline" size={16} color="#E5484D" />
                    <Text style={styles.acaoExcluir}>Remover banner</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={escolherImagem}
                disabled={escolhendoImagem}
                style={({ pressed }) => [styles.botaoSecundario, pressed && { opacity: 0.8 }]}>
                <Ionicons name="image-outline" size={18} color={Cores.texto} />
                <Text style={styles.botaoSecundarioTexto}>
                  {escolhendoImagem ? 'Abrindo galeria...' : 'Escolher imagem'}
                </Text>
              </Pressable>
            )}
            <Text style={styles.dica}>Sem banner, os participantes veem uma imagem padrão. Máximo de 5 MB.</Text>

            {!!erroGeral && (
              <Text style={styles.erroGeral} accessibilityLiveRegion="polite">
                {erroGeral}
              </Text>
            )}

            <Pressable
              onPress={salvar}
              disabled={enviando}
              style={({ pressed }) => [styles.botao, (pressed || enviando) && { opacity: 0.75 }]}
              accessibilityRole="button">
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botaoTexto}>{editando ? 'Salvar alterações' : 'Cadastrar resumo'}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  pagina: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
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
  tituloCabecalho: { color: Cores.texto, fontSize: 24, fontWeight: '700' },
  subtituloCabecalho: { color: Cores.textoSuave, fontSize: 13, marginTop: 2 },
  estadoVazio: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    gap: 12,
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 16,
    backgroundColor: Cores.superficie,
    padding: 20,
    gap: 6,
  },
  rotulo: { color: Cores.texto, fontSize: 15, fontWeight: '600', marginTop: 12 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Cores.texto,
    backgroundColor: Cores.fundo,
    fontSize: 15,
  },
  inputErro: { borderColor: '#E5484D' },
  areaTexto: { minHeight: 180, paddingTop: 12 },
  dica: { color: Cores.textoSuave, fontSize: 12 },
  erro: { color: '#FF6B70', fontSize: 13 },
  erroGeral: { color: '#FF6B70', fontSize: 14, marginTop: 12 },
  ajuda: { color: Cores.textoSuave, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 20,
    backgroundColor: Cores.fundo,
  },
  chipSelecionado: { backgroundColor: Cores.vinho, borderColor: Cores.vinhoClaro },
  chipTexto: { color: Cores.textoSuave, fontSize: 14 },
  chipTextoSelecionado: { color: '#FFFFFF', fontWeight: '600' },
  bannerBloco: { gap: 10 },
  bannerAcoes: { flexDirection: 'row', gap: 18 },
  acaoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  acaoEditar: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '700' },
  acaoExcluir: { color: '#E5484D', fontSize: 14, fontWeight: '700' },
  botao: {
    minHeight: 50,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  botaoSecundario: {
    minHeight: 46,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  botaoSecundarioTexto: { color: Cores.texto, fontSize: 15, fontWeight: '600' },
});

