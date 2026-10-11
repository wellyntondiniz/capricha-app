import {
  Evento,
  listarEventos,
  listarPalestrasDoEvento,
} from '@/services/eventoService';

import {
  obterUrlImagemPalestra,
  Palestra,
} from '@/services/palestraService';

import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Converte "2026-10-05T14:30:00" em "05/10/2026 14:30"
const formatarDataHora = (iso?: string) => {

  if (!iso) {
    return '';
  }

  const [dataParte, horaParte] =
    iso.split('T');

  const [ano, mes, dia] =
    dataParte.split('-');

  const hora =
    horaParte
      ? horaParte.slice(0, 5)
      : '';

  return `${dia}/${mes}/${ano}${
    hora ? ' ' + hora : ''
  }`;
};

export default function Eventos() {

  const [eventos, setEventos] =
    useState<Evento[]>([]);

  const [carregandoEventos, setCarregandoEventos] =
    useState(true);

  const [eventoSelecionado, setEventoSelecionado] =
    useState<Evento | null>(null);

  const [palestras, setPalestras] =
    useState<Palestra[]>([]);

  const [carregandoPalestras, setCarregandoPalestras] =
    useState(false);

  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {

    try {

      const dados =
        await listarEventos();

      setEventos(dados);

    } catch (error) {

      setEventos([]);

    } finally {

      setCarregandoEventos(false);

    }
  };

  const selecionarEvento = async (
    evento: Evento
  ) => {

    setEventoSelecionado(evento);
    setCarregandoPalestras(true);
    setPalestras([]);

    try {

      const dados =
        await listarPalestrasDoEvento(
          evento.id!
        );

      setPalestras(dados);

    } catch (error) {

      setPalestras([]);

    } finally {

      setCarregandoPalestras(false);

    }
  };

  if (eventoSelecionado) {

    return (

      <View style={styles.container}>

        <Pressable
          style={styles.voltar}
          onPress={() =>
            setEventoSelecionado(null)
          }
        >

          <Text style={styles.voltarText}>
            {'< Voltar para eventos'}
          </Text>

        </Pressable>

        <Text style={styles.title}>
          {eventoSelecionado.nome}
        </Text>

        {carregandoPalestras ? (

          <ActivityIndicator
            color="#A71948"
            style={{ marginTop: 20 }}
          />

        ) : palestras.length === 0 ? (

          <View style={styles.card}>

            <Text style={styles.emptyText}>
              Este evento não possui palestras cadastradas.
            </Text>

          </View>

        ) : (

          <FlatList
            data={palestras}
            keyExtractor={(item) =>
              String(item.id)
            }
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            renderItem={({ item }) => {

              const urlImagem =
                obterUrlImagemPalestra(
                  item.imagem
                );

              return (

                <View style={styles.card}>

                  {urlImagem ? (

                    <Image
                      source={{
                        uri: urlImagem,
                      }}
                      style={styles.imagemPalestra}
                      resizeMode="cover"
                    />

                  ) : (

                    <View
                      style={styles.imagemSemImagem}
                    >

                      <Text
                        style={styles.semImagemTexto}
                      >
                        Sem imagem
                      </Text>

                    </View>

                  )}

                  <Text
                    style={styles.palestraNome}
                  >
                    {item.nome}
                  </Text>

                  {!!item.descricao && (

                    <Text
                      style={styles.palestraInfo}
                    >
                      {item.descricao}
                    </Text>

                  )}

                  <Text
                    style={styles.palestraInfo}
                  >
                    Palestrante:{' '}
                    {item.palestrante}
                  </Text>

                  <Text
                    style={styles.palestraInfo}
                  >
                    {item.data} às {item.horario}
                  </Text>

                </View>
              );
            }}
          />

        )}

      </View>
    );
  }

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Eventos
      </Text>

      {carregandoEventos ? (

        <ActivityIndicator
          color="#A71948"
          style={{ marginTop: 20 }}
        />

      ) : eventos.length === 0 ? (

        <View style={styles.card}>

          <Text style={styles.emptyText}>
            Nenhum evento cadastrado.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() =>
              router.push('/cadastro-evento')
            }
          >

            <Text style={styles.buttonText}>
              Cadastrar evento
            </Text>

          </Pressable>

        </View>

      ) : (

        <FlatList
          data={eventos}
          keyExtractor={(item) =>
            String(item.id)
          }
          contentContainerStyle={{
            paddingBottom: 20,
          }}
          renderItem={({ item }) => (

            <Pressable
              style={styles.card}
              onPress={() =>
                selecionarEvento(item)
              }
            >

              <Text
                style={styles.palestraNome}
              >
                {item.nome}
              </Text>

              {!!item.descricao && (

                <Text
                  style={styles.palestraInfo}
                >
                  {item.descricao}
                </Text>

              )}

              {!!item.dataInicio && (

                <Text
                  style={styles.palestraInfo}
                >
                  {formatarDataHora(
                    item.dataInicio
                  )}

                  {item.dataTermino
                    ? ` até ${formatarDataHora(
                        item.dataTermino
                      )}`
                    : ''}
                </Text>

              )}

            </Pressable>

          )}
        />

      )}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#0D0E13',
    padding: 20,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 12,
    backgroundColor: '#101118',
    marginBottom: 12,
  },

  imagemPalestra: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 14,
    backgroundColor: '#0D0E13',
  },

  imagemSemImagem: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 14,
    backgroundColor: '#0D0E13',
    borderWidth: 1,
    borderColor: '#33343A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  semImagemTexto: {
    color: '#777777',
    fontSize: 14,
  },

  emptyText: {
    color: '#CCCCCC',
    fontSize: 15,
    textAlign: 'center',
  },

  palestraNome: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },

  palestraInfo: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 2,
  },

  voltar: {
    marginBottom: 12,
  },

  voltarText: {
    color: '#A92B50',
    fontSize: 14,
  },

  button: {
    height: 46,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#A71948',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});