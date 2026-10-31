import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Cores } from '@/constants/cores';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { usuario, carregando } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;

    const rotasPublicas = ['/', '/cadastro', '/esqueci-senha', '/codigo-recuperacao'];
    const isPublica = rotasPublicas.includes(pathname);

    if (!usuario && !isPublica) {
      router.replace('/');
    } else if (usuario && pathname === '/') {
      router.replace('/(tabs)/home');
    }
  }, [usuario, carregando, pathname]);

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Cores.destaque} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1017' } }}>
        <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: Cores.fundo } }} />
        <Stack.Screen name="notificacoes" options={{ headerShown: true, title: 'Notificações', headerStyle: { backgroundColor: Cores.fundo }, headerTintColor: Cores.texto }} />
      </Stack>
      <Toast position="top" topOffset={80} autoHide={true} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Cores.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});