import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Cores } from '@/constants/cores';
import { listarPorEvento, type Participacao } from '@/services/participacaoService';

type Props = {
  eventoId: number;
};

type ItemRanking = {
  chave: string;
  posicao: number;
  nome: string;
  pontos: number;
};

const MEDALHAS: Record<number, string> = {
  1: '#E5B567',
  2: '#B8C0CC',
  3: '#C98A5B',
};

function iniciais(nome: string) {
  return (
    nome
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function montarRanking(participacoes: Participacao[]): ItemRanking[] {
  const base = participacoes.map((p, i) => ({
    chave: String(p.id ?? `${p.usuario?.id ?? 'u'}-${i}`),
    nome: p.usuario?.nome?.trim() || 'Usuário',
    pontos: p.score ?? 0,
  }));

  base.sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'));

  let posicaoAnterior = 0;
  return base.map((item, i) => {
    const posicao = i > 0 && item.pontos === base[i - 1].pontos ? posicaoAnterior : i + 1;
    posicaoAnterior = posicao;
    return { ...item, posicao };
  });
}

export function ListaRanking({ eventoId }: Props) {
  const [itens, setItens] = useState<ItemRanking[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const requisicaoAtual = useRef(0);

  const carregar = useCallback(async () => {
    const requisicao = ++requisicaoAtual.current;
    setErro(null);
    try {
      const dados = await listarPorEvento(eventoId);
      if (requisicao !== requisicaoAtual.current) return;
      setItens(montarRanking(dados));
    } catch (e) {
      if (requisicao !== requisicaoAtual.current) return;
      setItens([]);
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o ranking.');
    } finally {
      if (requisicao === requisicaoAtual.current) {
        setCarregando(false);
        setAtualizando(false);
      }
    }
  }, [eventoId]);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      carregar();
    }, [carregar])
  );

  if (carregando) {
    return <ActivityIndicator size="large" color={Cores.destaque} style={styles.loader} />;
  }

  if (erro) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTitulo}>{erro}</Text>
        <Pressable
          onPress={() => {
            setCarregando(true);
            carregar();
          }}
          style={styles.botaoSecundario}
          accessibilityRole="button">
          <Text style={styles.botaoSecundarioTexto}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={itens}
      keyExtractor={(item) => item.chave}
      contentContainerStyle={styles.lista}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => {
            setAtualizando(true);
            carregar();
          }}
          tintColor={Cores.destaque}
          colors={[Cores.destaque]}
        />
      }
      ListEmptyComponent={
        <View style={styles.vazio}>
          <Text style={styles.vazioTitulo}>Nenhum participante neste evento ainda.</Text>
          <Text style={styles.vazioTexto}>Os participantes aparecem aqui assim que se inscreverem.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const medalha = MEDALHAS[item.posicao];
        return (
          <View
            style={[styles.linha, !!medalha && { borderColor: medalha }]}
            accessible
            accessibilityLabel={`${item.posicao}º lugar, ${item.nome}, ${item.pontos} pontos`}>
            <View style={[styles.posicao, !!medalha && { backgroundColor: medalha }]}>
              <Text style={[styles.posicaoTexto, !!medalha && styles.posicaoTextoMedalha]}>{item.posicao}</Text>
            </View>

            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciais(item.nome)}</Text>
            </View>

            <Text style={styles.nome} numberOfLines={1}>
              {item.nome}
            </Text>

            <View style={styles.pontos}>
              <Text style={styles.pontosValor}>{item.pontos}</Text>
              <Text style={styles.pontosRotulo}>pontos</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignSelf: 'center' },
  lista: { padding: 16, gap: 10, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  posicao: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Cores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posicaoTexto: { color: Cores.textoSuave, fontSize: 13, fontWeight: '700' },
  posicaoTextoMedalha: { color: '#1A1A1A' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.vinho,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  nome: { flex: 1, color: Cores.texto, fontSize: 15, fontWeight: '600' },
  pontos: { alignItems: 'flex-end' },
  pontosValor: { color: Cores.texto, fontSize: 17, fontWeight: '700' },
  pontosRotulo: { color: Cores.textoSuave, fontSize: 11 },
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