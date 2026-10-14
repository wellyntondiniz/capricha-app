import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

import { Cores } from '@/constants/cores';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1017' } }}>
        <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: Cores.fundo } }} />
        <Stack.Screen name="quiz" options={{ headerShown: true, title: 'Quiz', headerStyle: { backgroundColor: Cores.fundo }, headerTintColor: Cores.texto }} />
        <Stack.Screen name="notificacoes" options={{ headerShown: true, title: 'Notificações', headerStyle: { backgroundColor: Cores.fundo }, headerTintColor: Cores.texto }} />
      </Stack>
      <Toast
      position="top"
      topOffset={80}
      autoHide={true}
    />
    </>
    
  );
}
