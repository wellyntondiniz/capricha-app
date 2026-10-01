import { Ionicons } from '@expo/vector-icons';
import {
    Image,
    Pressable,
    PressableStateCallbackType,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';

type Icone = keyof typeof Ionicons.glyphMap;

// TODO: trocar pelos dados reais do usuário quando existir login
const usuario = { nome: 'Ana Souza', foto: null as string | null, notificacoesNaoLidas: 2 };

const ATALHOS: { id: string; titulo: string; descricao: string; icone: Icone; cor: string }[] = [
  { id: 'eventos', titulo: 'Eventos', descricao: 'Veja os eventos disponíveis', icone: 'calendar', cor: Cores.vinho },
  { id: 'palestras', titulo: 'Palestras', descricao: 'Consulte as palestras de cada evento', icone: 'mic', cor: Cores.vinhoEscuro },
  { id: 'ranking', titulo: 'Ranking', descricao: 'Classificação e pontos dos participantes', icone: 'trophy', cor: Cores.vinhoClaro },
  { id: 'quiz', titulo: 'Quiz', descricao: 'Responda perguntas e acumule pontos', icone: 'help-circle', cor: Cores.vinhoProfundo },
];

function estadoDoToque(state: PressableStateCallbackType) {
  const { hovered } = state as PressableStateCallbackType & { hovered?: boolean };
  return { pressed: state.pressed, hovered: !!hovered };
}

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}

export default function HomeScreen() {
  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.conteudo}>
          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir meu perfil"
              onPress={() => {
                /* TODO: navegar para o perfil quando a tela existir */
              }}
              style={(state) => [styles.avatarBotao, estadoDoToque(state).pressed && styles.pressOpacidade]}>
              {usuario.foto ? (
                <Image source={{ uri: usuario.foto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarTexto}>{iniciais(usuario.nome)}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.saudacao}>
              <Text style={styles.ola} numberOfLines={1}>
                Olá, {primeiroNome}! 👋
              </Text>
              <Text style={styles.boasVindas} numberOfLines={2}>
                Pronto para o próximo evento?
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                usuario.notificacoesNaoLidas > 0
                  ? `Notificações, ${usuario.notificacoesNaoLidas} não lidas`
                  : 'Notificações'
              }
              onPress={() => {
                /* TODO: abrir notificações */
              }}
              style={(state) => [
                styles.sino,
                estadoDoToque(state).hovered && styles.sinoHover,
                estadoDoToque(state).pressed && styles.pressOpacidade,
              ]}>
              <Ionicons name="notifications-outline" size={24} color={Cores.texto} />
              {usuario.notificacoesNaoLidas > 0 && <View style={styles.sinoBadge} />}
            </Pressable>
          </View>

          {/* Acesso rápido */}
          <Text accessibilityRole="header" style={styles.secaoTitulo}>
            Acesso rápido
          </Text>
          <View style={styles.lista}>
            {ATALHOS.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.titulo}. ${item.descricao}`}
                onPress={() => {
                  /* TODO: conectar à tela correspondente (fora do escopo desta história) */
                }}
                style={(state) => {
                  const { pressed, hovered } = estadoDoToque(state);
                  return [
                    styles.card,
                    { backgroundColor: item.cor, shadowColor: item.cor },
                    hovered && styles.cardHover,
                    pressed && styles.cardPress,
                  ];
                }}>
                <Ionicons name={item.icone} size={96} color="rgba(255,255,255,0.10)" style={styles.cardDecoracao} />
                <View style={styles.cardIconeBox}>
                  <Ionicons name={item.icone} size={26} color="#FFFFFF" />
                </View>
                <View style={styles.cardTextos}>
                  <Text style={styles.cardTitulo}>{item.titulo}</Text>
                  <Text style={styles.cardDescricao}>{item.descricao}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  scroll: { paddingTop: 8, paddingBottom: 32 },
  conteudo: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20 },

  pressOpacidade: { opacity: 0.7 },

  // Cabeçalho
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatarBotao: { borderRadius: 28 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Cores.vinhoEscuro },
  avatarFallback: { backgroundColor: Cores.vinho, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  saudacao: { flex: 1 },
  ola: { color: Cores.texto, fontSize: 20, fontWeight: '700' },
  boasVindas: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20, marginTop: 2 },
  sino: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinoHover: { backgroundColor: Cores.superficieAlta },
  sinoBadge: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Cores.destaque,
    borderWidth: 2,
    borderColor: Cores.superficie,
  },

  // Seção
  secaoTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 12 },

  // Lista vertical de cards horizontais
  lista: { flexDirection: 'column', gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 96,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHover: { transform: [{ translateY: -2 }], shadowOpacity: 0.45 },
  cardPress: { transform: [{ scale: 0.98 }], shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 },
  cardDecoracao: { position: 'absolute', right: 24, bottom: -20 },
  cardIconeBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextos: { flex: 1, gap: 2 },
  cardTitulo: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cardDescricao: { color: '#FFFFFF', opacity: 0.92, fontSize: 13, lineHeight: 18 },
});