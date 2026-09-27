import { EventoApiError, salvarEvento } from '@/services/eventoService';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const mostrarAlerta = (titulo: string, mensagem: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

// Converte "DD/MM/AAAA" + "HH:mm" em "AAAA-MM-DDTHH:mm:00" (formato que a API espera)
const paraIso = (data: string, hora: string): string | undefined => {
  if (!data.trim()) return undefined;

  const [dia, mes, ano] = data.split('/');
  const horaFinal = hora.trim() || '00:00';

  if (!dia || !mes || !ano) return undefined;

  return `${ano}-${mes}-${dia}T${horaFinal}:00`;
};

export default function CadastroEvento() {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [horaTermino, setHoraTermino] = useState('');

  const formatarData = (texto: string) => {
    let valor = texto.replace(/\D/g, '');
    if (valor.length > 2) valor = valor.slice(0, 2) + '/' + valor.slice(2);
    if (valor.length > 5) valor = valor.slice(0, 5) + '/' + valor.slice(5, 9);
    return valor;
  };

  const formatarHora = (texto: string) => {
    let valor = texto.replace(/\D/g, '');
    if (valor.length > 2) valor = valor.slice(0, 2) + ':' + valor.slice(2, 4);
    return valor;
  };

  const cadastrarEvento = async () => {
    if (!nome.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o nome do evento.');
      return;
    }

    try {
      await salvarEvento({
        nome: nome.trim(),
        descricao: descricao.trim(),
        dataInicio: paraIso(dataInicio, horaInicio),
        dataTermino: paraIso(dataTermino, horaTermino),
      });

      mostrarAlerta('Sucesso', 'Evento cadastrado com sucesso!');

      setNome('');
      setDescricao('');
      setDataInicio('');
      setHoraInicio('');
      setDataTermino('');
      setHoraTermino('');
    } catch (error) {
      const erro = error as EventoApiError;
      mostrarAlerta('Erro', erro.message || 'Não foi possível salvar o evento.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Cadastro de evento</Text>

        <Text style={styles.label}>Nome do evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome do evento"
          placeholderTextColor="#777"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Digite a descrição do evento"
          placeholderTextColor="#777"
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />

        <Text style={styles.label}>Início (opcional)</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#777"
              value={dataInicio}
              onChangeText={(t) => setDataInicio(formatarData(t))}
            />
          </View>
          <View style={styles.half}>
            <TextInput
              style={styles.input}
              placeholder="HH:mm"
              placeholderTextColor="#777"
              value={horaInicio}
              onChangeText={(t) => setHoraInicio(formatarHora(t))}
            />
          </View>
        </View>

        <Text style={styles.label}>Término (opcional)</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#777"
              value={dataTermino}
              onChangeText={(t) => setDataTermino(formatarData(t))}
            />
          </View>
          <View style={styles.half}>
            <TextInput
              style={styles.input}
              placeholder="HH:mm"
              placeholderTextColor="#777"
              value={horaTermino}
              onChangeText={(t) => setHoraTermino(formatarHora(t))}
            />
          </View>
        </View>

        <Pressable style={styles.button} onPress={cadastrarEvento}>
          <Text style={styles.buttonText}>Cadastrar</Text>
        </Pressable>

        <Pressable style={styles.linkBox} onPress={() => router.push('/eventos')}>
          <Text style={styles.linkText}>Ver palestras por evento</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0E13' },
  card: {
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#8E173D',
    borderRadius: 12,
    backgroundColor: '#101118',
  },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 12 },
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
  textArea: { height: 110, paddingTop: 15, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  button: {
    height: 52,
    marginTop: 30,
    borderRadius: 8,
    backgroundColor: '#A71948',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  linkBox: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#A92B50', fontSize: 14 },
});