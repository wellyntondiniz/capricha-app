import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Cores } from '@/constants/cores';
import { obterUrlBanner } from '@/services/resumoService';

type Props = {
  banner?: string | null; // nome do arquivo guardado na API
  uriLocal?: string; // imagem recém-escolhida no aparelho (pré-visualização)
  style?: StyleProp<ViewStyle>;
};

// Mostra o banner do resumo. Sem banner (ou se a imagem não carregar), mostra um painel padrão.
export function BannerResumo({ banner, uriLocal, style }: Props) {
  const uri = uriLocal ?? obterUrlBanner(banner);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    setFalhou(false);
  }, [uri]);

  return (
    <View style={[styles.caixa, style]}>
      {uri && !falhou ? (
        <Image
          source={{ uri }}
          style={styles.imagem}
          resizeMode="cover"
          onError={() => setFalhou(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.padrao} accessibilityLabel="Resumo sem banner">
          <Ionicons name="document-text-outline" size={36} color={Cores.vinhoClaro} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Cores.superficieAlta,
  },
  imagem: { width: '100%', height: '100%' },
  padrao: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Cores.vinhoSuave,
  },
});
