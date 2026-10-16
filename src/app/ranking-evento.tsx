import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListaRanking } from '@/components/lista-ranking';
import { Cores } from '@/constants/cores';
import { buscarEventoPorId } from '@/services/eventoService';

export default function RankingEventoScreen() {
  const { eventoId: eventoIdParam } = useLocalSearchParams<{ eventoId?: string }>();
  const eventoId = Number(eventoIdParam);
  const eventoValido = Number.isInteger(eventoId) && eventoId > 0;

  const [nomeEvento, setNomeEvento] = useState('');

  useEffect(() => {
    if (!eventoValido) return;
    buscarEventoPorId(eventoId)
      .then((evento) => setNomeEvento(evento.nome ?? ''))
      .catch(() => setNomeEvento(''));
  }, [eventoId, eventoValido]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/ranking');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cabecalho}>
        <Pressable onPress={voltar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.voltar}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.titulos}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Ranking de participantes
        </Text>
        {!!nomeEvento && <Text style={styles.subtitulo}>{nomeEvento}</Text>}
      </View>

      {eventoValido ? (
        <ListaRanking eventoId={eventoId} />
      ) : (
        <View style={styles.vazio}>
          <Text style={styles.vazioTitulo}>Nenhum evento selecionado</Text>
          <Text style={styles.vazioTexto}>Abra o ranking a partir da tela de um evento.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: { paddingHorizontal: 20, paddingVertical: 14 },
  voltar: { color: Cores.texto, fontSize: 16, fontWeight: '600' },
  titulos: { paddingHorizontal: 20, paddingBottom: 8, gap: 2 },
  titulo: { color: Cores.texto, fontSize: 26, fontWeight: '700' },
  subtitulo: { color: Cores.textoSuave, fontSize: 15 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  vazioTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  vazioTexto: { color: Cores.textoSuave, fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
