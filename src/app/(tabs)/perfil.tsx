import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModalLogout } from '@/components/modal-logout';
import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'U';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function PerfilScreen() {
  const { usuario, deslogar } = useAuth();
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const nome = usuario?.nome || 'Usuário';
  const email = usuario?.email || 'Sem e-mail';
  const ehAdmin =
    usuario?.perfil?.toUpperCase() === 'ADMIN' ||
    usuario?.perfil?.toUpperCase() === 'ADMINISTRADOR';
  const perfil = ehAdmin ? 'Administrador' : 'Participante';

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

  function handleLogout() {
    setModalLogoutVisivel(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.conteudo}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciais(nome)}</Text>
            </View>
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
            onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.botaoSairTexto}>Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>

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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Cores.vinho,
    borderWidth: 2,
    borderColor: Cores.destaque,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarTexto: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
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

export { default } from '../home_perfil';