import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useState } from 'react';

export default function CadastroPalestra() {
  const [nome, setNome] = useState('');

  const validarData = (data: string) => {
    if (data.length !== 10) {
      return false;
    }
  
    const [dia, mes, ano] = data.split('/').map(Number);
  
    if (!dia || !mes || !ano) {
      return false;
    }
  
    const dataInformada = new Date(ano, mes - 1, dia);
  
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
  
    const [hora, minuto] = horario.split(':').map(Number);
  
    return (
      hora >= 0 &&
      hora <= 23 &&
      minuto >= 0 &&
      minuto <= 59
    );
  };

  const cadastrarPalestra = async () => {
    // COLOQUE ESTA LINHA BEM NO INÍCIO, ANTES DE TUDO
    if (
      !nome.trim() ||
      !palestrante.trim() ||
      !data.trim() ||
      !horario.trim() ||
      !evento.trim()
    ) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha todos os campos obrigatórios.'
      );
      return;
    }

    if (!validarData(data)) {
      Alert.alert(
        'Data inválida',
        'Digite uma data válida no formato DD/MM/AAAA.'
      );
      return;
    }
  
    if (!validarHorario(horario)) {
      Alert.alert(
        'Horário inválido',
        'Digite um horário válido no formato HH:MM.'
      );
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
        throw new Error('Erro ao cadastrar palestra');
      }
    
      Alert.alert(
        'Sucesso',
        'Palestra cadastrada com sucesso!'
      );
    
      setNome('');
      setDescricao('');
      setPalestrante('');
      setData('');
      setHorario('');
      setEvento('');
    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível salvar a palestra.'
      );
    }
  };
  const [descricao, setDescricao] = useState('');
  const [palestrante, setPalestrante] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [evento, setEvento] = useState('');
  
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
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#777"
              value={data}
              onChangeText={(texto) => {
                let valor = texto.replace(/\D/g, '');
              
                if (valor.length > 2) {
                  valor = valor.slice(0, 2) + '/' + valor.slice(2);
                }
              
                if (valor.length > 5) {
                  valor = valor.slice(0, 5) + '/' + valor.slice(5, 9);
                }
              
                setData(valor);
              }}
            />
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