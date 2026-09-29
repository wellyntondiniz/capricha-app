import { StyleSheet, Text } from 'react-native';

import { CoresFormulario } from '@/constants/formulario';

export type TipoMensagem = 'erro' | 'sucesso' | 'info';

export type Mensagem = { texto: string; tipo: TipoMensagem } | null;

// Mensagem geral do formulário (ex.: "Corrija os campos destacados", "Cadastro realizado").
export function MensagemFormulario({ mensagem }: { mensagem: Mensagem }) {
  if (!mensagem) return null;

  return (
    <Text style={[styles.mensagem, styles[mensagem.tipo]]} accessibilityLiveRegion="polite">
      {mensagem.texto}
    </Text>
  );
}

const styles = StyleSheet.create({
  mensagem: {
    marginBottom: 12,
    fontSize: 13,
    textAlign: 'center',
  },

  erro: {
    color: CoresFormulario.erro,
  },

  sucesso: {
    color: CoresFormulario.sucesso,
  },

  info: {
    color: CoresFormulario.textoSecundario,
  },
});
