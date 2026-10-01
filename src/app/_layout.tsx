import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Cores } from '@/constants/cores';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1017' } }}>
        <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: Cores.fundo } }} />
      </Stack>
    </>
  );
}