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
    <SafeAreaView style={styles.safe}>
      <View style={styles.cabecalho}>
        <Pressable onPress={voltar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.voltar}>← Voltar</Text>
        </Pressable>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color={Cores.destaque} style={styles.centro} />
      ) : erro || !resumo ? (
        <View style={styles.centro}>
          <Text style={styles.erro}>{erro ?? 'Resumo não encontrado.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conteudo}>
          <BannerResumo banner={resumo.banner} />

          <Text style={styles.evento}>{resumo.eventoNome}</Text>
          <Text accessibilityRole="header" style={styles.titulo}>
            {resumo.titulo}
          </Text>

          <Text style={styles.rotulo}>{resumo.autores.length > 1 ? 'Autores' : 'Autor'}</Text>
          <Text style={styles.autores}>{resumo.autores.join(', ')}</Text>

          {resumo.palavrasChave.length > 0 && (
            <>
              <Text style={styles.rotulo}>Palavras-chave</Text>
              <View style={styles.chips}>
                {resumo.palavrasChave.map((palavra) => (
                  <View key={palavra} style={styles.chip}>
                    <Text style={styles.chipTexto}>{palavra}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.rotulo}>Resumo</Text>
          <Text style={styles.texto} selectable>
            {resumo.texto}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: { paddingHorizontal: 20, paddingVertical: 14 },
  voltar: { color: Cores.texto, fontSize: 16, fontWeight: '600' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  erro: { color: Cores.texto, fontSize: 16, textAlign: 'center' },
  conteudo: { padding: 20, gap: 8, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 48 },
  evento: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '600', marginTop: 12 },
  titulo: { color: Cores.texto, fontSize: 24, fontWeight: '700', lineHeight: 31 },
  rotulo: { color: Cores.textoSuave, fontSize: 13, fontWeight: '600', marginTop: 16 },
  autores: { color: Cores.texto, fontSize: 16, lineHeight: 23 },
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
  texto: { color: Cores.texto, fontSize: 16, lineHeight: 26 },
});
