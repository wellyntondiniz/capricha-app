import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';
import { EventoApiError, salvarEvento } from '@/services/eventoService';

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

const paraDataHora = (data: string, horario: string): Date => {
  const [dia, mes, ano] = data.split('/').map(Number);
  const [hora, minuto] = horario.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto);
};

const dataValida = (data: string): boolean => {
  if (data.length !== 10) return false;

  const [dia, mes, ano] = data.split('/').map(Number);
  if (!dia || !mes || !ano) return false;

  const d = new Date(ano, mes - 1, dia);
  return (
    d.getFullYear() === ano &&
    d.getMonth() === mes - 1 &&
    d.getDate() === dia
  );
};

const horaValida = (horario: string): boolean => {
  if (horario.length !== 5) return false;

  const [hora, minuto] = horario.split(':').map(Number);
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
};

const agoraSemSegundos = (): Date => {
  const agora = new Date();
  agora.setSeconds(0, 0);
  return agora;
};

export default function CadastroEvento() {
  const { retorno } = useLocalSearchParams<{ retorno?: string }>();
  const destinoVolta = retorno === 'cadastro-palestra' ? '/cadastro-palestra' : '/eventos';
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [horaTermino, setHoraTermino] = useState('');
  const [salvando, setSalvando] = useState(false);

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
    if (salvando) return;

    if (!nome.trim()) {
      mostrarAlerta('Campo obrigatório', 'É necessário informar o nome do evento.');
      return;
    }

    const temInicio = dataInicio.trim() !== '' || horaInicio.trim() !== '';
    const temTermino = dataTermino.trim() !== '' || horaTermino.trim() !== '';

    let inicio: Date | null = null;

    if (temInicio) {
      if (!dataValida(dataInicio)) {
        mostrarAlerta('Data de início inválida', 'Digite uma data válida no formato DD/MM/AAAA.');
        return;
      }

      if (!horaValida(horaInicio)) {
        mostrarAlerta('Horário de início inválido', 'Digite um horário válido no formato HH:MM.');
        return;
      }

      inicio = paraDataHora(dataInicio, horaInicio);

      if (inicio < agoraSemSegundos()) {
        mostrarAlerta(
          'Início no passado',
          'O início do evento não pode ser em uma data e horário que já passaram.'
        );
        return;
      }
    }

    if (temTermino) {
      if (!inicio) {
        mostrarAlerta('Início obrigatório', 'Para informar o término, informe também o início do evento.');
        return;
      }

      if (!dataValida(dataTermino)) {
        mostrarAlerta('Data de término inválida', 'Digite uma data válida no formato DD/MM/AAAA.');
        return;
      }

      if (!horaValida(horaTermino)) {
        mostrarAlerta('Horário de término inválido', 'Digite um horário válido no formato HH:MM.');
        return;
      }

      const termino = paraDataHora(dataTermino, horaTermino);

      if (termino.getTime() === inicio.getTime()) {
        mostrarAlerta(
          'Horário inválido',
          'O início e o término do evento não podem ser no mesmo horário.'
        );
        return;
      }

      if (termino < inicio) {
        mostrarAlerta('Horário inválido', 'O término não pode ser anterior ao início do evento.');
        return;
      }
    }

    try {
      setSalvando(true);
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
      router.replace(destinoVolta);
    } catch (error) {
      const erro = error as EventoApiError;
      mostrarAlerta('Erro', erro.message || 'Não foi possível salvar o evento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.pagina}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.cabecalho}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={styles.botaoVoltar}
              onPress={() => router.replace(destinoVolta)}>
              <Ionicons name="arrow-back" size={22} color={Cores.texto} />
            </Pressable>
            <View style={styles.titulos}>
              <Text accessibilityRole="header" style={styles.tituloCabecalho}>
                Cadastro de evento
              </Text>
              <Text style={styles.subtituloCabecalho}>
                Preencha os dados para criar um novo evento
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nome do evento *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Semana Acadêmica de Computação"
              placeholderTextColor={Cores.inativo}
              value={nome}
              onChangeText={setNome}
              editable={!salvando}
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Digite a descrição do evento"
              placeholderTextColor={Cores.inativo}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              textAlignVertical="top"
              editable={!salvando}
            />

            <Text style={styles.label}>Início (opcional)</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={Cores.inativo}
                  value={dataInicio}
                  onChangeText={(t) => setDataInicio(formatarData(t))}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  editable={!salvando}
                />
              </View>
              <View style={styles.half}>
                <TextInput
                  style={styles.input}
                  placeholder="HH:mm"
                  placeholderTextColor={Cores.inativo}
                  value={horaInicio}
                  onChangeText={(t) => setHoraInicio(formatarHora(t))}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  editable={!salvando}
                />
              </View>
            </View>

            <Text style={styles.label}>Término (opcional)</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={Cores.inativo}
                  value={dataTermino}
                  onChangeText={(t) => setDataTermino(formatarData(t))}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  editable={!salvando}
                />
              </View>
              <View style={styles.half}>
                <TextInput
                  style={styles.input}
                  placeholder="HH:mm"
                  placeholderTextColor={Cores.inativo}
                  value={horaTermino}
                  onChangeText={(t) => setHoraTermino(formatarHora(t))}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  editable={!salvando}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (pressed || salvando) && { opacity: 0.75 },
              ]}
              onPress={cadastrarEvento}
              disabled={salvando}>
              {salvando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar evento</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.linkBox, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/eventos')}>
              <Text style={styles.linkText}>Ver eventos cadastrados</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Cores.fundo },
  pagina: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
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
  tituloCabecalho: { color: Cores.texto, fontSize: 24, fontWeight: '700' },
  subtituloCabecalho: { color: Cores.textoSuave, fontSize: 13, marginTop: 2 },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 16,
    backgroundColor: Cores.superficie,
    gap: 4,
  },
  label: {
    color: Cores.texto,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Cores.vinhoEscuro,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Cores.texto,
    backgroundColor: Cores.fundo,
    fontSize: 15,
  },
  textArea: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  button: {
    minHeight: 50,
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: Cores.vinho,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkBox: { marginTop: 14, paddingVertical: 6, alignItems: 'center' },
  linkText: { color: Cores.vinhoClaro, fontSize: 14, fontWeight: '600' },
});
