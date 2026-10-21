import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import { httpCheckInService } from '@/features/check-in/http-check-in-service';
import { QrScanner } from '@/features/check-in/qr-scanner';
import { CheckInError, type CheckInEvent } from '@/features/check-in/types';
import { obterUrlFotoUsuario } from '@/services/usuarioService';
import { httpConexaoService } from './http-conexao-service';
import type { MeuQrConexao, PerfilConexao, ResumoConexoes } from './types';

type Aba = 'qr' | 'solicitacoes' | 'conexoes';
type Aviso = { tom: 'sucesso' | 'erro' | 'info'; texto: string } | null;

const VAZIO: ResumoConexoes = { recebidas: [], enviadas: [], conexoes: [] };
const INTERVALO_ATUALIZACAO = 15000;

const formatarData = (valor: string | null) => valor
  ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(valor))
  : '';

// Avisos da outra ponta: o app consulta o servidor periodicamente e compara com a consulta anterior.
function novidades(anterior: ResumoConexoes | null, atual: ResumoConexoes): Aviso {
  if (!anterior) return null;
  const aceita = anterior.enviadas
    .map((e) => atual.conexoes.find((c) => c.id === e.id)).find(Boolean);
  if (aceita) return { tom: 'sucesso', texto: `${aceita.nome} aceitou sua solicitação! Você ganhou +${aceita.xp} XP.` };
  const nova = atual.recebidas.find((r) => !anterior.recebidas.some((a) => a.id === r.id));
  if (nova) return { tom: 'info', texto: `Você recebeu uma nova solicitação de conexão de ${nova.nome}.` };
  return null;
}

