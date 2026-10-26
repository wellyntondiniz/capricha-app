import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';
import {
  consultarAvaliacao,
  enviarAvaliacao,
  listarPerguntasAvaliacao,
  type PerguntaAvaliacao,
} from '@/services/avaliacaoAplicativoService';

const OPCOES = [
  { nota: 1, rotulo: 'Muito ruim' },
  { nota: 2, rotulo: 'Ruim' },
  { nota: 3, rotulo: 'Regular' },
  { nota: 4, rotulo: 'Bom' },
  { nota: 5, rotulo: 'Excelente' },
];

export default function AvaliarAplicativoScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [perguntas, setPerguntas] = useState<PerguntaAvaliacao[]>([]);
  const [notas, setNotas] = useState<Record<number, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [respondida, setRespondida] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const respondidas = useMemo(
    () => perguntas.filter((pergunta) => notas[pergunta.id]).length,
    [notas, perguntas],
  );

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!usuario?.token) {
        if (ativo) {
          setErro('Sua sessão expirou. Faça login novamente.');
          setCarregando(false);
        }
        return;
      }
      try {
        const [lista, jaRespondida] = await Promise.all([
          listarPerguntasAvaliacao(),
          consultarAvaliacao(usuario.token),
        ]);
        if (!ativo) return;
        setPerguntas(lista);
        setRespondida(jaRespondida);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar a avaliação.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => { ativo = false; };
  }, [usuario?.token]);

  async function enviar() {
    if (!usuario?.token || enviando) return;
    if (respondidas !== perguntas.length) {
      setErro('Responda todas as perguntas antes de enviar.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      const texto = await enviarAvaliacao(
        usuario.token,
        perguntas.map((pergunta) => ({ perguntaId: pergunta.id, nota: notas[pergunta.id] })),
      );
      setMensagem(texto);
      setRespondida(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.voltar}>
              <Ionicons name="arrow-back" size={24} color={Cores.texto} />
            </Pressable>
            <View style={styles.titulos}>
              <Text style={styles.titulo}>Avaliar aplicativo</Text>
              <Text style={styles.subtitulo}>Sua opinião ajuda a melhorar a experiência dos próximos eventos.</Text>
            </View>
          </View>

          {carregando ? (
            <View style={styles.estado}>
              <ActivityIndicator size="large" color={Cores.destaque} />
              <Text style={styles.estadoTexto}>Carregando perguntas...</Text>
            </View>
          ) : respondida ? (
            <View style={styles.sucessoCard}>
              <View style={styles.sucessoIcone}>
                <Ionicons name="checkmark" size={36} color="#34D399" />
              </View>
              <Text style={styles.sucessoTitulo}>Avaliação enviada!</Text>
              <Text style={styles.sucessoTexto}>{mensagem || 'Você já respondeu à avaliação do aplicativo. Obrigado pela participação!'}</Text>
              <Pressable onPress={() => router.replace('/(tabs)/home')} style={styles.botaoPrincipal}>
                <Text style={styles.botaoPrincipalTexto}>Voltar para o início</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.progressoCard}>
                <View style={styles.progressoLinha}>
                  <Text style={styles.progressoTitulo}>Progresso</Text>
                  <Text style={styles.progressoContador}>{respondidas} de {perguntas.length}</Text>
                </View>
                <View style={styles.trilha}>
                  <View style={[styles.preenchimento, { width: perguntas.length ? `${(respondidas / perguntas.length) * 100}%` : '0%' }]} />
                </View>
                <Text style={styles.escalaAjuda}>1 significa “Muito ruim” e 5 significa “Excelente”.</Text>
              </View>

              {perguntas.map((pergunta, indice) => (
                <View key={pergunta.id} style={styles.perguntaCard}>
                  <View style={styles.perguntaCabecalho}>
                    <View style={styles.numero}><Text style={styles.numeroTexto}>{indice + 1}</Text></View>
                    <Text style={styles.perguntaTexto}>{pergunta.texto}</Text>
                  </View>
                  <View style={styles.opcoes}>
                    {OPCOES.map((opcao) => {
                      const selecionada = notas[pergunta.id] === opcao.nota;
                      return (
                        <Pressable
                          key={opcao.nota}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: selecionada }}
                          accessibilityLabel={`${opcao.nota}, ${opcao.rotulo}`}
                          onPress={() => {
                            setNotas((atuais) => ({ ...atuais, [pergunta.id]: opcao.nota }));
                            setErro('');
                          }}
                          style={[styles.opcao, selecionada && styles.opcaoSelecionada]}>
                          <Text style={[styles.opcaoNota, selecionada && styles.opcaoNotaSelecionada]}>{opcao.nota}</Text>
                          <Text style={[styles.opcaoRotulo, selecionada && styles.opcaoRotuloSelecionado]} numberOfLines={1}>{opcao.rotulo}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              {!!erro && (
                <View style={styles.erroCard}>
                  <Ionicons name="alert-circle-outline" size={20} color="#FB7185" />
                  <Text style={styles.erroTexto}>{erro}</Text>
                </View>
              )}

              {perguntas.length > 0 && (
                <Pressable
                  disabled={enviando}
                  onPress={enviar}
                  style={({ pressed }) => [styles.botaoPrincipal, pressed && styles.pressionado, enviando && styles.desabilitado]}>
                  {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.botaoPrincipalTexto}>Enviar avaliação</Text>}
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  scroll: { flexGrow: 1, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  voltar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.superficie, borderWidth: 1, borderColor: Cores.borda },
  titulos: { flex: 1, gap: 5 },
  titulo: { color: Cores.texto, fontSize: 28, fontWeight: '800' },
  subtitulo: { color: Cores.textoSuave, fontSize: 15, lineHeight: 21 },
  estado: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 14 },
  estadoTexto: { color: Cores.textoSuave, fontSize: 15 },
  progressoCard: { backgroundColor: Cores.superficie, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Cores.borda, gap: 10 },
  progressoLinha: { flexDirection: 'row', justifyContent: 'space-between' },
  progressoTitulo: { color: Cores.texto, fontWeight: '700', fontSize: 15 },
  progressoContador: { color: Cores.destaque, fontWeight: '800' },
  trilha: { height: 8, borderRadius: 4, backgroundColor: Cores.superficieAlta, overflow: 'hidden' },
  preenchimento: { height: '100%', borderRadius: 4, backgroundColor: Cores.destaque },
  escalaAjuda: { color: Cores.textoSuave, fontSize: 13 },
  perguntaCard: { backgroundColor: Cores.superficie, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Cores.borda, gap: 18 },
  perguntaCabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Cores.vinhoSuave },
  numeroTexto: { color: Cores.destaque, fontWeight: '800' },
  perguntaTexto: { flex: 1, color: Cores.texto, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  opcoes: { flexDirection: 'row', gap: 8 },
  opcao: { flex: 1, minWidth: 48, alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 3, borderRadius: 12, backgroundColor: Cores.superficieAlta, borderWidth: 1, borderColor: Cores.borda },
  opcaoSelecionada: { backgroundColor: Cores.vinho, borderColor: Cores.destaque },
  opcaoNota: { color: Cores.texto, fontSize: 18, fontWeight: '800' },
  opcaoNotaSelecionada: { color: '#FFFFFF' },
  opcaoRotulo: { color: Cores.textoSuave, fontSize: 10 },
  opcaoRotuloSelecionado: { color: '#FFFFFF' },
  erroCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, backgroundColor: 'rgba(251, 113, 133, 0.10)', borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.30)' },
  erroTexto: { flex: 1, color: '#FB7185', fontSize: 14 },
  botaoPrincipal: { minHeight: 52, borderRadius: 12, backgroundColor: Cores.vinho, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  botaoPrincipalTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressionado: { opacity: 0.8 },
  desabilitado: { opacity: 0.6 },
  sucessoCard: { marginTop: 36, alignItems: 'center', backgroundColor: Cores.superficie, borderRadius: 20, padding: 32, borderWidth: 1, borderColor: Cores.borda, gap: 14 },
  sucessoIcone: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52, 211, 153, 0.12)' },
  sucessoTitulo: { color: Cores.texto, fontSize: 24, fontWeight: '800' },
  sucessoTexto: { color: Cores.textoSuave, textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 8 },
});
