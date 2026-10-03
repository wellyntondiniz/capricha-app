import Toast from 'react-native-toast-message';

export function sucesso(titulo: string, mensagem?: string) {
  Toast.show({
    type: 'success',
    text1: titulo,
    text2: mensagem,
  });
}

export function erro(titulo: string, mensagem?: string) {
  Toast.show({
    type: 'error',
    text1: titulo,
    text2: mensagem,
  });
}

export function info(titulo: string, mensagem?: string) {
  Toast.show({
    type: 'info',
    text1: titulo,
    text2: mensagem,
  });
}