export default function ConectarPessoasScreen() {
  const { usuario, carregando, deslogar } = useAuth();
  const router = useRouter();
  const token = usuario?.token ?? '';
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
    return () => { tokenRef.current = ''; };
  }, [token]);

  const ocupadoRef = useRef(false);
  const anteriorRef = useRef<ResumoConexoes | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [evento, setEvento] = useState<CheckInEvent | null>(null);
  const [resumo, setResumo] = useState<ResumoConexoes>(VAZIO);
  const [aba, setAba] = useState<Aba>('qr');
  const [meuQr, setMeuQr] = useState<MeuQrConexao | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [alvo, setAlvo] = useState<{ perfil: PerfilConexao; qrToken: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [respondendoId, setRespondendoId] = useState<number | null>(null);

  const tratarErro = useCallback(async (erro: unknown, padrao: string) => {
    if (erro instanceof CheckInError && erro.code === 'AUTH_REQUIRED') {
      await deslogar();
      router.replace('/');
      return;
    }
    setAviso({ tom: 'erro', texto: erro instanceof CheckInError ? erro.message : padrao });
  }, [deslogar, router]);

  const carregar = useCallback(async (silencioso = false) => {
    if (!token) return;
    if (!silencioso) setEstado('carregando');
    try {
      const [eventos, dados] = await Promise.all([
        httpCheckInService.getEvents(token),
        httpConexaoService.getResumo(token),
      ]);
      if (tokenRef.current !== token) return;
      // Evento ativo = o que está em andamento e em que o participante já fez check-in.
      // O servidor confere isso de novo em cada operação.
      setEvento(eventos.find((e) => e.hasCheckedIn && e.canCheckIn) ?? null);
      // Na primeira carga, se há solicitações esperando resposta, abre direto nelas.
      // Depois disso não troca de aba sozinho (a pessoa pode estar mostrando o QR).
      if (!anteriorRef.current && dados.recebidas.length) setAba('solicitacoes');
      const novo = novidades(anteriorRef.current, dados);
      if (novo) setAviso(novo);
      anteriorRef.current = dados;
      setResumo(dados);
      setEstado('pronto');
    } catch (erro) {
      if (tokenRef.current !== token) return;
      if (!silencioso) setEstado('erro');
      if (!silencioso || (erro instanceof CheckInError && erro.code === 'AUTH_REQUIRED')) {
        await tratarErro(erro, 'Não foi possível carregar suas conexões.');
      }
    }
  }, [token, tratarErro]);

  useFocusEffect(useCallback(() => {
    void carregar();
    const timer = setInterval(() => void carregar(true), INTERVALO_ATUALIZACAO);
    return () => clearInterval(timer);
  }, [carregar]));

  useEffect(() => {
    if (aba !== 'qr' || meuQr || !token) return;
    let ativo = true;
    httpConexaoService.getMeuQr(token)
      .then((qr) => { if (ativo && tokenRef.current === token) setMeuQr(qr); })
      .catch((erro: unknown) => { if (ativo) void tratarErro(erro, 'Não foi possível gerar seu QR Code.'); });
    return () => { ativo = false; };
  }, [aba, meuQr, token, tratarErro]);

  const aoEscanear = async (valor: string) => {
    setScannerAberto(false);
    if (!evento) return;
    try {
      const resultado = await httpConexaoService.identificar(valor, evento.id, token);
      if (tokenRef.current !== token) return;
      setAviso(null);
      setAlvo({ perfil: resultado.perfil, qrToken: resultado.qrToken });
    } catch (erro) {
      if (tokenRef.current === token) await tratarErro(erro, 'Não foi possível ler este QR Code.');
    }
  };

  const executar = async (acao: () => Promise<void>, padrao: string) => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setOcupado(true);
    try {
      await acao();
    } catch (erro) {
      if (tokenRef.current === token) {
        setAlvo(null);
        await tratarErro(erro, padrao);
        await carregar(true);
      }
    } finally {
      setRespondendoId(null);
      setOcupado(false);
      ocupadoRef.current = false;
    }
  };

  const enviar = () => {
    if (!alvo || !evento) return;
    const { perfil, qrToken } = alvo;
    void executar(async () => {
      await httpConexaoService.solicitar(qrToken, evento.id, token);
      if (tokenRef.current !== token) return;
      setAlvo(null);
      setAviso({ tom: 'sucesso', texto: `Solicitação enviada para ${perfil.nome}. Vocês ganham XP quando ela for aceita.` });
      setAba('solicitacoes');
      await carregar(true);
    }, 'Não foi possível enviar a solicitação.');
  };

  const responder = (id: number, acao: 'aceitar' | 'recusar') => {
    setRespondendoId(id);
    void executar(async () => {
      if (acao === 'aceitar') {
        const r = await httpConexaoService.aceitar(id, token);
        setAviso({ tom: 'sucesso', texto: `Conexão confirmada! Você ganhou +${r.xp} XP.` });
      } else {
        await httpConexaoService.recusar(id, token);
        setAviso({ tom: 'info', texto: 'Solicitação recusada.' });
      }
      if (tokenRef.current !== token) return;
      setAlvo(null);
      await carregar(true);
    }, acao === 'aceitar' ? 'Não foi possível aceitar a solicitação.' : 'Não foi possível recusar a solicitação.');
  };

  if (carregando) return <SafeAreaView style={styles.screen}><ActivityIndicator color={Cores.destaque} /></SafeAreaView>;
  if (!usuario || !token) return <Redirect href="/" />;

  const pendentes = resumo.recebidas.length;
  const perfil = alvo?.perfil;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para a tela inicial"
          onPress={() => router.replace('/(tabs)/home')} style={styles.backArrow}>
          <Ionicons name="arrow-back" size={22} color={Cores.texto} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Conectar pessoas</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {evento ? evento.nome : 'Nenhum evento em andamento com check-in'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Escanear QR Code de um participante"
          disabled={!evento} onPress={() => setScannerAberto(true)}
          style={[styles.scanHeaderButton, !evento && styles.disabled]}>
          <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
          <Text style={styles.scanHeaderText}>Escanear</Text>
        </Pressable>
      </View>

      <View style={styles.abas}>
        {([['qr', 'Meu QR'], ['solicitacoes', pendentes ? `Solicitações (${pendentes})` : 'Solicitações'], ['conexoes', 'Conexões']] as const)
          .map(([id, rotulo]) => (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: aba === id }}
              onPress={() => setAba(id)} style={[styles.aba, aba === id && styles.abaAtiva]}>
              <Text style={[styles.abaTexto, aba === id && styles.abaTextoAtivo]}>{rotulo}</Text>
            </Pressable>
          ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {aviso && <AvisoView aviso={aviso} />}
        {estado === 'carregando' && <ActivityIndicator color={Cores.destaque} style={styles.loader} />}
        {estado === 'erro' && (
          <Pressable onPress={() => void carregar()} style={styles.botaoSecundario}>
            <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
          </Pressable>
        )}
        {estado === 'pronto' && !evento && (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Faça check-in para se conectar</Text>
            <Text style={styles.meta}>
              As conexões valem para um evento em andamento e exigem que os dois participantes tenham feito check-in nele.
            </Text>
            <Pressable onPress={() => router.push('/check-in')} style={[styles.botaoPrimario, styles.espaco]}>
              <Text style={styles.botaoPrimarioTexto}>Ir para o check-in</Text>
            </Pressable>
          </View>
        )}

        {aba === 'qr' && (
          <View style={[styles.card, styles.centro]}>
            <Text style={styles.cardTitulo}>Seu QR Code</Text>
            <Text style={[styles.meta, styles.textoCentro]}>
              Mostre este código para outro participante escanear. Ele identifica você sem revelar seus dados.
            </Text>
            {meuQr
              ? <Image source={{ uri: meuQr.imageData }} style={styles.qrImage} accessibilityLabel="Seu QR Code de conexão" />
              : <ActivityIndicator color={Cores.destaque} style={styles.loader} />}
          </View>
        )}

        {aba === 'solicitacoes' && (
          <>
            <Text style={styles.secao}>Recebidas</Text>
            {!resumo.recebidas.length && <Text style={styles.vazio}>Nenhuma solicitação pendente.</Text>}
            {resumo.recebidas.map((s) => (
              <View key={s.id} style={styles.card}>
                <LinhaPessoa nome={s.nome} foto={s.foto} detalhe={s.eventoNome} />
                <View style={styles.acoes}>
                  <Pressable disabled={ocupado} onPress={() => responder(s.id, 'aceitar')}
                    style={[styles.botaoPrimario, styles.flex, ocupado && styles.disabled]}>
                    {respondendoId === s.id ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.botaoPrimarioTexto}>Aceitar</Text>}
                  </Pressable>
                  <Pressable disabled={ocupado} onPress={() => responder(s.id, 'recusar')}
                    style={[styles.botaoSecundario, styles.flex, ocupado && styles.disabled]}>
                    <Text style={styles.botaoSecundarioTexto}>Recusar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={styles.secao}>Enviadas</Text>
            {!resumo.enviadas.length && <Text style={styles.vazio}>Você não tem solicitações aguardando resposta.</Text>}
            {resumo.enviadas.map((s) => (
              <View key={s.id} style={styles.card}>
                <LinhaPessoa nome={s.nome} foto={s.foto} detalhe={`Aguardando resposta · ${s.eventoNome}`} />
              </View>
            ))}
          </>
        )}

        {aba === 'conexoes' && (
          <>
            {!resumo.conexoes.length && <Text style={styles.vazio}>Você ainda não tem conexões. Escaneie o QR Code de outro participante.</Text>}
            {resumo.conexoes.map((c) => (
              <View key={c.id} style={styles.card}>
                <LinhaPessoa nome={c.nome} foto={c.foto}
                  detalhe={`${c.eventoNome}${c.conectadaEm ? ` · ${formatarData(c.conectadaEm)}` : ''}`} xp={c.xp} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={scannerAberto} animationType="slide" onRequestClose={() => setScannerAberto(false)}>
        <QrScanner onCodeScanned={(valor) => void aoEscanear(valor)} onClose={() => setScannerAberto(false)} />
      </Modal>

      <Modal visible={alvo !== null} transparent animationType="fade" onRequestClose={() => { if (!ocupadoRef.current) setAlvo(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalLabel}>PARTICIPANTE IDENTIFICADO</Text>
            {perfil && <LinhaPessoa nome={perfil.nome} foto={perfil.foto} detalhe={evento?.nome ?? ''} grande />}
            {perfil?.relacao === 'NONE' && (
              <Pressable disabled={ocupado} onPress={enviar} style={[styles.botaoPrimario, styles.espaco, ocupado && styles.disabled]}>
                {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoPrimarioTexto}>Enviar solicitação de conexão</Text>}
              </Pressable>
            )}
            {perfil?.relacao === 'PENDING_RECEIVED' && perfil.solicitacaoId !== null && (
              <>
                <Text style={[styles.meta, styles.espaco]}>Este participante já enviou uma solicitação para você.</Text>
                <Pressable disabled={ocupado} onPress={() => responder(perfil.solicitacaoId!, 'aceitar')}
                  style={[styles.botaoPrimario, styles.espaco, ocupado && styles.disabled]}>
                  {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoPrimarioTexto}>Aceitar conexão</Text>}
                </Pressable>
              </>
            )}
            {perfil?.relacao === 'PENDING_SENT' && (
              <Text style={[styles.meta, styles.espaco]}>Você já enviou uma solicitação. Aguarde a resposta.</Text>
            )}
            {perfil?.relacao === 'CONNECTED' && (
              <Text style={[styles.meta, styles.espaco]}>Vocês já estão conectados neste evento.</Text>
            )}
            <Pressable disabled={ocupado} onPress={() => setAlvo(null)} style={styles.fechar}>
              <Text style={styles.fecharTexto}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'U';
  return (partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function LinhaPessoa({ nome, foto, detalhe, xp, grande }: {
  nome: string; foto: string | null; detalhe: string; xp?: number; grande?: boolean;
}) {
  const url = obterUrlFotoUsuario(foto);
  const tamanho = grande ? 64 : 46;
  return (
    <View style={styles.pessoa}>
      {url
        ? <Image source={{ uri: url }} style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2 }} />
        : <View style={[styles.avatarFallback, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}>
            <Text style={styles.avatarTexto}>{iniciais(nome)}</Text>
          </View>}
      <View style={styles.flex}>
        <Text style={[styles.cardTitulo, grande && styles.nomeGrande]} numberOfLines={1}>{nome}</Text>
        {!!detalhe && <Text style={styles.meta} numberOfLines={2}>{detalhe}</Text>}
      </View>
      {xp !== undefined && <View style={styles.xpBadge}><Text style={styles.xpTexto}>+{xp} XP</Text></View>}
    </View>
  );
}

function AvisoView({ aviso }: { aviso: Exclude<Aviso, null> }) {
  const estilo = aviso.tom === 'sucesso' ? styles.avisoSucesso : aviso.tom === 'erro' ? styles.avisoErro : styles.avisoInfo;
  return <View style={[styles.aviso, estilo]} accessibilityRole="alert"><Text style={styles.avisoTexto}>{aviso.texto}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Cores.fundo },
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  headerTitles: { flex: 1 },
  title: { color: Cores.texto, fontSize: 24, fontWeight: '700' },
  subtitle: { color: Cores.textoSuave, fontSize: 13, marginTop: 2 },
  scanHeaderButton: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Cores.vinho },
  scanHeaderText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  abas: { width: '100%', maxWidth: 650, alignSelf: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 22 },
  aba: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda, paddingHorizontal: 6 },
  abaAtiva: { backgroundColor: Cores.vinhoSuave, borderColor: Cores.vinhoClaro },
  abaTexto: { color: Cores.textoSuave, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  abaTextoAtivo: { color: Cores.texto },
  content: { padding: 22, paddingBottom: 44, maxWidth: 650, width: '100%', alignSelf: 'center' },
  loader: { marginVertical: 28 },
  secao: { color: Cores.texto, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  vazio: { color: Cores.textoSuave, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  card: { backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda, borderRadius: 14, padding: 16, marginBottom: 12 },
  centro: { alignItems: 'center' },
  textoCentro: { textAlign: 'center' },
  cardTitulo: { color: Cores.texto, fontSize: 16, fontWeight: '700' },
  nomeGrande: { fontSize: 20 },
  meta: { color: Cores.textoSuave, fontSize: 13, lineHeight: 19, marginTop: 4 },
  espaco: { marginTop: 16 },
  flex: { flex: 1 },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarFallback: { backgroundColor: Cores.vinho, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  xpBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.14)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.35)' },
  xpTexto: { color: '#34D399', fontSize: 12, fontWeight: '800' },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 14 },
  botaoPrimario: { minHeight: 46, borderRadius: 9, backgroundColor: Cores.vinho, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  botaoPrimarioTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  botaoSecundario: { minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: Cores.vinhoClaro, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  botaoSecundarioTexto: { color: '#E8A5B7', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.55 },
  qrImage: { width: '100%', maxWidth: 280, aspectRatio: 1, marginTop: 18, backgroundColor: '#fff' },
  aviso: { borderRadius: 10, padding: 13, marginBottom: 14, borderWidth: 1 },
  avisoSucesso: { backgroundColor: '#173228', borderColor: '#356451' },
  avisoErro: { backgroundColor: '#391926', borderColor: '#783047' },
  avisoInfo: { backgroundColor: '#1D1721', borderColor: '#B34364' },
  avisoTexto: { color: '#EDF0F2', fontSize: 13, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(3,5,10,.75)', justifyContent: 'center', padding: 22 },
  modal: { backgroundColor: '#191C26', borderWidth: 1, borderColor: '#66263F', borderRadius: 17, padding: 24 },
  modalLabel: { color: '#C45778', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 16 },
  fechar: { alignItems: 'center', paddingTop: 18 },
  fecharTexto: { color: '#B9C0CB', fontWeight: '600' },
});