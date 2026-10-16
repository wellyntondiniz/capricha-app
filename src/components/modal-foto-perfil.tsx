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

type ModalFotoPerfilProps = {
  visivel: boolean;
  aoEscolherGaleria: () => void;
  aoTirarFoto: () => void;
  aoRemoverFoto?: () => void;
  temFoto: boolean;
  aoCancelar: () => void;
  carregando?: boolean;
};

export function ModalFotoPerfil({
  visivel,
  aoEscolherGaleria,
  aoTirarFoto,
  aoRemoverFoto,
  temFoto,
  aoCancelar,
  carregando = false,
}: ModalFotoPerfilProps) {
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

          <Text style={styles.titulo}>Foto de perfil</Text>
          <Text style={styles.descricao}>
            Escolha como deseja atualizar a imagem da sua conta
          </Text>

          {carregando ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Cores.destaque} size="large" />
              <Text style={styles.loadingTexto}>Atualizando foto...</Text>
            </View>
          ) : (
            <View style={styles.opcoes}>
              <Pressable
                style={({ pressed }) => [
                  styles.opcao,
                  pressed && styles.opcaoPressionada,
                ]}
                onPress={aoEscolherGaleria}
              >
                <View style={styles.iconeContainer}>
                  <Ionicons name="images-outline" size={22} color={Cores.destaque} />
                </View>
                <View style={styles.opcaoTextos}>
                  <Text style={styles.opcaoTitulo}>Escolher da galeria</Text>
                  <Text style={styles.opcaoSubtitulo}>Selecionar imagem do seu aparelho</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Cores.inativo} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.opcao,
                  pressed && styles.opcaoPressionada,
                ]}
                onPress={aoTirarFoto}
              >
                <View style={styles.iconeContainer}>
                  <Ionicons name="camera-outline" size={22} color={Cores.destaque} />
                </View>
                <View style={styles.opcaoTextos}>
                  <Text style={styles.opcaoTitulo}>Tirar foto</Text>
                  <Text style={styles.opcaoSubtitulo}>Usar a câmera para uma nova foto</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Cores.inativo} />
              </Pressable>

              {temFoto && aoRemoverFoto && (
                <Pressable
                  style={({ pressed }) => [
                    styles.opcao,
                    styles.opcaoRemover,
                    pressed && styles.opcaoPressionada,
                  ]}
                  onPress={aoRemoverFoto}
                >
                  <View style={[styles.iconeContainer, styles.iconeContainerRemover]}>
                    <Ionicons name="trash-outline" size={22} color="#F85149" />
                  </View>
                  <View style={styles.opcaoTextos}>
                    <Text style={[styles.opcaoTitulo, styles.opcaoTituloRemover]}>
                      Remover foto atual
                    </Text>
                    <Text style={styles.opcaoSubtitulo}>Voltar a usar as iniciais</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Cores.inativo} />
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.botaoCancelar,
                  pressed && styles.opcaoPressionada,
                ]}
                onPress={aoCancelar}
              >
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </Pressable>
            </View>
          )}
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
    paddingHorizontal: 20,
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
    marginBottom: 16,
  },
  titulo: {
    color: Cores.texto,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  descricao: {
    color: Cores.textoSuave,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingTexto: {
    color: Cores.textoSuave,
    fontSize: 14,
  },
  opcoes: {
    width: '100%',
    gap: 10,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: Cores.superficieAlta,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Cores.borda,
  },
  opcaoRemover: {
    borderColor: 'rgba(248, 81, 73, 0.3)',
  },
  opcaoPressionada: {
    opacity: 0.75,
  },
  iconeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(217, 70, 111, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeContainerRemover: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
  },
  opcaoTextos: {
    flex: 1,
  },
  opcaoTitulo: {
    color: Cores.texto,
    fontSize: 15,
    fontWeight: '600',
  },
  opcaoTituloRemover: {
    color: '#F85149',
  },
  opcaoSubtitulo: {
    color: Cores.textoSuave,
    fontSize: 12,
    marginTop: 2,
  },
  botaoCancelar: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  botaoCancelarTexto: {
    color: Cores.textoSuave,
    fontSize: 15,
    fontWeight: '600',
  },
});
