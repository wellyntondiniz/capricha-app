import {
  Evento,
  buscarPorId
} from '@/services/eventoService';
import {
  Participacao,
  listarPorEvento
} from '@/services/participacaoService';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const [participacoes, setParticipacoes] = useState<Participacao[]>([]);

export default function ParticipantesEvento() {
  const router = useRouter();

  const eventoId = 1;

  const [evento, setEvento] = useState<Evento | null>(null);
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErro(null);

        const [dadosEvento, dadosParticipacoes] = await Promise.all([
          buscarPorId(eventoId),
          listarPorEvento(eventoId),
        ]);

        setEvento(dadosEvento);

        const ordenados = [...dadosParticipacoes].sort(
          (a, b) => (b.score ?? 0) - (a.score ?? 0)
        );

        setParticipacoes(ordenados);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setErro('Não foi possível carregar os dados do evento.');
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.logo}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoSymbol}>✦</Text>
            </View>

            <Text style={styles.tituloEvento}>
              {evento?.nome ?? 'Carregando evento...'}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.tituloCard}>
              Ranking de participantes
            </Text>

            <Text style={styles.subtitulo}>
              Participantes ordenados por pontuação
            </Text>

            {carregando ? (
              <ActivityIndicator
                size="large"
                color="#7B1B38"
                style={styles.loading}
              />
            ) : erro ? (
              <Text style={styles.mensagem}>
                {erro}
              </Text>
            ) : participacoes.length === 0 ? (
              <Text style={styles.mensagem}>
                Nenhum participante encontrado.
              </Text>
            ) : (
              participacoes.map((participacao, index) => {
                const usuario = participacao.usuario;
                const nome = usuario?.nome ?? 'Usuário';
                const email = usuario?.email ?? 'E-mail não informado';

                const iniciais = nome
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((parte) => parte[0])
                  .join('')
                  .toUpperCase();

                return (
                  <View
                    key={participacao.id ?? index}
                    style={styles.participante}
                  >
                    <View style={styles.posicao}>
                      <Text style={styles.posicaoTexto}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.avatar}>
                      <Text style={styles.avatarTexto}>
                        {iniciais || '?'}
                      </Text>
                    </View>

                    <View style={styles.participanteInfo}>
                      <Text style={styles.nome}>
                        {nome}
                      </Text>

                      <Text style={styles.email}>
                        {email}
                      </Text>
                    </View>

                    <View style={styles.scoreContainer}>
                      <Text style={styles.score}>
                        {participacao.score ?? 0}
                      </Text>

                      <Text style={styles.scoreLabel}>
                        pontos
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Botão de retorno */}
            <TouchableOpacity
              style={styles.botaoRetornar}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Text style={styles.botaoTexto}>
                ← Retornar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rodapé */}
          <Text style={styles.footer}>
            Capricha · Eventos
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 24,
  },

  logo: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
    backgroundColor: '#7B1B38',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoSymbol: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  tituloEvento: {
    color: '#E6EDF3',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
  },

  card: {
    padding: 24,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 8,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  tituloCard: {
    color: '#E6EDF3',
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 8,
  },

  subtitulo: {
    color: '#8B949E',
    fontSize: 14,
    marginBottom: 20,
  },

  participante: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#30363D',
    gap: 12,
  },

  posicao: {
    width: 22,
    alignItems: 'center',
  },

  posicaoTexto: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '600',
  },

  avatar: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 20,
    backgroundColor: '#7B1B38',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  participanteInfo: {
    flex: 1,
    minWidth: 0,
  },

  nome: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  email: {
    color: '#8B949E',
    fontSize: 12,
    flexShrink: 1,
  },

  scoreContainer: {
    alignItems: 'flex-end',
    marginLeft: 4,
  },

  score: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: 'bold',
  },

  scoreLabel: {
    color: '#8B949E',
    fontSize: 10,
  },

  loading: {
    marginVertical: 24,
  },

  mensagem: {
    color: '#8B949E',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },

  botaoRetornar: {
    width: '100%',
    height: 40,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoTexto: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },

  footer: {
    color: '#8B949E',
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
  },
});