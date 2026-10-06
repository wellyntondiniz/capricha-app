import { Evento, listarEventos } from '@/services/eventoService';
import {
  PalestraApiError,
  salvarPalestraComImagem,
} from '@/services/palestraService';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { useEffect, useState } from 'react';

import {
  Alert,
  Modal,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { Calendar } from 'react-native-calendars';

const paraDataHora = (data: string, horario: string): Date => {
  const [dia, mes, ano] = data.split('/').map(Number);
  const [hora, minuto] = horario.split(':').map(Number);

  return new Date(
    ano,
    mes - 1,
    dia,
    hora,
    minuto
  );
};

const mostrarAlerta = (
  titulo: string,
  mensagem: string
) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

export default function CadastroPalestra() {

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [palestrante, setPalestrante] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [evento, setEvento] = useState('');
  const [calendarioVisivel, setCalendarioVisivel] = useState(false);

  const converterParaISO = (dataBR: string) => {
    const [dia, mes, ano] = dataBR.split('/');
    return `${ano}-${mes}-${dia}`;

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSelecionado, setEventoSelecionado] =
    useState<Evento | null>(null);

  const [imagem, setImagem] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [carregandoImagem, setCarregandoImagem] =
    useState(false);

  useEffect(() => {
    listarEventos()
      .then(setEventos)
      .catch(() => setEventos([]));
  }, []);

  const selecionarImagem = async () => {

    try {

      if (Platform.OS !== 'web') {
        const permissao =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
          mostrarAlerta(
            'Permissão necessária',
            'É necessário permitir o acesso às imagens para selecionar uma imagem.'
          );

          return;
        }
      }

      setCarregandoImagem(true);

      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });

      if (!resultado.canceled) {
        setImagem(resultado.assets[0]);
      }

    } catch (error) {

      mostrarAlerta(
        'Erro',
        'Não foi possível selecionar a imagem.'
      );

    } finally {
      setCarregandoImagem(false);
    }
  };

  const removerImagem = () => {
    setImagem(null);
  };

  const validarData = (data: string) => {

    if (data.length !== 10) {
      return false;
    }

    const [dia, mes, ano] =
      data.split('/').map(Number);

    if (!dia || !mes || !ano) {
      return false;
    }

    const dataInformada =
      new Date(ano, mes - 1, dia);

    return (
      dataInformada.getFullYear() === ano &&
      dataInformada.getMonth() === mes - 1 &&
      dataInformada.getDate() === dia
    );
  };

  const validarHorario = (horario: string) => {

    if (horario.length !== 5) {
      return false;
    }

    const [hora, minuto] =
      horario.split(':').map(Number);

    if (hora === 0 && minuto === 0) {
      return false;
    }

    return (
      hora >= 0 &&
      hora <= 23 &&
      minuto >= 0 &&
      minuto <= 59
    );
  };

  const cadastrarPalestra = async () => {

    if (!nome.trim()) {
      mostrarAlerta(
        'Campo obrigatório',
        'É necessário informar o nome da palestra.'
      );
      return;
    }

    if (!palestrante.trim()) {
      mostrarAlerta(
        'Campo obrigatório',
        'É necessário informar o palestrante.'
      );
      return;
    }

    if (!data.trim()) {
      mostrarAlerta(
        'Campo obrigatório',
        'É necessário informar a data.'
      );
      return;
    }

    if (!horario.trim()) {
      mostrarAlerta(
        'Campo obrigatório',
        'É necessário informar o horário.'
      );
      return;
    }

    if (!eventoSelecionado) {
      mostrarAlerta(
        'Campo obrigatório',
        'É necessário selecionar o evento.'
      );
      return;
    }

    if (!validarData(data)) {
      mostrarAlerta(
        'Data inválida',
        'Digite uma data válida no formato DD/MM/AAAA.'
      );
      return;
    }

    if (!validarHorario(horario)) {
      mostrarAlerta(
        'Horário inválido',
        'Digite um horário válido no formato HH:MM (00:00 não é permitido).'
      );
      return;
    }

    if (eventoSelecionado.dataInicio) {

      const dataHoraPalestra =
        paraDataHora(data, horario);

      const inicioEvento =
        new Date(eventoSelecionado.dataInicio);

      if (dataHoraPalestra < inicioEvento) {

        mostrarAlerta(
          'Fora do período do evento',
          'A palestra não pode ocorrer antes do início do evento.'
        );

        return;
      }

      if (eventoSelecionado.dataTermino) {

        const terminoEvento =
          new Date(eventoSelecionado.dataTermino);

        if (dataHoraPalestra > terminoEvento) {

          mostrarAlerta(
            'Fora do período do evento',
            'A palestra não pode ocorrer depois do término do evento.'
          );

          return;
        }
      }
    }

    try {

      await salvarPalestraComImagem(
        {
          nome: nome.trim(),
          descricao: descricao.trim(),
          palestrante: palestrante.trim(),
          data: data.trim(),
          horario: horario.trim(),
          evento: eventoSelecionado.id!,
        },
        imagem
      );

      mostrarAlerta(
        'Sucesso',
        'Palestra cadastrada com sucesso!'
      );

      setNome('');
      setDescricao('');
      setPalestrante('');
      setData('');
      setHorario('');
      setEventoSelecionado(null);
      setImagem(null);

    } catch (error) {

      const erro =
        error as PalestraApiError;

      if (erro.status === 409) {

        mostrarAlerta(
          'Conflito de agenda',
          erro.message ||
            'Este palestrante já tem uma palestra cadastrada nesta data e horário.'
        );

      } else {

        mostrarAlerta(
          'Erro',
          erro.message ||
            'Não foi possível salvar a palestra.'
        );
      }
    }
  };

  return (
    <ScrollView style={styles.container}>

      <View style={styles.card}>

        <Text style={styles.title}>
          Cadastro de palestra
        </Text>

        <Text style={styles.label}>
          Nome da palestra
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Digite o nome da palestra"
          placeholderTextColor="#777"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>
          Descrição
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.textArea,
          ]}
          placeholder="Digite a descrição da palestra"
          placeholderTextColor="#777"
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />

        <Text style={styles.label}>
          Palestrante
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Digite o nome do palestrante"
          placeholderTextColor="#777"
          value={palestrante}
          onChangeText={setPalestrante}
        />

        <View style={styles.row}>

          <View style={styles.half}>
            <Text style={styles.label}>Data</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setCalendarioVisivel(true)}
            >
              <Text style={[styles.dateButtonText, { color: data ? '#FFFFFF' : '#777' }]}>
                {data || 'DD/MM/AAAA'}
              </Text>
            </Pressable>

            <Text style={styles.label}>
              Data
            </Text>

            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#777"
              value={data}
              onChangeText={(texto) => {

                let valor =
                  texto.replace(/\D/g, '');

                if (valor.length > 2) {
                  valor =
                    valor.slice(0, 2) +
                    '/' +
                    valor.slice(2);
                }

                if (valor.length > 5) {
                  valor =
                    valor.slice(0, 5) +
                    '/' +
                    valor.slice(5, 9);
                }

                setData(valor);
              }}
            />

          </View>

          <View style={styles.half}>

            <Text style={styles.label}>
              Horário
            </Text>

            <TextInput
              style={styles.input}
              placeholder="00:00"
              placeholderTextColor="#777"
              value={horario}
              onChangeText={(texto) => {

                let valor =
                  texto.replace(/\D/g, '');

                if (valor.length > 2) {
                  valor =
                    valor.slice(0, 2) +
                    ':' +
                    valor.slice(2, 4);
                }

                setHorario(valor);
              }}
            />

          </View>

        </View>

        <Text style={styles.label}>
          Imagem da palestra
        </Text>

        {imagem ? (

          <View style={styles.imagemContainer}>

            <Image
              source={{ uri: imagem.uri }}
              style={styles.imagemPreview}
              resizeMode="cover"
            />

            <Pressable
              style={styles.removerImagem}
              onPress={removerImagem}
            >
              <Text style={styles.removerImagemText}>
                Remover imagem
              </Text>
            </Pressable>

          </View>

        ) : (

          <Pressable
            style={styles.selecionarImagem}
            onPress={selecionarImagem}
            disabled={carregandoImagem}
          >

            <Text style={styles.selecionarImagemText}>
              {carregandoImagem
                ? 'Selecionando...'
                : 'Selecionar imagem'}
            </Text>

          </Pressable>

        )}

        <Text style={styles.imagemOpcional}>
          A imagem é opcional.
        </Text>

        <Text style={styles.label}>
          Evento
        </Text>

        {eventos.length === 0 ? (

          <View style={styles.avisoBox}>

            <Text style={styles.avisoText}>
              Nenhum evento cadastrado.
            </Text>

            <Pressable
              onPress={() =>
                router.push('/cadastro-evento')
              }
            >

              <Text style={styles.link}>
                Cadastrar um evento
              </Text>

            </Pressable>

          </View>

        ) : (

          <View style={styles.eventosWrap}>

            {eventos.map((evento) => {

              const selecionado =
                eventoSelecionado?.id === evento.id;

              return (

                <Pressable
                  key={evento.id}
                  style={[
                    styles.chip,
                    selecionado &&
                      styles.chipSelecionado,
                  ]}
                  onPress={() =>
                    setEventoSelecionado(evento)
                  }
                >

                  <Text
                    style={[
                      styles.chipText,
                      selecionado &&
                        styles.chipTextSelecionado,
                    ]}
                  >
                    {evento.nome}
                  </Text>

                </Pressable>
              );
            })}

          </View>
        )}

        <Pressable
          style={styles.button}
          onPress={cadastrarPalestra}
        >

          <Text style={styles.buttonText}>
            Cadastrar
          </Text>

        </Pressable>

      </View>

      <Modal
        visible={calendarioVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarioVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Calendar
              current={data ? converterParaISO(data) : undefined}
              onDayPress={(dia: { dateString: string }) => {
                const [ano, mes, diaNum] = dia.dateString.split('-');
                setData(`${diaNum}/${mes}/${ano}`);
                setCalendarioVisivel(false);
              }}
              markedDates={
                data
                  ? { [converterParaISO(data)]: { selected: true, selectedColor: '#A71948' } }
                  : {}
              }
              theme={{
                backgroundColor: '#101118',
                calendarBackground: '#101118',
                textSectionTitleColor: '#8E173D',
                selectedDayBackgroundColor: '#A71948',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#A71948',
                dayTextColor: '#FFFFFF',
                textDisabledColor: '#444444',
                monthTextColor: '#FFFFFF',
                arrowColor: '#A71948',
              }}
            />
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setCalendarioVisivel(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#0D0E13',
  },

  card: {
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 12,
    backgroundColor: '#101118',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },

  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    backgroundColor: '#0D0E13',
    fontSize: 15,
  },

  textArea: {
    height: 110,
    paddingTop: 15,
    textAlignVertical: 'top',
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  half: {
    flex: 1,
  },

  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#0D0E13',
    justifyContent: 'center',
  },

  dateButtonText: {
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#101118',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8E173D',
    padding: 15,
  },

  modalCloseButton: {
    height: 44,
    marginTop: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8E173D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
  selecionarImagem: {
    height: 52,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 8,
    backgroundColor: '#0D0E13',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selecionarImagemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  imagemContainer: {
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0D0E13',
  },

  imagemPreview: {
    width: '100%',
    height: 220,
  },

  removerImagem: {
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#32101D',
  },

  removerImagemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  imagemOpcional: {
    color: '#888888',
    fontSize: 12,
    marginTop: 6,
  },

  eventosWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 20,
    backgroundColor: '#0D0E13',
  },

  chipSelecionado: {
    backgroundColor: '#A71948',
  },

  chipText: {
    color: '#CCCCCC',
    fontSize: 14,
  },

  chipTextSelecionado: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  avisoBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 8,
  },

  avisoText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 6,
  },

  link: {
    color: '#A92B50',
    fontSize: 14,
    fontWeight: '600',
  },

  button: {
    height: 52,
    marginTop: 30,
    borderRadius: 8,
    backgroundColor: '#A71948',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});