import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerResumo } from '@/components/banner-resumo';
import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInError } from '@/features/check-in/types';
import { httpVotacaoService, type ResumoQrCode } from '@/features/votacao/http-votacao-service';
import { buscarEventoPorId } from '@/services/eventoService';
import { excluirResumo, listarResumosDoEvento, type Resumo } from '@/services/resumoService';
import { erro as notificarErro, sucesso } from '@/utils/notify';

export default function ResumosScreen() {
  const { eventoId: eventoIdParam } = useLocalSearchParams<{ eventoId?: string }>();
  const eventoId = Number(eventoIdParam);
  const eventoValido = Number.isInteger(eventoId) && eventoId > 0;
  const { usuario, deslogar } = useAuth();
  const token = usuario?.token ?? '';
  const admin = ['ADMIN', 'ADMINISTRADOR'].includes(usuario?.perfil?.toUpperCase() ?? '');

  const [nomeEvento, setNomeEvento] = useState('');
  const [resumos, setResumos] = useState<Resumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [paraExcluir, setParaExcluir] = useState<Resumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // QR Code de votação do pôster (somente administrador).
  const [qrResumo, setQrResumo] = useState<Resumo | null>(null);
  const [qrCode, setQrCode] = useState<ResumoQrCode | null>(null);
  const [qrCarregando, setQrCarregando] = useState(false);
  const qrRequisicaoRef = useRef(0);

  const carregar = useCallback(async () => {
    if (!eventoValido) return;
    setErroCarregar(null);
    try {
      const [evento, lista] = await Promise.all([buscarEventoPorId(eventoId), listarResumosDoEvento(eventoId)]);
      setNomeEvento(evento.nome ?? '');
      setResumos(lista);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : 'Não foi possível carregar os resumos.');
    } finally {
      setCarregando(false);
    }
  }, [eventoId, eventoValido]);

  // Recarrega ao voltar do formulário de cadastro/edição.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/eventos');
  }

  function abrirDetalhe(resumo: Resumo) {
    router.push({ pathname: '/resumo-detalhe', params: { id: String(resumo.id) } });
  }

  async function abrirQr(resumo: Resumo) {
    const requisicao = ++qrRequisicaoRef.current;
    setQrResumo(resumo);
    setQrCode(null);
    setQrCarregando(true);
    try {
      const qr = await httpVotacaoService.getQrCode(resumo.id, token);
      if (qrRequisicaoRef.current === requisicao) setQrCode(qr);
    } catch (e) {
      if (qrRequisicaoRef.current !== requisicao) return;
      setQrResumo(null);
      if (e instanceof CheckInError && e.code === 'AUTH_REQUIRED') {
        await deslogar();
        router.replace('/');
        return;
      }
      notificarErro('Não foi possível gerar o QR Code', e instanceof Error ? e.message : undefined);
    } finally {
      if (qrRequisicaoRef.current === requisicao) setQrCarregando(false);
    }
  }

  function fecharQr() {
    qrRequisicaoRef.current++;
    setQrResumo(null);
    setQrCode(null);
    setQrCarregando(false);
  }

  function abrirFormulario(resumo?: Resumo) {
    router.push({
      pathname: '/cadastro-resumo',
      params: resumo ? { id: String(resumo.id) } : { eventoId: String(eventoId) },
    });
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await excluirResumo(paraExcluir.id);
      setResumos((atual) => atual.filter((r) => r.id !== paraExcluir.id));
      sucesso('Sucesso', 'Resumo excluído com sucesso');
    } catch (e) {
      notificarErro('Não foi possível excluir', e instanceof Error ? e.message : undefined);
    } finally {
      setExcluindo(false);
      setParaExcluir(null);
    }
  }

  if (!eventoValido) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.conteudo}>
          <View style={styles.cabecalho}>
            <Pressable
              onPress={voltar}
              style={styles.botaoVoltar}
              accessibilityRole="button"
              accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={Cores.texto} />
            </Pressable>
            <View style={styles.titulos}>
              <Text accessibilityRole="header" style={styles.titulo}>
                Resumos
              </Text>
              <Text style={styles.subtitulo}>Trabalhos e resumos científicos</Text>
            </View>
          </View>

          <View style={styles.centralizado}>
            <View style={styles.estadoVazio}>
              <Ionicons name="document-text-outline" size={42} color={Cores.vinhoClaro} />
              <Text style={styles.estadoTitulo}>Nenhum evento selecionado</Text>
              <Text style={styles.textoSuave}>Abra os resumos a partir da tela de um evento.</Text>
              <Pressable onPress={voltar} style={styles.tentarNovamente}>
                <Text style={styles.tentarNovamenteTexto}>Voltar para eventos</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Pressable
            onPress={voltar}
            style={styles.botaoVoltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={Cores.texto} />
          </Pressable>

          <View style={styles.titulos}>
            <Text accessibilityRole="header" style={styles.titulo}>
              Resumos
            </Text>
            <Text style={styles.subtitulo} numberOfLines={1}>
              {nomeEvento || 'Trabalhos submetidos ao evento'}
            </Text>
          </View>

          <Pressable
            onPress={() => abrirFormulario()}
            style={({ pressed }) => [styles.novoBotao, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Novo resumo">
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.novoTexto}>Novo resumo</Text>
          </Pressable>
        </View>

        {carregando ? (
          <View style={styles.centralizado}>
            <ActivityIndicator size="large" color={Cores.destaque} />
            <Text style={styles.textoSuave}>Carregando resumos...</Text>
          </View>
        ) : erroCarregar ? (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={42} color={Cores.destaque} />
            <Text style={styles.estadoTitulo}>{erroCarregar}</Text>
            <Pressable
              onPress={() => {
                setCarregando(true);
                carregar();
              }}
              style={styles.tentarNovamente}>
              <Text style={styles.tentarNovamenteTexto}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={resumos}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={resumos.length === 0 ? styles.listaVazia : styles.lista}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.estadoVazio}>
                <Ionicons name="document-text-outline" size={42} color={Cores.vinhoClaro} />
                <Text style={styles.estadoTitulo}>Este evento ainda não tem resumos.</Text>
                <Text style={styles.textoSuave}>
                  Toque em “+ Novo resumo” para cadastrar o primeiro.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Pressable
                  onPress={() => abrirDetalhe(item)}
                  style={({ pressed }) => [styles.cardConteudo, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir resumo ${item.titulo}`}>
                  <BannerResumo banner={item.banner} />
                  <Text style={styles.cardTitulo} numberOfLines={3}>
                    {item.titulo}
                  </Text>
                  {item.autores.length > 0 && (
                    <View style={styles.metaLinha}>
                      <Ionicons name="person-outline" size={15} color={Cores.textoSuave} />
                      <Text style={styles.cardAutores} numberOfLines={2}>
                        {item.autores.join(', ')}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <View style={styles.cardAcoes}>
                  {admin && (
                    <Pressable
                      onPress={() => void abrirQr(item)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Gerar QR Code de votação de ${item.titulo}`}>
                      <Ionicons name="qr-code-outline" size={16} color={Cores.vinhoClaro} />
                      <Text style={styles.acaoEditar}>QR Code</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => abrirFormulario(item)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="create-outline" size={16} color={Cores.vinhoClaro} />
                    <Text style={styles.acaoEditar}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setParaExcluir(item)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="trash-outline" size={16} color="#E5484D" />
                    <Text style={styles.acaoExcluir}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        <Modal
          visible={!!paraExcluir}
          transparent
          animationType="fade"
          onRequestClose={() => setParaExcluir(null)}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitulo}>Excluir resumo?</Text>
              <Text style={styles.modalTexto}>
                “{paraExcluir?.titulo}” será removido do evento e não poderá ser recuperado.
              </Text>
              <View style={styles.modalAcoes}>
                <Pressable
                  onPress={() => setParaExcluir(null)}
                  style={({ pressed }) => [styles.botaoSecundario, pressed && { opacity: 0.7 }]}
                  disabled={excluindo}>
                  <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={confirmarExclusao}
                  style={({ pressed }) => [styles.botaoPerigo, pressed && { opacity: 0.7 }]}
                  disabled={excluindo}>
                  {excluindo ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.botaoPerigoTexto}>Excluir resumo</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={qrResumo !== null} transparent animationType="fade" onRequestClose={fecharQr}>
          <View style={styles.overlay}>
            <View style={[styles.modal, styles.modalQr]}>
              <Text style={styles.modalRotulo}>QR CODE DO PÔSTER</Text>
              <Text style={styles.modalTitulo}>{qrResumo?.titulo}</Text>
              {qrCarregando && <ActivityIndicator color={Cores.destaque} style={styles.qrCarregando} />}
              {qrCode && (
                <Image
                  source={{ uri: qrCode.imageData }}
                  style={styles.qrImagem}
                  accessibilityLabel="QR Code de votação do resumo"
                />
              )}
              <Text style={styles.modalTexto}>
                Imprima no pôster. Ao escanear, o participante abre a confirmação do voto; só vota quem fez check-in.
              </Text>
              <Pressable onPress={fecharQr} style={({ pressed }) => [styles.botaoSecundario, styles.botaoFechar, pressed && { opacity: 0.7 }]}>
                <Text style={styles.botaoSecundarioTexto}>Fechar</Text>
              </Pressable>
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

  centralizado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lista: { gap: 14, paddingBottom: 32 },
  listaVazia: { flexGrow: 1, justifyContent: 'center', paddingBottom: 48 },

  estadoVazio: {
    width: '100%',
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
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardConteudo: { gap: 10 },
  cardTitulo: { color: Cores.texto, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  metaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardAutores: { flex: 1, color: Cores.textoSuave, fontSize: 14 },
  cardAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingTop: 10,
  },
  acaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  acaoEditar: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '700' },
  acaoExcluir: { color: '#E5484D', fontSize: 14, fontWeight: '700' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalQr: { alignItems: 'center' },
  modalRotulo: { color: Cores.destaque, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  qrCarregando: { marginVertical: 24 },
  qrImagem: { width: '100%', maxWidth: 280, aspectRatio: 1, marginVertical: 10, backgroundColor: '#FFFFFF' },
  botaoFechar: { flex: 0, alignSelf: 'stretch', marginTop: 6 },
  modalTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700' },
  modalTexto: { color: Cores.textoSuave, fontSize: 14, lineHeight: 21 },
  modalAcoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  botaoSecundario: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  botaoSecundarioTexto: { color: Cores.texto, fontSize: 15, fontWeight: '600' },
  botaoPerigo: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#C0343A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  botaoPerigoTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});