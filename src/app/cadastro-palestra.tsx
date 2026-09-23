import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useState } from 'react';
import { Calendar } from 'react-native-calendars';

const mostrarAlerta = (titulo: string, mensagem: string) => {
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
  };

  const validarHorario = (horario: string) => {
    if (horario.length !== 5) {
      return false;
    }

    const [hora, minuto] = horario.split(':').map(Number);

    if (hora === 0 && minuto === 0) {
      // 00:00 não é considerado um horário válido de início de palestra
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
      mostrarAlerta('Campo obrigatório', 'É necessário informar o nome da palestra.');
      return;
    }

    if (!palestrante.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o palestrante.');
      return;
    }

    if (!data.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar a data.');
      return;
    }

    if (!horario.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o horário.');
      return;
    }

    if (!evento.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o evento.');
      return;
    }

    if (!validarHorario(horario)) {
      mostrarAlerta('Horário inválido', 'Digite um horário válido no formato HH:MM (00:00 não é permitido).');
      return;
    }

    const novaPalestra = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      palestrante: palestrante.trim(),
      data: data.trim(),
      horario: horario.trim(),
      evento: evento.trim(),
    };

    try {
      const resposta = await fetch(
        'http://localhost:8080/palestras',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(novaPalestra),
        }
      );

      if (!resposta.ok) {
        const mensagemErro = await resposta.text();

        if (resposta.status === 409) {
          mostrarAlerta(
            'Conflito de agenda',
            mensagemErro || 'Este palestrante já tem uma palestra cadastrada nesta data e horário.'
          );
        } else {
          mostrarAlerta('Erro', 'Não foi possível salvar a palestra.');
        }
        return;
      }

      mostrarAlerta('Sucesso', 'Palestra cadastrada com sucesso!');

      setNome('');
      setDescricao('');
      setPalestrante('');
      setData('');
      setHorario('');
      setEvento('');
    } catch (error) {
      mostrarAlerta('Erro', 'Não foi possível salvar a palestra.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Cadastro de palestra</Text>

        <Text style={styles.label}>Nome da palestra</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome da palestra"
          placeholderTextColor="#777"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Digite a descrição da palestra"
          placeholderTextColor="#777"
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />

        <Text style={styles.label}>Palestrante</Text>
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
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Horário</Text>
            <TextInput
              style={styles.input}
              placeholder="00:00"
              placeholderTextColor="#777"
              value={horario}
              onChangeText={(texto) => {
                let valor = texto.replace(/\D/g, '');

                if (valor.length > 2) {
                  valor = valor.slice(0, 2) + ':' + valor.slice(2, 4);
                }

                setHorario(valor);
              }}
            />
          </View>
        </View>

        <Text style={styles.label}>Evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Selecione o evento"
          placeholderTextColor="#777"
          value={evento}
          onChangeText={setEvento}
        />

        <Pressable
          style={styles.button}
          onPress={cadastrarPalestra}
        >
          <Text style={styles.buttonText}>Cadastrar</Text>
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
