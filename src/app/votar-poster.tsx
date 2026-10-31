import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import { httpCheckInService } from '@/features/check-in/http-check-in-service';
import { QrScanner } from '@/features/check-in/qr-scanner';
import { CheckInError, type CheckInEvent } from '@/features/check-in/types';
import {
  httpVotacaoService,
  type ResumoQrCode,
  type VotacaoSituacao,
} from '@/features/votacao/http-votacao-service';
import { parseVoteQr } from '@/features/votacao/parse-vote-qr';
import { buscarEventoPorId } from '@/services/eventoService';
import { buscarResumo, listarResumosDoEvento, type Resumo } from '@/services/resumoService';
import { erro as notificarErro, sucesso } from '@/utils/notify';

function inteiroPositivo(valor: unknown): number | undefined {
  return typeof valor === 'string' && /^[1-9]\d*$/.test(valor) ? Number(valor) : undefined;
}

function formatarData(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
}

export default function VotarPosterScreen() {
  const params = useLocalSearchParams<{ eventoId?: string; resumoId?: string }>();
  const { usuario, carregando: carregandoSessao, deslogar } = useAuth();
  const token = usuario?.token ?? '';
  const admin = ['ADMIN', 'ADMINISTRADOR'].includes(usuario?.perfil?.toUpperCase() ?? '');

  const resumoInicial = inteiroPositivo(params.resumoId);
  // Vindo da Home (sem evento/resumo na URL), o usuário escolhe o evento numa lista antes de ver os resumos.
  const entradaDireta = !!inteiroPositivo(params.eventoId) || !!resumoInicial;
  const [eventoId, setEventoId] = useState<number | undefined>(inteiroPositivo(params.eventoId));
  const [nomeEvento, setNomeEvento] = useState('');
  const [eventos, setEventos] = useState<CheckInEvent[]>([]);
  const [resumos, setResumos] = useState<Resumo[]>([]);
  const [situacao, setSituacao] = useState<VotacaoSituacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Enquanto descobre o evento (Home) ou o evento do resumo recebido pela URL.
  const [resolvendo, setResolvendo] = useState(!inteiroPositivo(params.eventoId));
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  // A lista de resumos carrega mesmo se a consulta dos seus votos falhar; aí a votação fica bloqueada.
  const [erroVotacao, setErroVotacao] = useState<string | null>(null);

  const [escolhido, setEscolhido] = useState<Resumo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);

  const [qrResumo, setQrResumo] = useState<Resumo | null>(null);
  const [qrCode, setQrCode] = useState<ResumoQrCode | null>(null);
  const [qrCarregando, setQrCarregando] = useState(false);

  const enviandoRef = useRef(false);
  const requisicaoRef = useRef(0);
  const qrRequisicaoRef = useRef(0);
  const eventoCarregadoRef = useRef<number | undefined>(undefined);
  const resumoInicialAbertoRef = useRef(false);
  const buscaEventoRef = useRef(false);

  const carregar = useCallback(async () => {
    if (!eventoId || !token) {
      setCarregando(false);
      return;
    }
    const requisicao = ++requisicaoRef.current;
    // Spinner de tela cheia só ao trocar de evento; atualizar depois de votar não pisca a lista.
    if (eventoCarregadoRef.current !== eventoId) {
      setCarregando(true);
      setSituacao(null);
      setResumos([]);
    }
    setErroCarregar(null);
    try {
      const [evento, lista, atual] = await Promise.allSettled([
        buscarEventoPorId(eventoId),
        listarResumosDoEvento(eventoId),
        httpVotacaoService.getSituacao(eventoId, token),
      ]);
      if (requisicaoRef.current !== requisicao) return;
      if (lista.status === 'rejected') throw lista.reason;
      if (atual.status === 'rejected' && atual.reason instanceof CheckInError && atual.reason.code === 'AUTH_REQUIRED') {
        throw atual.reason;
      }
      eventoCarregadoRef.current = eventoId;
      setNomeEvento(evento.status === 'fulfilled' ? (evento.value.nome ?? '') : '');
      setResumos(lista.value);
      if (atual.status === 'fulfilled') {
        setSituacao(atual.value);
        setErroVotacao(null);
      } else {
        setSituacao(null);
        setErroVotacao(
          atual.reason instanceof Error ? atual.reason.message : 'Não foi possível consultar seus votos.'
        );
      }
    } catch (e) {
      if (requisicaoRef.current !== requisicao) return;
      if (e instanceof CheckInError && e.code === 'AUTH_REQUIRED') {
        await deslogar();
        router.replace('/');
        return;
      }
      setErroCarregar(e instanceof Error ? e.message : 'Não foi possível carregar os resumos.');
    } finally {
      if (requisicaoRef.current === requisicao) setCarregando(false);
    }
  }, [eventoId, token, deslogar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function tratarErro(e: unknown, padrao: string) {
    if (e instanceof CheckInError) {
      if (e.code === 'AUTH_REQUIRED') {
        await deslogar();
        router.replace('/');
        return;
      }
      if (['ALREADY_VOTED', 'VOTE_LIMIT_REACHED', 'NOT_CHECKED_IN', 'EVENT_NOT_ACTIVE'].includes(e.code)) {
        // Alguém mudou o estado (outro aparelho, evento desativado): fecha a confirmação e mostra a situação real.
        setEscolhido(null);
        void carregar();
      }
      notificarErro(padrao, e.message);
      return;
    }
    notificarErro(padrao, e instanceof Error ? e.message : undefined);
  }

  // Abre a confirmação de voto de um resumo (vindo do QR Code, da URL ou da lista). Troca de evento se preciso.
  const abrirResumoPorId = useCallback(async (id: number) => {
    const resumo = await buscarResumo(id);
    setEventoId(resumo.eventoId);
    setEscolhido(resumo);
  }, []);

  useEffect(() => {
    if (!token || !resumoInicial || resumoInicialAbertoRef.current) return;
    resumoInicialAbertoRef.current = true;
    abrirResumoPorId(resumoInicial)
      .catch((e) => {
        notificarErro('Não foi possível abrir o resumo', e instanceof Error ? e.message : undefined);
      })
      .finally(() => setResolvendo(false));
  }, [token, resumoInicial, abrirResumoPorId]);

  // Lista de eventos (com a informação de check-in de cada um) para o usuário escolher onde votar.
  const carregarEventos = useCallback(async () => {
    if (!token) return;
    setErroCarregar(null);
    try {
      const lista = await httpCheckInService.getEvents(token);
      // Eventos em que já fez check-in (pode votar) primeiro.
      setEventos([...lista].sort((a, b) => Number(b.hasCheckedIn) - Number(a.hasCheckedIn)));
    } catch (e) {
      if (e instanceof CheckInError && e.code === 'AUTH_REQUIRED') {
        await deslogar();
        router.replace('/');
        return;
      }
      setErroCarregar(e instanceof Error ? e.message : 'Não foi possível consultar os eventos.');
    } finally {
      setResolvendo(false);
    }
  }, [token, deslogar]);

  useEffect(() => {
    if (!token || eventoId || resumoInicial || !resolvendo || buscaEventoRef.current) return;
    buscaEventoRef.current = true;
    void carregarEventos();
  }, [token, eventoId, resumoInicial, resolvendo, carregarEventos]);

  function tentarNovamente() {
    if (eventoId) {
      void carregar();
      return;
    }
    setResolvendo(true);
    void carregarEventos();
  }

  function voltarParaEventos() {
    requisicaoRef.current++;
    eventoCarregadoRef.current = undefined;
    setEventoId(undefined);
    setNomeEvento('');
    setResumos([]);
    setSituacao(null);
    setErroVotacao(null);
    setErroCarregar(null);
    setEscolhido(null);
    // Atualiza em segundo plano (o check-in pode ter mudado desde a última consulta).
    void carregarEventos();
  }

  async function aoLerQr(valor: string) {
    setScannerAberto(false);
    try {
      const qr = parseVoteQr(valor);
      await abrirResumoPorId(qr.resumoId);
    } catch (e) {
      await tratarErro(e, 'Não foi possível ler este QR Code.');
    }
  }

  async function confirmarVoto() {
    if (!escolhido || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const registro = await httpVotacaoService.votar(escolhido.id, token);
      const restantes = registro.votesRemaining;
      sucesso(
        'Voto registrado +50 XP',
        restantes > 0
          ? `Você votou em “${escolhido.titulo}”. Ainda tem ${restantes} ${restantes === 1 ? 'voto' : 'votos'} neste evento.`
          : `Você votou em “${escolhido.titulo}”. Seus votos neste evento acabaram.`
      );
      setEscolhido(null);
      await carregar();
    } catch (e) {
      await tratarErro(e, 'Não foi possível registrar o voto.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  async function abrirQr(resumo: Resumo) {
    const requisicao = ++qrRequisicaoRef.current;
    setQrResumo(resumo);
    setQrCode(null);
    setQrCarregando(true);
    try {
      const qr = await httpVotacaoService.getQrCode(resumo.id, token);
      if (qrRequisicaoRef.current === requisicao) setQrCode(qr);
    } catch (e) {
      if (qrRequisicaoRef.current !== requisicao) return;
      setQrResumo(null);
      await tratarErro(e, 'Não foi possível gerar o QR Code.');
    } finally {
      if (qrRequisicaoRef.current === requisicao) setQrCarregando(false);
    }
  }

  function fecharQr() {
    qrRequisicaoRef.current++;
    setQrResumo(null);
    setQrCode(null);
    setQrCarregando(false);
  }

  function voltar() {
    if (eventoId && !entradaDireta) {
      voltarParaEventos();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }

  if (carregandoSessao) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color={Cores.destaque} />
        </View>
      </SafeAreaView>
    );
  }
  if (!usuario || !token) return <Redirect href="/" />;

  // A situação só vale para o evento do resumo escolhido depois de carregada.
  const situacaoDoEscolhido = escolhido && situacao?.eventoId === escolhido.eventoId ? situacao : null;
  const jaVotouNoEscolhido = !!escolhido && !!situacaoDoEscolhido?.votedResumoIds.includes(escolhido.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Pressable
            onPress={voltar}
            style={styles.botaoVoltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={Cores.texto} />
          </Pressable>
          <View style={styles.titulos}>
            <Text accessibilityRole="header" style={styles.titulo}>
              Votar
            </Text>
            <Text style={styles.subtitulo} numberOfLines={1}>
              {nomeEvento || (eventoId ? 'Escolha o melhor resumo do evento' : 'Escolha o evento em que quer votar')}
            </Text>
          </View>
          <Pressable
            onPress={() => setScannerAberto(true)}
            style={({ pressed }) => [styles.botaoQr, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Escanear QR Code do pôster">
            <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
            <Text style={styles.botaoQrTexto}>QR Code</Text>
          </Pressable>
        </View>

        {resolvendo ? (
          <View style={styles.centralizado}>
            <ActivityIndicator size="large" color={Cores.destaque} />
            <Text style={styles.textoSuave}>Carregando evento...</Text>
          </View>
        ) : erroCarregar ? (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={42} color={Cores.destaque} />
            <Text style={styles.estadoTitulo}>Não foi possível carregar a votação</Text>
            <Text style={styles.textoSuave}>{erroCarregar}</Text>
            <Pressable onPress={tentarNovamente} style={styles.botaoSecundarioGrande}>
              <Text style={styles.botaoSecundarioTexto}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : !eventoId ? (
          eventos.length === 0 ? (
            <View style={styles.estadoVazio}>
              <Ionicons name="qr-code-outline" size={42} color={Cores.vinhoClaro} />
              <Text style={styles.estadoTitulo}>Nenhum evento disponível para votar</Text>
              <Text style={styles.textoSuave}>Se você está diante de um pôster, escaneie o QR Code dele.</Text>
              <Pressable onPress={() => setScannerAberto(true)} style={styles.botaoSecundarioGrande}>
                <Text style={styles.botaoSecundarioTexto}>Escanear QR Code</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={eventos}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.lista}
              ListHeaderComponent={
                <View style={styles.aviso}>
                  <Text style={styles.avisoTexto}>
                    Você só pode votar nos eventos em que fez check-in. Escolha um evento para ver os resumos.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const data = formatarData(item.dataInicio);
                return (
                  <Pressable
                    onPress={() => setEventoId(item.id)}
                    style={({ pressed }) => [
                      styles.card,
                      item.hasCheckedIn && styles.cardVotado,
                      !item.hasCheckedIn && styles.cardBloqueado,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver resumos de ${item.nome}`}>
                    <Text style={styles.cardTitulo} numberOfLines={3}>
                      {item.nome}
                    </Text>
                    {!!data && (
                      <View style={styles.metaLinha}>
                        <Ionicons name="calendar-outline" size={15} color={Cores.textoSuave} />
                        <Text style={styles.cardAutores}>{data}</Text>
                      </View>
                    )}
                    <View style={styles.eventoRodape}>
                      {item.hasCheckedIn ? (
                        <View style={styles.selo}>
                          <Ionicons name="checkmark-circle" size={14} color="#82C9AA" />
                          <Text style={styles.seloTexto}>Check-in feito · você pode votar</Text>
                        </View>
                      ) : (
                        <View style={[styles.selo, styles.seloBloqueado]}>
                          <Ionicons name="lock-closed" size={14} color={Cores.textoSuave} />
                          <Text style={[styles.seloTexto, { color: Cores.textoSuave }]}>Check-in necessário para votar</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color={Cores.textoSuave} />
                    </View>
                  </Pressable>
                );
              }}
            />
          )
        ) : carregando ? (
          <View style={styles.centralizado}>
            <ActivityIndicator size="large" color={Cores.destaque} />
            <Text style={styles.textoSuave}>Carregando resumos...</Text>
          </View>
        ) : (
          <FlatList
            data={resumos}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={resumos.length === 0 ? styles.listaVazia : styles.lista}
            ListHeaderComponent={
              !situacao && erroVotacao ? (
                <View style={[styles.aviso, styles.avisoAlerta]}>
                  <Text style={styles.avisoTexto}>Não foi possível consultar seus votos: {erroVotacao}</Text>
                  <Pressable onPress={() => void carregar()} style={styles.avisoBotao}>
                    <Text style={styles.avisoBotaoTexto}>Tentar de novo</Text>
                  </Pressable>
                </View>
              ) : situacao ? (
                !situacao.hasCheckedIn ? (
                  <View style={[styles.aviso, styles.avisoAlerta]}>
                    <Text style={styles.avisoTexto}>
                      Só quem fez check-in no evento pode votar. Faça seu check-in para liberar o voto.
                    </Text>
                    <Pressable onPress={() => router.push('/check-in')} style={styles.avisoBotao}>
                      <Text style={styles.avisoBotaoTexto}>Fazer check-in</Text>
                    </Pressable>
                  </View>
                ) : situacao.votesRemaining === 0 ? (
                  <View style={[styles.aviso, styles.avisoSucesso]}>
                    <Text style={styles.avisoTexto}>
                      ✓ Você usou os {situacao.votesLimit} votos deste evento. Seus votos estão marcados na lista.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.aviso}>
                    <Text style={styles.avisoTexto}>
                      Você tem {situacao.votesRemaining} de {situacao.votesLimit} votos neste evento, 1 por resumo.
                      Escolha na lista ou escaneie o QR Code do pôster.
                    </Text>
                  </View>
                )
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.estadoVazio}>
                <Ionicons name="document-text-outline" size={42} color={Cores.vinhoClaro} />
                <Text style={styles.estadoTitulo}>Este evento ainda não tem resumos.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const meuVoto = !!situacao?.votedResumoIds.includes(item.id);
              const semCheckIn = !!situacao && !situacao.hasCheckedIn;
              const semVotos = !!situacao && situacao.hasCheckedIn && situacao.votesRemaining === 0;
              const semSituacao = !situacao;
              const bloqueado = !meuVoto && (semCheckIn || semVotos || semSituacao);
              return (
                <View style={[styles.card, meuVoto && styles.cardVotado, bloqueado && styles.cardBloqueado]}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/resumo-detalhe', params: { id: String(item.id) } })}
                    style={({ pressed }) => [styles.cardConteudo, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Ler resumo ${item.titulo}`}>
                    {meuVoto && <Text style={styles.seloVoto}>✓ SEU VOTO</Text>}
                    <Text style={styles.cardTitulo} numberOfLines={3}>
                      {item.titulo}
                    </Text>
                    {item.autores.length > 0 && (
                      <View style={styles.metaLinha}>
                        <Ionicons name="person-outline" size={15} color={Cores.textoSuave} />
                        <Text style={styles.cardAutores} numberOfLines={2}>
                          {item.autores.join(', ')}
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  <View style={styles.cardAcoes}>
                    {admin && (
                      <Pressable
                        onPress={() => void abrirQr(item)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.acaoQr, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Exibir QR Code de ${item.titulo}`}>
                        <Ionicons name="qr-code-outline" size={16} color={Cores.vinhoClaro} />
                        <Text style={styles.acaoQrTexto}>QR Code</Text>
                      </Pressable>
                    )}
                    {meuVoto ? (
                      <View style={styles.selo} accessibilityLabel="Você já votou neste resumo">
                        <Ionicons name="lock-closed" size={14} color="#82C9AA" />
                        <Text style={styles.seloTexto}>Você já votou aqui</Text>
                      </View>
                    ) : bloqueado ? (
                      <View style={[styles.selo, styles.seloBloqueado]} accessibilityLabel="Voto bloqueado">
                        <Ionicons name="lock-closed" size={14} color={Cores.textoSuave} />
                        <Text style={[styles.seloTexto, { color: Cores.textoSuave }]}>
                          {semSituacao ? 'Votação indisponível' : semCheckIn ? 'Check-in necessário' : 'Seus votos acabaram'}
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setEscolhido(item)}
                        style={({ pressed }) => [styles.botaoVotar, pressed && { opacity: 0.8 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Votar em ${item.titulo}`}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.botaoVotarTexto}>Votar</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Confirmação do voto: é aqui que o QR Code e a lista se encontram. */}
      <Modal
        visible={escolhido !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!enviandoRef.current) setEscolhido(null);
        }}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalRotulo}>CONFIRMAR VOTO</Text>
            <Text style={styles.modalTitulo}>{escolhido?.titulo}</Text>
            {!!escolhido?.autores.length && (
              <Text style={styles.modalTexto}>{escolhido.autores.join(', ')}</Text>
            )}
            {!!escolhido?.eventoNome && <Text style={styles.modalEvento}>{escolhido.eventoNome}</Text>}

            {!situacaoDoEscolhido ? (
              erroVotacao ? (
                <>
                  <View style={[styles.aviso, styles.avisoAlerta]}>
                    <Text style={styles.avisoTexto}>Não foi possível consultar seus votos: {erroVotacao}</Text>
                  </View>
                  <Pressable onPress={() => void carregar()} style={styles.botaoConfirmar}>
                    <Text style={styles.botaoConfirmarTexto}>Tentar de novo</Text>
                  </Pressable>
                </>
              ) : (
                <ActivityIndicator color={Cores.destaque} style={styles.modalCarregando} />
              )
            ) : !situacaoDoEscolhido.hasCheckedIn ? (
              <>
                <View style={[styles.aviso, styles.avisoAlerta]}>
                  <Text style={styles.avisoTexto}>
                    Só quem fez check-in no evento pode votar. Faça o check-in e volte para votar.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEscolhido(null);
                    router.push('/check-in');
                  }}
                  style={styles.botaoConfirmar}>
                  <Text style={styles.botaoConfirmarTexto}>Ir para o check-in</Text>
                </Pressable>
              </>
            ) : jaVotouNoEscolhido ? (
              <View style={[styles.aviso, styles.avisoSucesso]}>
                <Text style={styles.avisoTexto}>
                  ✓ Você já votou neste resumo. Cada resumo recebe só 1 voto seu.
                </Text>
              </View>
            ) : situacaoDoEscolhido.votesRemaining === 0 ? (
              <View style={[styles.aviso, styles.avisoSucesso]}>
                <Text style={styles.avisoTexto}>
                  Você já usou os {situacaoDoEscolhido.votesLimit} votos deste evento.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalAviso}>
                  Você tem {situacaoDoEscolhido.votesRemaining} de {situacaoDoEscolhido.votesLimit} votos neste evento
                  e pode votar 1 vez em cada resumo. Depois de confirmado, o voto não pode ser desfeito.
                </Text>
                <Pressable
                  onPress={() => void confirmarVoto()}
                  disabled={enviando || !situacaoDoEscolhido.canVote}
                  style={[styles.botaoConfirmar, (enviando || !situacaoDoEscolhido.canVote) && styles.desabilitado]}
                  accessibilityRole="button">
                  {enviando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.botaoConfirmarTexto}>Confirmar voto</Text>
                  )}
                </Pressable>
              </>
            )}

            <Pressable disabled={enviando} onPress={() => setEscolhido(null)} style={styles.fechar}>
              <Text style={styles.fecharTexto}>{situacaoDoEscolhido?.canVote ? 'Cancelar' : 'Fechar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={scannerAberto} animationType="slide" onRequestClose={() => setScannerAberto(false)}>
        <QrScanner onCodeScanned={(valor) => void aoLerQr(valor)} onClose={() => setScannerAberto(false)} />
      </Modal>

      <Modal visible={qrResumo !== null} transparent animationType="fade" onRequestClose={fecharQr}>
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.modalQr]}>
            <Text style={styles.modalRotulo}>QR CODE DO PÔSTER</Text>
            <Text style={styles.modalTitulo}>{qrResumo?.titulo}</Text>
            {qrCarregando && <ActivityIndicator color={Cores.destaque} style={styles.modalCarregando} />}
            {qrCode && (
              <Image
                source={{ uri: qrCode.imageData }}
                style={styles.qrImagem}
                accessibilityLabel="QR Code de votação do resumo"
              />
            )}
            <Text style={styles.modalAviso}>
              Imprima no pôster. Ao escanear, o participante abre a confirmação do voto; só vota quem fez check-in.
            </Text>
            <Pressable onPress={fecharQr} style={styles.fechar}>
              <Text style={styles.fecharTexto}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
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
  titulos: { flex: 1 },
  titulo: { color: Cores.texto, fontSize: 24, fontWeight: '700' },
  subtitulo: { color: Cores.textoSuave, fontSize: 13, marginTop: 2 },
  botaoQr: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
  },
  botaoQrTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  centralizado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lista: { gap: 14, paddingBottom: 32 },
  listaVazia: { flexGrow: 1, paddingBottom: 48 },

  estadoVazio: {
    width: '100%',
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    gap: 6,
  },
  estadoTitulo: { color: Cores.texto, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  textoSuave: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  botaoSecundarioGrande: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Cores.vinhoClaro,
  },
  botaoSecundarioTexto: { color: Cores.vinhoClaro, fontWeight: '700' },

  aviso: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    gap: 10,
  },
  avisoSucesso: { backgroundColor: '#173228', borderColor: '#356451' },
  avisoAlerta: { backgroundColor: '#391926', borderColor: '#783047' },
  avisoTexto: { color: '#EDF0F2', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  avisoBotao: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Cores.vinho,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoBotaoTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardVotado: { borderColor: '#356451', backgroundColor: '#131A20' },
  cardBloqueado: { opacity: 0.6 },
  selo: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#173228',
    borderWidth: 1,
    borderColor: '#356451',
  },
  seloBloqueado: { backgroundColor: Cores.superficieAlta, borderColor: Cores.borda },
  seloTexto: { color: '#82C9AA', fontWeight: '700', fontSize: 13 },
  cardConteudo: { gap: 8 },
  eventoRodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  seloVoto: { color: '#82C9AA', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  cardTitulo: { color: Cores.texto, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  metaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardAutores: { flex: 1, color: Cores.textoSuave, fontSize: 14 },
  cardAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingTop: 10,
  },
  acaoQr: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 6 },
  acaoQrTexto: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '700' },
  botaoVotar: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
  },
  botaoVotarTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Cores.superficie,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 16,
    padding: 22,
    gap: 8,
  },
  modalQr: { alignItems: 'center' },
  modalRotulo: { color: Cores.destaque, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  modalTitulo: { color: Cores.texto, fontSize: 20, fontWeight: '700', lineHeight: 27 },
  modalTexto: { color: Cores.textoSuave, fontSize: 14, lineHeight: 20 },
  modalEvento: { color: Cores.vinhoClaro, fontSize: 13, fontWeight: '700' },
  modalAviso: { color: Cores.textoSuave, fontSize: 13, lineHeight: 19, marginTop: 10 },
  modalCarregando: { marginVertical: 24 },
  botaoConfirmar: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 14,
  },
  botaoConfirmarTexto: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  desabilitado: { opacity: 0.55 },
  fechar: { alignItems: 'center', paddingTop: 14 },
  fecharTexto: { color: Cores.textoSuave, fontWeight: '600' },
  qrImagem: { width: '100%', maxWidth: 280, aspectRatio: 1, marginTop: 14, backgroundColor: '#FFFFFF' },
});