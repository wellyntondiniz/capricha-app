import { Ionicons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

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

import { ModalLogout } from '@/components/modal-logout';
import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import { checkInProgress } from '@/features/check-in/check-in-progress';
import { httpCheckInService } from '@/features/check-in/http-check-in-service';
import { CheckInError, type CheckInEvent } from '@/features/check-in/types';
import { conexoesProgress } from '@/features/conexoes/conexoes-progress';
import { httpConexaoService } from '@/features/conexoes/http-conexao-service';
import type { ResumoConexoes } from '@/features/conexoes/types';
import { obterUrlFotoUsuario } from '@/services/usuarioService';

type Icone = keyof typeof Ionicons.glyphMap;

type StatusMissao =
  | { tipo: 'concluido'; texto: string }
  | { tipo: 'progresso'; atual: number; total: number; texto: string }
  | { tipo: 'bloqueado'; texto: string };

type Atalho = {
  id: string;
  titulo: string;
  descricao: string;
  icone: Icone;
  cor: string;
  rota: Href;
  xp?: string;
  status?: StatusMissao;
};

const ATALHOS_ADMIN: Atalho[] = [
  { id: 'eventos', titulo: 'Eventos', descricao: 'Veja os eventos disponíveis', icone: 'calendar', cor: Cores.vinho, rota: '/(tabs)/eventos' },
  { id: 'palestras', titulo: 'Palestras', descricao: 'Consulte as palestras de cada evento', icone: 'mic', cor: Cores.vinhoEscuro, rota: '/palestras' },
  { id: 'perguntas', titulo: 'Perguntas', descricao: 'Visualize todas as perguntas', icone: 'list', cor: Cores.vinhoProfundo, rota: '/lista-perguntas' },
  { id: 'check-in-evento', titulo: 'Checkin do evento', descricao: 'Escaneie o QR Code e confirme sua presença', icone: 'qr-code', cor: Cores.vinho, rota: '/check-in' },
  { id: 'check-in-palestras', titulo: 'Checkin das palestras', descricao: 'Confirme sua presença nas palestras do evento', icone: 'qr-code-outline', cor: Cores.vinhoClaro, rota: '/check-in-palestras' },
];

const ATALHOS_PARTICIPANTE: Atalho[] = [
  {
    id: 'check-in-evento',
    titulo: 'Checkin do evento',
    descricao: 'Realize seu check-in no evento.',
    icone: 'ticket-outline',
    cor: Cores.vinho,
    rota: '/check-in',
    xp: 'Presença',
  },
  {
    id: 'check-in-palestras',
    titulo: 'Checkin das palestras',
    descricao: 'Registre sua presença em uma palestra.',
    icone: 'easel-outline',
    cor: Cores.vinhoClaro,
    rota: '/check-in-palestras',
    xp: 'Presença',
  },
  {
    id: 'quiz',
    titulo: 'Quiz',
    descricao: 'Responda às questões sobre o conteúdo.',
    icone: 'help-circle-outline',
    cor: Cores.destaque,
    rota: '/quiz',
    xp: '+100 XP',
    status: { tipo: 'progresso', atual: 2, total: 3, texto: '2 de 3 quizzes' },
  },
  {
    id: 'conectar-pessoas',
    titulo: 'Conectar Pessoas',
    descricao: 'Conecte-se com outros participantes do evento.',
    icone: 'people',
    cor: Cores.vinhoClaro,
    rota: '/conectar-pessoas',
    xp: '+150 XP',
    status: { tipo: 'progresso', atual: 2, total: 3, texto: '2 de 3 conexões' },
  },
  {
    id: 'votar-poster',
    titulo: 'Votar em poster',
    descricao: 'Conheça os trabalhos e vote no seu favorito.',
    icone: 'document-text-outline',
    cor: Cores.vinho,
    rota: '/votar-poster',
    xp: '+100 XP',
    status: { tipo: 'progresso', atual: 0, total: 1, texto: '0 de 1 voto' },
  },
  {
    id: 'avaliar-aplicativo',
    titulo: 'Avaliar Aplicativo',
    descricao: 'Responda ao questionário de avaliação do aplicativo.',
    icone: 'chatbubble-ellipses-outline',
    cor: Cores.vinhoEscuro,
    rota: '/avaliar-aplicativo',
    xp: '—',
    status: { tipo: 'bloqueado', texto: 'Disponível ao final do evento' },
  },
];

function estadoDoToque(state: PressableStateCallbackType) {
  const { hovered } = state as PressableStateCallbackType & { hovered?: boolean };
  return { pressed: state.pressed, hovered: !!hovered };
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'U';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function HomeScreen() {
  const { usuario, deslogar } = useAuth();
  const router = useRouter();
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [nomeEventoAtivo, setNomeEventoAtivo] = useState('Consultando evento...');
  const [eventoCheckIn, setEventoCheckIn] = useState<CheckInEvent>();
  const [palestrasCheckIn, setPalestrasCheckIn] = useState<CheckInEvent[]>([]);
  const [estadoCheckIn, setEstadoCheckIn] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [eventoConexao, setEventoConexao] = useState<CheckInEvent>();
  const [resumoConexoes, setResumoConexoes] = useState<ResumoConexoes | null>(null);

  const nomeCompleto = usuario?.nome || 'Participante';
  const primeiroNome = nomeCompleto.split(' ')[0];
  // Solicitações de conexão recebidas que ainda esperam resposta.
  const notificacoesNaoLidas = resumoConexoes?.recebidas.length ?? 0;
  const urlFoto = obterUrlFotoUsuario(usuario?.foto);

  const ehAdmin =
    usuario?.perfil?.toUpperCase() === 'ADMIN' ||
    usuario?.perfil?.toUpperCase() === 'ADMINISTRADOR';
  const perfilFormatado = ehAdmin ? 'Administrador' : 'Participante';
  const progresso = checkInProgress(eventoCheckIn, palestrasCheckIn);
  const aguardando: StatusMissao = { tipo: 'progresso', atual: 0, total: 0,
    texto: estadoCheckIn === 'erro' ? 'Não foi possível consultar a presença' : 'Consultando presença...' };
  const atalhos = ehAdmin ? ATALHOS_ADMIN : ATALHOS_PARTICIPANTE.map(item => {
    if (item.id === 'check-in-evento') return { ...item, status: estadoCheckIn === 'pronto' ? progresso.eventStatus : aguardando };
    if (item.id === 'check-in-palestras') return { ...item, status: estadoCheckIn === 'pronto' ? progresso.lectureStatus : aguardando };
    if (item.id === 'conectar-pessoas') return { ...item, status: conexoesProgress(estadoCheckIn, eventoConexao, resumoConexoes) };
    return item;
  });

  const totalMissoes = ATALHOS_PARTICIPANTE.length;
  const missoesConcluidas = atalhos.filter(
    (m) => m.status?.tipo === 'concluido'
  ).length;

  useFocusEffect(useCallback(() => {
    let ativo = true;
    if (!usuario?.token) return;
    setEstadoCheckIn('carregando');
    Promise.all([
      httpCheckInService.getEvents(usuario.token),
      httpCheckInService.getLectures(usuario.token),
      // Falha nas conexões não derruba o restante da Home; só a sessão expirada é repassada.
      httpConexaoService.getResumo(usuario.token).catch((error: unknown) => {
        if (error instanceof CheckInError && error.code === 'AUTH_REQUIRED') throw error;
        return null;
      }),
    ])
      .then(([eventos, palestras, conexoes]) => {
        if (!ativo) return;
        // Evento ativo das conexões: em andamento e com check-in feito (o mesmo da tela de conexões).
        setEventoConexao(eventos.find((e) => e.hasCheckedIn && e.canCheckIn));
        setResumoConexoes(conexoes);
        // Mantém a seleção existente da Home: o primeiro evento retornado pela API.
        setEventoCheckIn(eventos[0]);
        setNomeEventoAtivo(eventos[0]?.nome || 'Nenhum evento disponível');
        setPalestrasCheckIn(palestras);
        setEstadoCheckIn('pronto');
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        setEstadoCheckIn('erro');
        setNomeEventoAtivo('Não foi possível consultar o evento');
        if (error instanceof CheckInError && error.code === 'AUTH_REQUIRED') void deslogar();
      });
    return () => {
      ativo = false;
    };
  }, [usuario, deslogar]));

  // Mantém o aviso de solicitações recebidas atualizado enquanto a Home está aberta.
  useFocusEffect(useCallback(() => {
    const token = usuario?.token;
    if (!token) return;
    let ativo = true;
    const timer = setInterval(() => {
      httpConexaoService.getResumo(token)
        .then((resumo) => { if (ativo) setResumoConexoes(resumo); })
        .catch(() => undefined);
    }, 15000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [usuario?.token]));

  const confirmarLogout = async () => {
    setSaindo(true);
    try {
      await deslogar();
    } catch (e) {
      console.error('Erro ao encerrar sessão:', e);
    } finally {
      setSaindo(false);
      setModalLogoutVisivel(false);
    }
  };

  const handleLogout = () => {
    setModalLogoutVisivel(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.conteudo}>
          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir meu perfil"
              onPress={() => router.navigate('/(tabs)/perfil')}
              style={(state) => [styles.avatarBotao, estadoDoToque(state).pressed && styles.pressOpacidade]}>
              {urlFoto ? (
                <Image source={{ uri: urlFoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarTexto}>{iniciais(nomeCompleto)}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.saudacao}>
              <View style={styles.usuarioLinha}>
                <Text style={styles.ola} numberOfLines={1}>
                  Olá, {primeiroNome}!
                </Text>
                <View
                  style={[
                    styles.badgePerfil,
                    ehAdmin ? styles.badgeAdmin : styles.badgeParticipante,
                  ]}>
                  <Text
                    style={[
                      styles.badgePerfilTexto,
                      ehAdmin ? styles.badgeAdminTexto : styles.badgeParticipanteTexto,
                    ]}>
                    {perfilFormatado}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Evento ativo: ${nomeEventoAtivo}. Toque para ver eventos`}
                onPress={() => router.navigate('/(tabs)/eventos')}
                style={(state) => [
                  styles.eventoAtivoLinha,
                  estadoDoToque(state).pressed && styles.pressOpacidade,
                ]}>
                <Ionicons name="calendar-outline" size={13} color={Cores.destaque} />
                <Text style={styles.boasVindas} numberOfLines={1}>
                  {nomeEventoAtivo}
                </Text>
              </Pressable>
            </View>

            <View style={styles.acoesHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  notificacoesNaoLidas > 0
                    ? `Notificações, ${notificacoesNaoLidas} solicitações de conexão pendentes`
                    : 'Notificações'
                }
                onPress={() => router.navigate(notificacoesNaoLidas > 0 ? '/conectar-pessoas' : '/notificacoes')}
                style={(state) => [
                  styles.botaoAcao,
                  estadoDoToque(state).hovered && styles.botaoAcaoHover,
                  estadoDoToque(state).pressed && styles.pressOpacidade,
                ]}>
                <Ionicons name="notifications-outline" size={22} color={Cores.texto} />
                {notificacoesNaoLidas > 0 && <View style={styles.sinoBadge} />}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
                onPress={handleLogout}
                style={(state) => [
                  styles.botaoAcao,
                  estadoDoToque(state).hovered && styles.botaoAcaoHover,
                  estadoDoToque(state).pressed && styles.pressOpacidade,
                ]}>
                <Ionicons name="log-out-outline" size={22} color="#D9466F" />
              </Pressable>
            </View>
          </View>

          {/* Painel de missões e pontuação */}
          <View
            style={styles.painelMissoes}
            accessible
            accessibilityLabel="Painel de missões e pontuação: 250 pontos XP, 3º no ranking, 2 conquistas">
            <View style={styles.painelMetricas}>
              <View style={styles.metricaItem}>
                <Ionicons name="star" size={28} color="#FBBF24" />
                <View style={styles.metricaTextos}>
                  <Text style={styles.metricaValor}>250</Text>
                  <Text style={styles.metricaRotulo}>pontos (XP)</Text>
                </View>
              </View>

              <View style={styles.metricaDivisor} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="3º no ranking. Toque para abrir o ranking completo"
                onPress={() => router.navigate('/(tabs)/ranking')}
                style={(state) => [
                  styles.metricaItem,
                  styles.metricaItemInterativa,
                  estadoDoToque(state).hovered && styles.metricaItemHover,
                  estadoDoToque(state).pressed && styles.pressOpacidade,
                ]}>
                <Ionicons name="stats-chart" size={26} color={Cores.destaque} />
                <View style={styles.metricaTextos}>
                  <Text style={styles.metricaValor}>3º</Text>
                  <Text style={styles.metricaRotulo}>no ranking ↗</Text>
                </View>
              </Pressable>

              <View style={styles.metricaDivisor} />

              <View style={styles.metricaItem}>
                <Ionicons name="ribbon" size={28} color="#34D399" />
                <View style={styles.metricaTextos}>
                  <Text style={styles.metricaValor}>2</Text>
                  <Text style={styles.metricaRotulo}>conquistas</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cabeçalho da seção */}
          <View style={styles.secaoCabecalho}>
            <Text accessibilityRole="header" style={styles.secaoTitulo}>
              {ehAdmin ? 'Acesso rápido' : 'Missões do evento'}
            </Text>
            {!ehAdmin && (
              <View style={styles.secaoProgressoBadge}>
                <Ionicons name="checkmark-done" size={14} color={Cores.destaque} />
                <Text style={styles.secaoProgressoTexto}>
                  {missoesConcluidas} de {totalMissoes} concluídas
                </Text>
              </View>
            )}
          </View>

          <View style={styles.lista}>
            {atalhos.map((item) => {
              const ehMissao = !ehAdmin && item.status !== undefined;
              const concluida = item.status?.tipo === 'concluido';
              const bloqueada = item.status?.tipo === 'bloqueado';
              const emProgresso = item.status?.tipo === 'progresso';

              const progressoPercentual =
                item.status?.tipo === 'progresso' && item.status.total > 0
                  ? Math.min(100, Math.round((item.status.atual / item.status.total) * 100))
                  : 0;

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.titulo}. ${item.descricao}`}
                  onPress={() => router.navigate(item.rota)}
                  style={(state) => {
                    const { pressed, hovered } = estadoDoToque(state);
                    return [
                      styles.card,
                      ehMissao
                        ? [
                            styles.cardMissao,
                            concluida && styles.cardMissaoConcluida,
                            emProgresso && styles.cardMissaoEmProgresso,
                            bloqueada && styles.cardMissaoBloqueada,
                          ]
                        : { backgroundColor: item.cor, shadowColor: item.cor },
                      hovered && styles.cardHover,
                      pressed && styles.cardPress,
                    ];
                  }}>
                  <View
                    style={[
                      styles.cardIconeBox,
                      ehMissao && {
                        backgroundColor: concluida
                          ? 'rgba(16, 185, 129, 0.16)'
                          : bloqueada
                          ? 'rgba(255, 255, 255, 0.06)'
                          : Cores.vinhoSuave,
                        borderWidth: 1,
                        borderColor: concluida
                          ? 'rgba(52, 211, 153, 0.35)'
                          : bloqueada
                          ? 'rgba(255, 255, 255, 0.10)'
                          : 'rgba(217, 70, 111, 0.35)',
                      },
                    ]}>
                    <Ionicons
                      name={item.icone}
                      size={26}
                      color={
                        ehMissao
                          ? concluida
                            ? '#34D399'
                            : bloqueada
                            ? Cores.textoSuave
                            : Cores.destaque
                          : '#FFFFFF'
                      }
                    />
                  </View>

                  <View style={styles.cardTextos}>
                    <Text
                      style={[
                        styles.cardTitulo,
                        bloqueada && styles.cardTituloBloqueado,
                      ]}>
                      {item.titulo}
                    </Text>
                    <Text
                      style={[
                        styles.cardDescricao,
                        ehMissao && styles.cardDescricaoMissao,
                      ]}>
                      {item.descricao}
                    </Text>

                    {item.status?.tipo === 'concluido' && (
                      <View style={styles.badgeConcluido}>
                        <Text style={styles.badgeConcluidoTexto}>{item.status.texto}</Text>
                        <Ionicons name="checkmark" size={13} color="#34D399" />
                      </View>
                    )}

                    {item.status?.tipo === 'progresso' && (
                      <View style={styles.progressoLinha}>
                        <View style={styles.progressoTrilha}>
                          <View
                            style={[
                              styles.progressoPreenchimento,
                              { width: `${progressoPercentual}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressoTexto}>{item.status.texto}</Text>
                      </View>
                    )}

                    {item.status?.tipo === 'bloqueado' && (
                      <View style={styles.badgeBloqueado}>
                        <Ionicons name="lock-closed" size={12} color={Cores.textoSuave} />
                        <Text style={styles.badgeBloqueadoTexto}>{item.status.texto}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardDireita}>
                    {item.xp !== undefined && (
                      <View
                        style={[
                          styles.xpBadge,
                          concluida && styles.xpBadgeConcluido,
                          bloqueada && styles.xpBadgeBloqueado,
                        ]}>
                        <Text
                          style={[
                            styles.xpTexto,
                            concluida && styles.xpTextoConcluido,
                            bloqueada && styles.xpTextoBloqueado,
                          ]}>
                          {item.xp}
                        </Text>
                      </View>
                    )}
                    <Ionicons
                      name={bloqueada ? 'lock-closed-outline' : 'chevron-forward'}
                      size={18}
                      color={ehMissao ? Cores.textoSuave : '#FFFFFF'}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
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
  usuarioLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ola: { color: Cores.texto, fontSize: 19, fontWeight: '700' },
  badgePerfil: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'center',
  },
  badgePerfilTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeParticipante: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badgeParticipanteTexto: {
    color: Cores.textoSuave,
  },
  badgeAdmin: {
    backgroundColor: 'rgba(217, 70, 111, 0.12)',
    borderColor: 'rgba(217, 70, 111, 0.35)',
  },
  badgeAdminTexto: {
    color: Cores.destaque,
    fontWeight: '700',
  },
  eventoAtivoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  boasVindas: { color: Cores.textoSuave, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  acoesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botaoAcao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoAcaoHover: { backgroundColor: Cores.superficieAlta },
  sinoBadge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Cores.destaque,
    borderWidth: 2,
    borderColor: Cores.superficie,
  },

  // Painel de missões e pontuação
  painelMissoes: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Cores.vinhoProfundo,
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 111, 0.35)',
    overflow: 'hidden',
    shadowColor: Cores.vinhoProfundo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  painelMetricas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  metricaItemInterativa: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  metricaItemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricaTextos: {
    gap: 1,
  },
  metricaValor: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  metricaRotulo: {
    color: 'rgba(242, 242, 244, 0.78)',
    fontSize: 12,
    fontWeight: '500',
  },
  metricaDivisor: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },

  // Seção
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  secaoTitulo: { color: Cores.texto, fontSize: 18, fontWeight: '700' },
  secaoProgressoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 111, 0.30)',
  },
  secaoProgressoTexto: {
    color: Cores.textoSuave,
    fontSize: 12,
    fontWeight: '600',
  },

  // Lista vertical de cards horizontais
  lista: { flexDirection: 'column', gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 96,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  cardMissao: {
    backgroundColor: Cores.superficie,
    borderColor: Cores.borda,
    shadowColor: Cores.sombra,
  },
  cardMissaoConcluida: {
    borderColor: 'rgba(52, 211, 153, 0.32)',
    backgroundColor: '#131A20',
  },
  cardMissaoEmProgresso: {
    borderColor: 'rgba(169, 43, 80, 0.38)',
  },
  cardMissaoBloqueada: {
    opacity: 0.68,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHover: { transform: [{ translateY: -2 }], shadowOpacity: 0.45 },
  cardPress: { transform: [{ scale: 0.98 }], shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 },
  cardIconeBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextos: { flex: 1, gap: 2 },
  cardTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '700' },
  cardTituloBloqueado: { color: Cores.textoSuave },
  cardDescricao: { color: '#FFFFFF', opacity: 0.9, fontSize: 13, lineHeight: 18 },
  cardDescricaoMissao: { color: Cores.textoSuave, opacity: 1 },
  badgeConcluido: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  badgeConcluidoTexto: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  badgeBloqueado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  badgeBloqueadoTexto: { color: Cores.textoSuave, fontSize: 12, fontWeight: '600' },
  progressoLinha: { marginTop: 8, gap: 6 },
  progressoTrilha: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
  },
  progressoPreenchimento: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Cores.destaque,
  },
  progressoTexto: { color: Cores.textoSuave, fontSize: 12, fontWeight: '600' },
  cardDireita: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  xpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Cores.vinhoSuave,
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 111, 0.35)',
  },
  xpBadgeConcluido: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  xpBadgeBloqueado: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  xpTexto: { color: Cores.destaque, fontSize: 12, fontWeight: '800' },
  xpTextoConcluido: { color: '#34D399' },
  xpTextoBloqueado: { color: Cores.textoSuave },
});