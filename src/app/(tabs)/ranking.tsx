import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListaRanking } from '@/components/lista-ranking';
import { Cores } from '@/constants/cores';
import { listarEventos, type Evento } from '@/services/eventoService';

export default function RankingScreen() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarEventos = useCallback(async () => {
    setErro(null);
    try {
      const lista = (await listarEventos()).filter((e) => typeof e.id === 'number');
      setEventos(lista);
      // Mantém o evento escolhido se ele ainda existir; senão seleciona o primeiro.
      setEventoId((atual) => (lista.some((e) => e.id === atual) ? atual : (lista[0]?.id ?? null)));
    } catch (e) {
      const mensagem = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
      setErro(mensagem || 'Não foi possível carregar os eventos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarEventos();
    }, [carregarEventos])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.titulos}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Ranking
        </Text>
        <Text style={styles.subtitulo}>Participantes ordenados por pontuação</Text>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color={Cores.destaque} style={styles.loader} />
      ) : erro ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioTitulo}>{erro}</Text>
          <Pressable
            onPress={() => {
              setCarregando(true);
              carregarEventos();
            }}
            style={styles.botaoSecundario}
            accessibilityRole="button">
            <Text style={styles.botaoSecundarioTexto}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : eventoId === null ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioTitulo}>Nenhum evento disponível.</Text>
          <Text style={styles.vazioTexto}>Quando houver um evento, o ranking dele aparece aqui.</Text>
        </View>
      ) : (
        <>
          <View style={styles.faixaEventos}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              {eventos.map((evento) => {
                const ativo = evento.id === eventoId;
                return (
                  <Pressable
                    key={evento.id}
                    onPress={() => setEventoId(evento.id ?? null)}
                    style={[styles.chip, ativo && styles.chipAtivo]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={`Ranking do evento ${evento.nome}`}>
                    <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]} numberOfLines={1}>
                      {evento.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ListaRanking eventoId={eventoId} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  titulos: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 2 },
  titulo: { color: Cores.texto, fontSize: 26, fontWeight: '700' },
  subtitulo: { color: Cores.textoSuave, fontSize: 15 },
  loader: { flex: 1, alignSelf: 'center' },
  faixaEventos: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
  },
  chipAtivo: { backgroundColor: Cores.vinho, borderColor: Cores.vinhoClaro },
  chipTexto: { color: Cores.textoSuave, fontSize: 14, fontWeight: '600' },
  chipTextoAtivo: { color: '#FFFFFF' },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  vazioTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  vazioTexto: { color: Cores.textoSuave, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  botaoSecundario: {
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
});
