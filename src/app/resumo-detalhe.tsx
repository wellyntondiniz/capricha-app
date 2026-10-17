import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerResumo } from '@/components/banner-resumo';
import { Cores } from '@/constants/cores';
import { buscarResumo, type Resumo } from '@/services/resumoService';

export default function ResumoDetalheScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = Number(idParam);

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setErro('Resumo não encontrado.');
      setCarregando(false);
      return;
    }
    buscarResumo(id)
      .then(setResumo)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar o resumo.'))
      .finally(() => setCarregando(false));
  }, [id]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/eventos');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.cabecalho}>
          <Pressable
            onPress={voltar}
            style={styles.botaoVoltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={Cores.texto} />
          </Pressable>
          <View style={styles.titulos}>
            <Text style={styles.tituloCabecalho} numberOfLines={1}>
              Detalhes do resumo
            </Text>
            <Text style={styles.subtituloCabecalho} numberOfLines={1}>
              {resumo?.eventoNome || 'Visualização completa do trabalho'}
            </Text>
          </View>
        </View>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={Cores.destaque} />
            <Text style={styles.textoSuave}>Carregando resumo...</Text>
          </View>
        ) : erro || !resumo ? (
          <View style={styles.estadoVazio}>
            <Ionicons name="document-text-outline" size={42} color={Cores.destaque} />
            <Text style={styles.erro}>{erro ?? 'Resumo não encontrado.'}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.conteudo}
            showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <BannerResumo banner={resumo.banner} />

              {!!resumo.eventoNome && (
                <View style={styles.eventoBadge}>
                  <Ionicons name="calendar-outline" size={14} color={Cores.vinhoClaro} />
                  <Text style={styles.evento}>{resumo.eventoNome}</Text>
                </View>
              )}

              <Text accessibilityRole="header" style={styles.titulo}>
                {resumo.titulo}
              </Text>

              <View style={styles.blocoSecao}>
                <Text style={styles.rotulo}>
                  {resumo.autores.length > 1 ? 'Autores' : 'Autor'}
                </Text>
                <View style={styles.autoresLinha}>
                  <Ionicons name="people-outline" size={16} color={Cores.textoSuave} />
                  <Text style={styles.autores}>{resumo.autores.join(', ')}</Text>
                </View>
              </View>

              {resumo.palavrasChave.length > 0 && (
                <View style={styles.blocoSecao}>
                  <Text style={styles.rotulo}>Palavras-chave</Text>
                  <View style={styles.chips}>
                    {resumo.palavrasChave.map((palavra) => (
                      <View key={palavra} style={styles.chip}>
                        <Text style={styles.chipTexto}>{palavra}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.divisor} />

              <View style={styles.blocoSecao}>
                <Text style={styles.rotulo}>Resumo</Text>
                <Text style={styles.texto} selectable>
                  {resumo.texto}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  container: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20 },
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
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  textoSuave: { color: Cores.textoSuave, fontSize: 14 },
  estadoVazio: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    gap: 10,
    marginTop: 12,
  },
  erro: { color: Cores.texto, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  conteudo: { paddingBottom: 48 },
  card: {
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  eventoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  evento: { color: Cores.vinhoClaro, fontSize: 13, fontWeight: '700' },
  titulo: { color: Cores.texto, fontSize: 22, fontWeight: '700', lineHeight: 29 },
  blocoSecao: { gap: 6, marginTop: 4 },
  rotulo: { color: Cores.textoSuave, fontSize: 13, fontWeight: '600' },
  autoresLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autores: { flex: 1, color: Cores.texto, fontSize: 15, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    backgroundColor: Cores.vinhoSuave,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTexto: { color: Cores.texto, fontSize: 13 },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: 4 },
  texto: { color: Cores.texto, fontSize: 15, lineHeight: 25 },
});

