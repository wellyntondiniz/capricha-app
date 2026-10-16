import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import {
  listarPalestras,
  obterUrlImagemPalestra,
  Palestra,
} from '@/services/palestraService';

export default function ListaPalestras() {
  const [palestras, setPalestras] = useState<Palestra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

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
            <Text style={styles.subtitulo}>Confira a programação cadastrada</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cadastrar nova palestra"
            style={styles.novaPalestra}
            onPress={() => router.push('/cadastro-palestra')}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.novaPalestraTexto}>Nova</Text>
          </Pressable>
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
                <Text style={styles.textoSuave}>Use o botão Nova para cadastrar uma palestra.</Text>
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
                      <Ionicons name="mic" size={34} color={Cores.vinhoClaro} />
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
  estadoVazio: { alignItems: 'center', padding: 28, borderRadius: 18, backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  estadoTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 12, marginBottom: 6 },
  textoSuave: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  tentarNovamente: { marginTop: 18, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: Cores.vinhoClaro },
  tentarNovamenteTexto: { color: Cores.vinhoClaro, fontWeight: '700' },
});
