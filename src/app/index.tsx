import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Text style={styles.star}>✦</Text></View>
        <Text style={styles.heading}>Acesse sua conta</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Login de usuário</Text>

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="voce@exemplo.com"
            placeholderTextColor="#777B86"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            placeholderTextColor="#777B86"
            secureTextEntry
          />

          <Pressable onPress={() => router.push('/esqueci-senha')}>
            <Text style={styles.forgot}>Esqueceu sua senha?</Text>
          </Pressable>

          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Entrar</Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryBox} onPress={() => router.push('/cadastro')}>
          <Text style={styles.secondaryText}>Não possui uma conta? <Text style={styles.link}>Criar conta</Text></Text>
        </Pressable>

        <Text style={styles.footer}>© 2026 · Sistema de Usuários</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Index() {

  return <CadastroPalestra />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1017' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 42 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#931D3F', alignItems: 'center', justifyContent: 'center' },
  star: { color: '#FFFFFF', fontSize: 25 },
  heading: { color: '#F2F2F4', fontSize: 24, fontWeight: '400', marginTop: 14, marginBottom: 24 },
  card: { width: '100%', maxWidth: 372, borderWidth: 1, borderColor: '#7F1837', borderRadius: 7, padding: 24 },
  title: { color: '#F2F2F4', fontSize: 21, fontWeight: '400', marginBottom: 21 },
  label: { color: '#E5E5E8', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { height: 41, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingHorizontal: 13, color: '#FFFFFF', fontSize: 14, marginBottom: 15 },
  forgot: { color: '#A92B50', fontSize: 13, textAlign: 'right', marginTop: -3, marginBottom: 17 },
  button: { height: 41, borderRadius: 5, backgroundColor: '#941D3E', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryBox: { width: '100%', maxWidth: 372, borderWidth: 1, borderColor: '#7F1837', borderRadius: 5, paddingVertical: 15, marginTop: 19 },
  secondaryText: { color: '#E2E2E5', textAlign: 'center', fontSize: 13 },
  link: { color: '#A92B50' },
  footer: { color: '#676B76', fontSize: 12, marginTop: 24 },
});
