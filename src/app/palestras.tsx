import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import { LectureCheckInAction } from '@/features/check-in/lecture-check-in-action';
import {
  excluirPalestra,
  listarPalestras,
  obterUrlImagemPalestra,
  Palestra,
  PalestraApiError,
} from '@/services/palestraService';
import { erro, sucesso } from '@/utils/notify';

export default function ListaPalestras() {
  const { usuario } = useAuth();
  const ehAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(usuario?.perfil?.toUpperCase() ?? '');

  const [palestras, setPalestras] = useState<Palestra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

  const [palestraParaExcluir, setPalestraParaExcluir] = useState<Palestra | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarPalestras = useCallback(async (atualizacao = false) => {
    if (atualizacao) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }
    setMensagemErro('');

    try {
      setPalestras(await listarPalestras());
    } catch {
      setMensagemErro('Não foi possível carregar as palestras. Verifique se a API está rodando.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarPalestras();
    }, [carregarPalestras])
  );

  const editarPalestra = (palestra: Palestra) => {
    if (palestra.id == null) return;
    router.push({ pathname: '/cadastro-palestra', params: { id: String(palestra.id) } });
  };

  const confirmarExclusao = async () => {
    if (!palestraParaExcluir?.id) return;

    setExcluindo(true);
    try {
      await excluirPalestra(palestraParaExcluir.id, usuario?.token);
      setPalestras((atuais) => atuais.filter((item) => item.id !== palestraParaExcluir.id));
      setPalestraParaExcluir(null);
      sucesso('Palestra excluída', 'A palestra foi removida com sucesso.');
    } catch (error) {
      const erroApi = error as PalestraApiError;
      setPalestraParaExcluir(null);
      erro('Não foi possível excluir', erroApi.message || 'Tente novamente.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar para a tela inicial"
            style={styles.voltar}
            onPress={() => router.replace('/home')}>
            <Ionicons name="arrow-back" size={22} color={Cores.texto} />
          </Pressable>

          <View style={styles.titulos}>
            <Text style={styles.titulo}>Palestras</Text>
            <Text style={styles.subtitulo}>
              {ehAdmin ? 'Gerencie a programação cadastrada' : 'Confira a programação cadastrada'}
            </Text>
          </View>

          {ehAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cadastrar nova palestra"
              style={styles.novaPalestra}
              onPress={() => router.push('/cadastro-palestra')}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text style={styles.novaPalestraTexto}>Nova</Text>
            </Pressable>
          )}
        </View>

        {carregando ? (
          <View style={styles.centralizado}>
            <ActivityIndicator size="large" color={Cores.destaque} />
            <Text style={styles.textoSuave}>Carregando palestras...</Text>
          </View>
        ) : mensagemErro ? (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={42} color={Cores.destaque} />
            <Text style={styles.estadoTitulo}>Não foi possível carregar</Text>
            <Text style={styles.textoSuave}>{mensagemErro}</Text>
            <Pressable style={styles.tentarNovamente} onPress={() => carregarPalestras()}>
              <Text style={styles.tentarNovamenteTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={palestras}
            keyExtractor={(item, indice) => String(item.id ?? indice)}
            contentContainerStyle={palestras.length === 0 ? styles.listaVazia : styles.lista}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={() => carregarPalestras(true)}
                tintColor={Cores.destaque}
                colors={[Cores.destaque]}
              />
            }
            ListEmptyComponent={
              <View style={styles.estadoVazio}>
                <Text style={styles.estadoTitulo}>Nenhuma palestra cadastrada</Text>
                <Text style={styles.textoSuave}>
                  {ehAdmin
                    ? 'Use o botão Nova para cadastrar uma palestra.'
                    : 'As palestras aparecerão aqui assim que forem cadastradas.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const imagem = obterUrlImagemPalestra(item.imagem);

              return (
                <View style={styles.card}>
                  {imagem ? (
                    <Image source={{ uri: imagem }} style={styles.imagem} resizeMode="cover" />
                  ) : (
                    <View style={[styles.imagem, styles.imagemFallback]}>
                      <Ionicons name="image-outline" size={38} color={Cores.vinhoClaro} />
                    </View>
                  )}

                  <View style={styles.cardConteudo}>
                    <Text style={styles.cardTitulo}>{item.nome || 'Palestra sem nome'}</Text>
                    <View style={styles.informacao}>
                      <Ionicons name="person-outline" size={16} color={Cores.textoSuave} />
                      <Text style={styles.informacaoTexto}>{item.palestrante || 'Palestrante não informado'}</Text>
                    </View>
                    <View style={styles.informacao}>
                      <Ionicons name="calendar-outline" size={16} color={Cores.textoSuave} />
                      <Text style={styles.informacaoTexto}>{item.data || 'Data não informada'} às {item.horario || '--:--'}</Text>
                    </View>
                    {!!item.evento?.nome && (
                      <View style={styles.eventoTag}>
                        <Text style={styles.eventoTagTexto}>{item.evento.nome}</Text>
                      </View>
                    )}
                    {!!item.descricao && <Text style={styles.descricao}>{item.descricao}</Text>}
                    <LectureCheckInAction lectureId={item.id} />

                    {ehAdmin && (
                      <View style={styles.acoesAdmin}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Editar a palestra ${item.nome ?? ''}`}
                          style={styles.botaoEditar}
                          onPress={() => editarPalestra(item)}>
                          <Ionicons name="create-outline" size={16} color={Cores.vinhoClaro} />
                          <Text style={styles.editarTexto}>Editar</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Excluir a palestra ${item.nome ?? ''}`}
                          style={styles.botaoExcluir}
                          onPress={() => setPalestraParaExcluir(item)}>
                          <Ionicons name="trash-outline" size={16} color="#E5484D" />
                          <Text style={styles.excluirTexto}>Excluir</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <Modal
        visible={!!palestraParaExcluir}
        transparent
        animationType="fade"
        onRequestClose={() => !excluindo && setPalestraParaExcluir(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Excluir palestra</Text>
            <Text style={styles.modalTexto}>
              Deseja realmente excluir a palestra{' '}
              <Text style={styles.modalDestaque}>{palestraParaExcluir?.nome}</Text>? As perguntas
              cadastradas nela também serão removidas. Essa ação não pode ser desfeita.
            </Text>
            <View style={styles.modalAcoes}>
              <Pressable
                style={styles.modalCancelar}
                disabled={excluindo}
                onPress={() => setPalestraParaExcluir(null)}>
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmar, excluindo && { opacity: 0.6 }]}
                disabled={excluindo}
                onPress={confirmarExclusao}>
                {excluindo ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmarTexto}>Excluir</Text>
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
  conteudo: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  voltar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  titulos: { flex: 1 },
  titulo: { color: Cores.texto, fontSize: 26, fontWeight: '700' },
  subtitulo: { color: Cores.textoSuave, fontSize: 13, marginTop: 2 },
  novaPalestra: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Cores.vinho },
  novaPalestraTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  centralizado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  lista: { gap: 14, paddingBottom: 28 },
  listaVazia: { flexGrow: 1, justifyContent: 'center', paddingBottom: 50 },
  card: { flexDirection: 'row', overflow: 'hidden', minHeight: 150, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  imagem: { width: 132, minHeight: 150 },
  imagemFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinhoSuave },
  cardConteudo: { flex: 1, padding: 16 },
  cardTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700', marginBottom: 9 },
  informacao: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  informacaoTexto: { flex: 1, color: Cores.textoSuave, fontSize: 13 },
  eventoTag: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 12, backgroundColor: Cores.vinhoSuave },
  eventoTagTexto: { color: Cores.vinhoClaro, fontSize: 12, fontWeight: '700' },
  descricao: { color: Cores.inativo, fontSize: 13, lineHeight: 18, marginTop: 10 },
  acoesAdmin: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Cores.borda },
  botaoEditar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Cores.vinhoClaro },
  botaoExcluir: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5484D' },
  editarTexto: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '600' },
  excluirTexto: { color: '#E5484D', fontSize: 14, fontWeight: '600' },
  estadoVazio: { alignItems: 'center', padding: 28, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  estadoTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 12, marginBottom: 6 },
  textoSuave: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  tentarNovamente: { marginTop: 18, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: Cores.vinhoClaro },
  tentarNovamenteTexto: { color: Cores.vinhoClaro, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, padding: 22, borderRadius: 16, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  modalTitulo: { color: Cores.texto, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  modalTexto: { color: Cores.textoSuave, fontSize: 14, lineHeight: 21 },
  modalDestaque: { color: Cores.texto, fontWeight: '700' },
  modalAcoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  modalCancelar: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: Cores.borda },
  modalCancelarTexto: { color: Cores.texto, fontWeight: '600' },
  modalConfirmar: { minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#E5484D' },
  modalConfirmarTexto: { color: '#FFFFFF', fontWeight: '700' },
});