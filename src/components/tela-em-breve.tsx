import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';

type Props = {
  titulo: string;
  descricao: string;
  icone: keyof typeof Ionicons.glyphMap;
};

export function TelaEmBreve({ titulo, descricao, icone }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.centro}>
        <View style={styles.circulo}>
          <Ionicons name={icone} size={40} color={Cores.destaque} />
        </View>
        <Text accessibilityRole="header" style={styles.titulo}>
          {titulo}
        </Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  circulo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Cores.vinhoSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  titulo: { color: Cores.texto, fontSize: 22, fontWeight: '700' },
  descricao: { color: Cores.textoSuave, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});