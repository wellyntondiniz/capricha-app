import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ModalFotoPerfil } from '@/components/modal-foto-perfil';
import { ModalLogout } from '@/components/modal-logout';
import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import {
  enviarFotoPerfil,
  obterUrlFotoUsuario,
  removerFotoPerfil,
} from '@/services/usuarioService';
import { router } from 'expo-router';

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'U';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function PerfilScreen() {
  const { usuario, deslogar, salvarSessao } = useAuth();
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState(false);
  const [modalFotoVisivel, setModalFotoVisivel] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [carregandoFoto, setCarregandoFoto] = useState(false);

  const nome = usuario?.nome || 'Usuário';
  const email = usuario?.email || 'Sem e-mail';
  const ehAdmin =
    usuario?.perfil?.toUpperCase() === 'ADMIN' ||
    usuario?.perfil?.toUpperCase() === 'ADMINISTRADOR';
  const perfil = ehAdmin ? 'Administrador' : 'Participante';
  const urlFoto = obterUrlFotoUsuario(usuario?.foto);

  const confirmarLogout = async () => {
    setSaindo(true);
    try {
      await deslogar();
    } catch (e) {
      console.error('Erro ao sair:', e);
    } finally {
      setSaindo(false);
      setModalLogoutVisivel(false);
    }
  };

  const handleEscolherGaleria = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissao.granted) {
          Toast.show({
            type: 'error',
            text1: 'Permissão necessária',
            text2: 'Permita o acesso à galeria para escolher uma foto.',
          });
          return;
        }
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!resultado.canceled && resultado.assets[0] && usuario?.id) {
        setCarregandoFoto(true);
        const usuarioAtualizado = await enviarFotoPerfil(usuario.id, resultado.assets[0]);
        await salvarSessao(usuarioAtualizado);
        setModalFotoVisivel(false);
        Toast.show({
          type: 'success',
          text1: 'Foto atualizada!',
          text2: 'Sua foto de perfil foi alterada com sucesso.',
        });
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao enviar foto',
        text2: e instanceof Error ? e.message : 'Tente novamente.',
      });
    } finally {
      setCarregandoFoto(false);
    }
  };

  const handleTirarFoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) {
          Toast.show({
            type: 'error',
            text1: 'Permissão necessária',
            text2: 'Permita o acesso à câmera para tirar uma foto.',
          });
          return;
        }
      }

      const resultado = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!resultado.canceled && resultado.assets[0] && usuario?.id) {
        setCarregandoFoto(true);
        const usuarioAtualizado = await enviarFotoPerfil(usuario.id, resultado.assets[0]);
        await salvarSessao(usuarioAtualizado);
        setModalFotoVisivel(false);
        Toast.show({
          type: 'success',
          text1: 'Foto atualizada!',
          text2: 'Sua foto de perfil foi alterada com sucesso.',
        });
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao tirar foto',
        text2: e instanceof Error ? e.message : 'Tente novamente.',
      });
    } finally {
      setCarregandoFoto(false);
    }
  };

  const handleRemoverFoto = async () => {
    if (!usuario?.id) return;
    try {
      setCarregandoFoto(true);
      const usuarioAtualizado = await removerFotoPerfil(usuario.id);
      await salvarSessao(usuarioAtualizado);
      setModalFotoVisivel(false);
      Toast.show({
        type: 'success',
        text1: 'Foto removida',
        text2: 'Você voltou a usar suas iniciais.',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao remover foto',
        text2: e instanceof Error ? e.message : 'Tente novamente.',
      });
    } finally {
      setCarregandoFoto(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.conteudo}>
          <View style={styles.cabecalho}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/home');
                }
              }}
              style={styles.botaoVoltar}>
              <Ionicons name="arrow-back" size={22} color={Cores.texto} />
            </Pressable>
          </View>
          {/* Header com Avatar Interativo */}
          <View style={styles.header}>
            <Pressable
              style={styles.avatarBotao}
              onPress={() => setModalFotoVisivel(true)}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
            >
              {urlFoto ? (
                <Image source={{ uri: urlFoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarTexto}>{iniciais(nome)}</Text>
                </View>
              )}
              <View style={styles.badgeCamera}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.nome}>{nome}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          {/* Card com Detalhes */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Informações da Conta</Text>

            <View style={styles.item}>
              <Ionicons name="person-outline" size={20} color={Cores.destaque} />
              <View style={styles.itemTextos}>
                <Text style={styles.itemRotulo}>Nome</Text>
                <Text style={styles.itemValor}>{nome}</Text>
              </View>
            </View>

            <View style={styles.divisor} />

            <View style={styles.item}>
              <Ionicons name="mail-outline" size={20} color={Cores.destaque} />
              <View style={styles.itemTextos}>
                <Text style={styles.itemRotulo}>E-mail</Text>
                <Text style={styles.itemValor}>{email}</Text>
              </View>
            </View>

            <View style={styles.divisor} />

            <View style={styles.item}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Cores.destaque} />
              <View style={styles.itemTextos}>
                <Text style={styles.itemRotulo}>Perfil</Text>
                <Text style={styles.itemValor}>{perfil}</Text>
              </View>
            </View>
          </View>

          {/* Botão Sair */}
          <Pressable
            style={({ pressed }) => [styles.botaoSair, pressed && styles.botaoSairPressionado]}
            onPress={() => setModalLogoutVisivel(true)}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.botaoSairTexto}>Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal de Escolha da Foto */}
      <ModalFotoPerfil
        visivel={modalFotoVisivel}
        aoEscolherGaleria={handleEscolherGaleria}
        aoTirarFoto={handleTirarFoto}
        aoRemoverFoto={handleRemoverFoto}
        temFoto={!!urlFoto}
        aoCancelar={() => setModalFotoVisivel(false)}
        carregando={carregandoFoto}
      />

      {/* Modal de Confirmação de Logout */}
      <ModalLogout
        visivel={modalLogoutVisivel}
        aoConfirmar={confirmarLogout}
        aoCancelar={() => setModalLogoutVisivel(false)}
        carregando={saindo}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  scroll: { paddingTop: 24, paddingBottom: 32 },
  conteudo: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  avatarBotao: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Cores.destaque,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
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
  avatarFallback: {
    backgroundColor: Cores.vinho,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  badgeCamera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Cores.destaque,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Cores.fundo,
  },
  nome: { color: Cores.texto, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  email: { color: Cores.textoSuave, fontSize: 14, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Cores.superficie,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Cores.borda,
    marginBottom: 24,
  },
  cardTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  itemTextos: { flex: 1 },
  itemRotulo: { color: Cores.textoSuave, fontSize: 12 },
  itemValor: { color: Cores.texto, fontSize: 15, fontWeight: '500', marginTop: 2 },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: 8 },
  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
    backgroundColor: Cores.vinhoEscuro,
    marginTop: 8,
  },
  botaoSairPressionado: { opacity: 0.8 },
  botaoSairTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});