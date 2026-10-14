import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerResumo } from '@/components/banner-resumo';
import { Cores } from '@/constants/cores';
import { buscarEventoPorId } from '@/services/eventoService';
import { excluirResumo, listarResumosDoEvento, type Resumo } from '@/services/resumoService';
import { erro as notificarErro, sucesso } from '@/utils/notify';

export default function ResumosScreen() {
  const { eventoId: eventoIdParam } = useLocalSearchParams<{ eventoId?: string }>();
  const eventoId = Number(eventoIdParam);
  const eventoValido = Number.isInteger(eventoId) && eventoId > 0;

  const [nomeEvento, setNomeEvento] = useState('');
  const [resumos, setResumos] = useState<Resumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [paraExcluir, setParaExcluir] = useState<Resumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);

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
      sucesso('Resumo excluído');
    } catch (e) {
      notificarErro('Não foi possível excluir', e instanceof Error ? e.message : undefined);
    } finally {
      setExcluindo(false);
      setParaExcluir(null);
    }
  }

  if (!eventoValido) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.vazio}>
          <Text style={styles.vazioTitulo}>Nenhum evento selecionado</Text>
          <Text style={styles.vazioTexto}>Abra os resumos a partir da tela de um evento.</Text>
          <Pressable onPress={voltar} style={styles.botaoSecundario}>
            <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cabecalho}>
        <Pressable onPress={voltar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.voltar}>← Voltar</Text>
        </Pressable>
        <Pressable onPress={() => abrirFormulario()} style={styles.botaoNovo} accessibilityRole="button">
          <Text style={styles.botaoNovoTexto}>+ Novo resumo</Text>
        </Pressable>
      </View>

      <View style={styles.titulos}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Resumos
        </Text>
        {!!nomeEvento && <Text style={styles.subtitulo}>{nomeEvento}</Text>}
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color={Cores.destaque} style={styles.loader} />
      ) : erroCarregar ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioTitulo}>{erroCarregar}</Text>
          <Pressable onPress={() => { setCarregando(true); carregar(); }} style={styles.botaoSecundario}>
            <Text style={styles.botaoSecundarioTexto}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={resumos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>Este evento ainda não tem resumos.</Text>
              <Text style={styles.vazioTexto}>
                Toque em “+ Novo resumo” para cadastrar o primeiro.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                onPress={() => abrirDetalhe(item)}
                style={({ pressed }) => [styles.cardConteudo, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel={`Abrir resumo ${item.titulo}`}>
                <BannerResumo banner={item.banner} />
                <Text style={styles.cardTitulo} numberOfLines={3}>
                  {item.titulo}
                </Text>
                {item.autores.length > 0 && (
                  <Text style={styles.cardAutores} numberOfLines={2}>
                    {item.autores.join(', ')}
                  </Text>
                )}
              </Pressable>

              <View style={styles.cardAcoes}>
                <Pressable onPress={() => abrirFormulario(item)} hitSlop={8}>
                  <Text style={styles.acaoEditar}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => setParaExcluir(item)} hitSlop={8}>
                  <Text style={styles.acaoExcluir}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!paraExcluir} transparent animationType="fade" onRequestClose={() => setParaExcluir(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Excluir resumo?</Text>
            <Text style={styles.modalTexto}>
              “{paraExcluir?.titulo}” será removido do evento e não poderá ser recuperado.
            </Text>
            <View style={styles.modalAcoes}>
              <Pressable onPress={() => setParaExcluir(null)} style={styles.botaoSecundario} disabled={excluindo}>
                <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmarExclusao} style={styles.botaoPerigo} disabled={excluindo}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  voltar: { color: Cores.texto, fontSize: 16, fontWeight: '600' },
  botaoNovo: { backgroundColor: Cores.vinho, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  botaoNovoTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  titulos: { paddingHorizontal: 20, paddingBottom: 8, gap: 2 },
  titulo: { color: Cores.texto, fontSize: 26, fontWeight: '700' },
  subtitulo: { color: Cores.textoSuave, fontSize: 15 },
  loader: { flex: 1, alignSelf: 'center' },
  lista: { padding: 16, gap: 14, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: {
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  cardConteudo: { gap: 8 },
  cardTitulo: { color: Cores.texto, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  cardAutores: { color: Cores.textoSuave, fontSize: 14 },
  cardAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingTop: 10,
  },
  acaoEditar: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '600' },
  acaoExcluir: { color: '#E5484D', fontSize: 14, fontWeight: '600' },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  vazioTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  vazioTexto: { color: Cores.textoSuave, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  modalTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700' },
  modalTexto: { color: Cores.textoSuave, fontSize: 14, lineHeight: 21 },
  modalAcoes: { flexDirection: 'row', gap: 10, marginTop: 8 },
  botaoSecundario: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  botaoSecundarioTexto: { color: Cores.texto, fontSize: 15, fontWeight: '600' },
  botaoPerigo: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#C0343A',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  botaoPerigoTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
