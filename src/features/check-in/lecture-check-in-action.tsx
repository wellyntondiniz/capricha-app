import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Cores } from '@/constants/cores';
import { useAuth } from '@/contexts/AuthContext';

/** Entrada contextual; scanner e QR continuam na tela compartilhada. */
export function LectureCheckInAction({ lectureId }: { lectureId?: number }) {
  const { usuario } = useAuth();
  const admin = ['ADMIN', 'ADMINISTRADOR'].includes(usuario?.perfil?.toUpperCase() ?? '');
  if (!Number.isSafeInteger(lectureId) || !lectureId || lectureId <= 0) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={admin ? 'Abrir check-in e QR Code desta palestra' : 'Fazer check-in nesta palestra'}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/check-in-palestras', params: { lectureId: String(lectureId) } })}>
      <Ionicons name="qr-code-outline" size={18} color={Cores.texto} />
      <Text style={styles.text}>{admin ? 'Check-in / QR Code' : 'Fazer check-in'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 12, minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8,
    alignItems: 'center', alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: Cores.vinhoClaro },
  text: { color: Cores.texto, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
