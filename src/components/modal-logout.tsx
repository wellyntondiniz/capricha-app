import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';

type ModalLogoutProps = {
  visivel: boolean;
  aoConfirmar: () => void | Promise<void>;
  aoCancelar: () => void;
  carregando?: boolean;
};

export function ModalLogout({
  visivel,
  aoConfirmar,
  aoCancelar,
  carregando = false,
}: ModalLogoutProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom + 16, 28);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={aoCancelar}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={aoCancelar} />

        <View style={[styles.sheet, { paddingBottom }]}>
          <View style={styles.puxador} />

          <View style={styles.iconeBox}>
            <Ionicons name="log-out-outline" size={28} color={Cores.destaque} />
          </View>

          <Text style={styles.titulo}>Sair da conta?</Text>
          <Text style={styles.descricao}>
            Você precisará informar seu e-mail e senha novamente para acessar seus eventos e informações.
          </Text>

          <View style={styles.botoes}>
            <Pressable
              style={({ pressed }) => [
                styles.botaoSair,
                carregando && styles.botaoDesabilitado,
                pressed && styles.botaoPressionado,
              ]}
              onPress={aoConfirmar}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.botaoSairTexto}>Sim, sair da conta</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.botaoCancelar,
                pressed && styles.botaoPressionado,
              ]}
              onPress={aoCancelar}
              disabled={carregando}
            >
              <Text style={styles.botaoCancelarTexto}>Continuar conectado</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Cores.superficie,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 24,
    paddingTop: 14,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  puxador: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  iconeBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(217, 70, 111, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 111, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: {
    color: Cores.texto,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  descricao: {
    color: Cores.textoSuave,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  botoes: {
    width: '100%',
    gap: 12,
  },
  botaoSair: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: Cores.vinhoEscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCancelar: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: Cores.superficieAlta,
    borderWidth: 1,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoPressionado: {
    opacity: 0.8,
  },
  botaoSairTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  botaoCancelarTexto: {
    color: Cores.texto,
    fontSize: 15,
    fontWeight: '600',
  },
});
