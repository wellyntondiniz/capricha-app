import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
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
  mostrarAlternarSenha?: boolean;
};

// Campo de formulário padrão: rótulo, entrada e, abaixo, a mensagem de erro (ou a dica).
export function CampoFormulario({
  rotulo,
  erro,
  dica,
  estiloContainer,
  estiloRotulo,
  style,
  secureTextEntry,
  mostrarAlternarSenha,
  ...props
}: Props) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const devePermitirAlternar = mostrarAlternarSenha ?? secureTextEntry;

  return (
    <View style={[styles.container, estiloContainer]}>
      <Text style={[styles.rotulo, estiloRotulo]}>{rotulo}</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          accessibilityLabel={rotulo}
          placeholderTextColor={CoresFormulario.placeholder}
          secureTextEntry={devePermitirAlternar ? !senhaVisivel : secureTextEntry}
          {...props}
          style={[
            styles.input,
            devePermitirAlternar && styles.inputComIcone,
            style,
            !!erro && styles.inputErro,
          ]}
        />

        {devePermitirAlternar && (
          <Pressable
            style={styles.botaoOlho}
            onPress={() => setSenhaVisivel((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Ver senha'}
            hitSlop={8}
          >
            <Ionicons
              name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={CoresFormulario.textoSecundario}
            />
          </Pressable>
        )}
      </View>

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

  inputWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
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

  inputComIcone: {
    paddingRight: 42,
  },

  botaoOlho: {
    position: 'absolute',
    right: 12,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
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
