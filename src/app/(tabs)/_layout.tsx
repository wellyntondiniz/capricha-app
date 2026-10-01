import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cores } from '@/constants/cores';

type Icone = keyof typeof Ionicons.glyphMap;

const ABAS: { name: string; titulo: string; ativo: Icone; inativo: Icone }[] = [
  { name: 'home', titulo: 'Home', ativo: 'home', inativo: 'home-outline' },
  { name: 'eventos', titulo: 'Eventos', ativo: 'calendar', inativo: 'calendar-outline' },
  { name: 'ranking', titulo: 'Ranking', ativo: 'trophy', inativo: 'trophy-outline' },
  { name: 'perfil', titulo: 'Perfil', ativo: 'person', inativo: 'person-outline' },
  { name: 'configuracoes', titulo: 'Configurações', ativo: 'settings', inativo: 'settings-outline' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const paddingInferior = Math.max(insets.bottom, 8);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Cores.destaque,
          tabBarInactiveTintColor: Cores.inativo,
          tabBarLabelPosition: 'below-icon',
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
          tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
          tabBarStyle: {
            height: 60 + paddingInferior,
            paddingTop: 8,
            paddingBottom: paddingInferior,
            backgroundColor: Cores.superficie,
            borderTopWidth: 1,
            borderTopColor: Cores.borda,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: Cores.sombra,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 12,
          },
        }}>
        {ABAS.map((aba) => (
          <Tabs.Screen
            key={aba.name}
            name={aba.name}
            options={{
              title: aba.titulo,
              tabBarAccessibilityLabel: aba.titulo,
              tabBarIcon: ({ focused, color }) => (
                <View style={[styles.pilula, focused && styles.pilulaAtiva]}>
                  <Ionicons name={focused ? aba.ativo : aba.inativo} size={22} color={color} />
                </View>
              ),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  pilula: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilulaAtiva: {
    backgroundColor: Cores.vinhoSuave,
  },
});