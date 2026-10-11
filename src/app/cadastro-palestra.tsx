import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useState } from 'react';

import { CampoFormulario } from '@/components/campo-formulario';
import { Mensagem, MensagemFormulario } from '@/components/mensagem-formulario';
import { MENSAGEM_CORRIJA_CAMPOS } from '@/constants/formulario';
import { useFormulario } from '@/hooks/use-formulario';
import { lerErroApi } from '@/services/erro-api';
import { obrigatorio, validarData, validarHorario } from '@/utils/validacao';

type Campo = 'nome' | 'descricao' | 'palestrante' | 'data' | 'horario' | 'evento';

function validarCampo(campo: Campo, valores: Record<Campo, string>): string | undefined {
  switch (campo) {
    case 'nome':
      return obrigatorio(valores.nome, 'Informe o nome da palestra.');
    case 'descricao':
      return undefined; // opcional
    case 'palestrante':
      return obrigatorio(valores.palestrante, 'Informe o palestrante.');
    case 'data':
      return validarData(valores.data);
    case 'horario':
      return validarHorario(valores.horario);
    case 'evento':
      return obrigatorio(valores.evento, 'Informe o evento.');
  }
}

function mascararData(texto: string): string {
  let valor = texto.replace(/\D/g, '');
  if (valor.length > 2) valor = valor.slice(0, 2) + '/' + valor.slice(2);
  if (valor.length > 5) valor = valor.slice(0, 5) + '/' + valor.slice(5, 9);
  return valor;
}

function mascararHorario(texto: string): string {
  let valor = texto.replace(/\D/g, '');
  if (valor.length > 2) valor = valor.slice(0, 2) + ':' + valor.slice(2, 4);
  return valor;
}

export default function CadastroPalestra() {
  const formulario = useFormulario<Campo>(
    { nome: '', descricao: '', palestrante: '', data: '', horario: '', evento: '' },
    validarCampo,
  );
  const { valores, erros } = formulario;
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  function alterar(campo: Campo, valor: string) {
    formulario.alterar(campo, valor);
    setMensagem(null);
  }

  // Propriedades comuns de cada campo: valor, erro, digitação e saída do campo.
  function campo(nome: Campo, mascara?: (texto: string) => string) {
    return {
      value: valores[nome],
      erro: erros[nome],
      onChangeText: (texto: string) => alterar(nome, mascara ? mascara(texto) : texto),
      onBlur: () => formulario.sair(nome),
      style: styles.input,
      estiloRotulo: styles.label,
      estiloContainer: styles.campo,
    };
  }

  const cadastrarPalestra = async () => {
    if (enviando) return;
    setMensagem(null);

    if (!formulario.validarCampos()) {
      setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
      return;
    }

    const novaPalestra = {
      nome: valores.nome.trim(),
      descricao: valores.descricao.trim(),
      palestrante: valores.palestrante.trim(),
      data: valores.data.trim(),
      horario: valores.horario.trim(),
      evento: valores.evento.trim(),
    };

    setEnviando(true);
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
        const padrao = resposta.status === 409
          ? 'Este palestrante já tem uma palestra cadastrada nesta data e horário.'
          : 'Não foi possível salvar a palestra.';
        const erro = await lerErroApi(resposta, padrao);
        if (formulario.definirErros(erro.campos)) {
          setMensagem({ texto: MENSAGEM_CORRIJA_CAMPOS, tipo: 'erro' });
        } else {
          setMensagem({ texto: erro.message, tipo: 'erro' });
        }
        return;
      }

      formulario.limpar();
      setMensagem({ texto: 'Palestra cadastrada com sucesso!', tipo: 'sucesso' });
    } catch {
      setMensagem({ texto: 'Não foi possível conectar ao servidor.', tipo: 'erro' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Cadastro de palestra</Text>

        <CampoFormulario
          rotulo="Nome da palestra"
          placeholder="Digite o nome da palestra"
          {...campo('nome')}
        />

        <CampoFormulario
          rotulo="Descrição"
          placeholder="Digite a descrição da palestra"
          multiline
          {...campo('descricao')}
          style={[styles.input, styles.textArea]}
        />

        <CampoFormulario
          rotulo="Palestrante"
          placeholder="Digite o nome do palestrante"
          {...campo('palestrante')}
        />

        <View style={styles.row}>
          <CampoFormulario
            rotulo="Data"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            {...campo('data', mascararData)}
            estiloContainer={styles.half}
          />

          <CampoFormulario
            rotulo="Horário"
            placeholder="00:00"
            keyboardType="number-pad"
            {...campo('horario', mascararHorario)}
            estiloContainer={styles.half}
          />
        </View>

        <CampoFormulario
          rotulo="Evento"
          placeholder="Selecione o evento"
          {...campo('evento')}
        />

        <View style={styles.mensagem}>
          <MensagemFormulario mensagem={mensagem} />
        </View>

        <Pressable
          style={[styles.button, enviando && styles.buttonDisabled]}
          onPress={cadastrarPalestra}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Cadastrar</Text>
          )}
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

  campo: {
    marginBottom: 0,
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
    marginBottom: 0,
  },

  mensagem: {
    marginTop: 20,
  },

  button: {
    height: 52,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#A71948',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
