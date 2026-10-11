import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { CoresFormulario } from '@/constants/formulario';

type Props = TextInputProps & {
  rotulo: string;
  erro?: string;
  dica?: string;
  estiloContainer?: StyleProp<ViewStyle>;
  estiloRotulo?: StyleProp<TextStyle>;
};

// Campo de formulário padrão: rótulo, entrada e, abaixo, a mensagem de erro (ou a dica).
export function CampoFormulario({
  rotulo,
  erro,
  dica,
  estiloContainer,
  estiloRotulo,
  style,
  ...props
}: Props) {
  return (
    <View style={[styles.container, estiloContainer]}>
      <Text style={[styles.rotulo, estiloRotulo]}>{rotulo}</Text>

      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={CoresFormulario.placeholder}
        {...props}
        style={[styles.input, style, !!erro && styles.inputErro]}
      />

      {erro ? (
        <Text style={styles.erro} accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : dica ? (
        <Text style={styles.dica}>{dica}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  rotulo: {
    marginBottom: 6,
    color: CoresFormulario.texto,
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    width: '100%',
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: CoresFormulario.fundo,
    color: CoresFormulario.texto,
    borderWidth: 1,
    borderColor: CoresFormulario.borda,
    borderRadius: 6,
    fontSize: 14,
  },

  inputErro: {
    borderColor: CoresFormulario.erro,
  },

  erro: {
    marginTop: 5,
    color: CoresFormulario.erro,
    fontSize: 12,
  },

  dica: {
    marginTop: 5,
    color: CoresFormulario.textoSecundario,
    fontSize: 12,
  },
});
