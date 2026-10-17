import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { httpCheckInService } from '@/features/check-in/http-check-in-service';
import { QrScanner } from '@/features/check-in/qr-scanner';
import { CheckInError, CheckInEvent, EventQrCode } from '@/features/check-in/types';

type Notice = { tone: 'success' | 'error'; text: string } | null;

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value)) : 'Data não definida';

const formatTime = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '--:--';

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof CheckInError)) return fallback;
  switch (error.code) {
    case 'INVALID_QR': return 'QR Code inválido.';
    case 'EVENT_NOT_FOUND': return 'Este QR Code não pertence a um evento válido.';
    case 'INVALID_EVENT_TOKEN': return 'QR Code inválido para este evento.';
    case 'CHECK_IN_NOT_AVAILABLE': return 'Check-in não disponível neste momento.';
    case 'ALREADY_CHECKED_IN': return 'Você já realizou check-in neste evento.';
    case 'AUTH_REQUIRED': return 'Sua sessão expirou. Faça login novamente.';
    case 'FORBIDDEN': return 'Você não tem permissão para visualizar este QR Code.';
    default: return error.message || fallback;
  }
}

export default function CheckInScreen() {
  const { usuario, carregando, deslogar } = useAuth();
  const router = useRouter();
  const token = usuario?.token ?? '';
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
    return () => { tokenRef.current = ''; };
  }, [token]);
  const submittingRef = useRef(false);
  const [events, setEvents] = useState<CheckInEvent[]>([]);
  const [selected, setSelected] = useState<CheckInEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [qrEvent, setQrEvent] = useState<CheckInEvent | null>(null);
  const [qrCode, setQrCode] = useState<EventQrCode | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const handleError = async (error: unknown, fallback: string) => {
    if (error instanceof CheckInError && error.code === 'AUTH_REQUIRED') {
      setSelected(null);
      setQrEvent(null);
      setScannerOpen(false);
      await deslogar();
      router.replace('/');
      return;
    }
    setNotice({ tone: 'error', text: errorMessage(error, fallback) });
  };

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await httpCheckInService.getEvents(token);
      if (tokenRef.current === token) setEvents(result);
    } catch (error) {
      if (tokenRef.current !== token) return;
      if (error instanceof CheckInError && error.code === 'AUTH_REQUIRED') {
        await deslogar();
        router.replace('/');
      } else {
        setNotice({ tone: 'error', text: errorMessage(error, 'Não foi possível carregar os eventos.') });
      }
    } finally {
      setLoading(false);
    }
  }, [token, deslogar, router]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadEvents(); }, 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  const selectEvent = (event: CheckInEvent) => {
    setNotice(null);
    setSelected({ ...event, qrToken: undefined });
  };

  const scanCode = async (value: string) => {
    setScannerOpen(false);
    try {
      const event = await httpCheckInService.getEventByQrCode(value, token);
      if (tokenRef.current !== token) return;
      setSelected(event);
      setNotice(null);
    } catch (error) {
      if (tokenRef.current === token) await handleError(error, 'Não foi possível ler este QR Code.');
    }
  };

  const confirm = async () => {
    if (!selected || submittingRef.current || selected.hasCheckedIn) return;
    if (!selected.qrToken) {
      setNotice({ tone: 'error', text: 'Escaneie o QR Code do evento para realizar o check-in.' });
      return;
    }
    setSubmitting(true);
    submittingRef.current = true;
    setNotice(null);
    try {
      const record = await httpCheckInService.checkIn(selected.id, selected.qrToken, token);
      if (tokenRef.current !== token) return;
      const updated = { ...selected, hasCheckedIn: true, checkedInAt: record.checkedInAt };
      setEvents((current) => current.map((event) => event.id === updated.id ? updated : event));
      setSelected(updated);
      setNotice({ tone: 'success', text: `Check-in realizado com sucesso às ${formatTime(record.checkedInAt)}.` });
    } catch (error) {
      if (tokenRef.current !== token) return;
      if (error instanceof CheckInError && error.code === 'ALREADY_CHECKED_IN') {
        setSelected(null);
        await loadEvents();
      }
      await handleError(error, 'Não foi possível realizar o check-in.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const openQrCode = async (event: CheckInEvent) => {
    setQrEvent(event);
    setQrCode(null);
    setQrLoading(true);
    try {
      const qr = await httpCheckInService.getEventQrCode(event.id, token);
      if (tokenRef.current === token) setQrCode(qr);
    } catch (error) {
      if (tokenRef.current !== token) return;
      await handleError(error, 'Não foi possível gerar o QR Code.');
      setQrEvent(null);
    } finally {
      setQrLoading(false);
    }
  };

  if (carregando) return <SafeAreaView style={styles.screen}><ActivityIndicator color="#C74A70" /></SafeAreaView>;
  if (!usuario || !token) return <Redirect href="/" />;

  const canGenerateQr = ['ADMIN', 'ADMINISTRADOR'].includes(usuario.perfil?.toUpperCase() ?? '');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>CAPRICHA APP</Text><Text style={styles.title}>Check-in</Text></View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setScannerOpen(true)} style={styles.scanHeaderButton}><Text style={styles.scanHeaderText}>QR Code</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar à Home" onPress={() => router.replace('/(tabs)/home')} style={styles.backButton}><Text style={styles.backText}>Voltar</Text></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>Olá, {usuario.nome}. Selecione um evento ou escaneie seu QR Code.</Text>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void loadEvents()} style={styles.backButton}><Text style={styles.backText}>Atualizar eventos</Text></Pressable>
        {notice && <NoticeView notice={notice} />}
        {loading ? <ActivityIndicator color="#C74A70" style={styles.loader} /> : events.map((event) => (
          <View key={event.id} style={styles.cardWrapper}>
            <Pressable onPress={() => selectEvent(event)} style={({ pressed }) => [styles.card, selected?.id === event.id && styles.cardSelected, pressed && styles.pressed]}>
              <View style={styles.cardHeading}>
                <Text style={styles.category}>{event.status === 'available' ? 'DISPONÍVEL AGORA' : event.status === 'finished' ? 'ENCERRADO' : 'PRÓXIMO EVENTO'}</Text>
                {event.hasCheckedIn && <Text style={styles.done}>✓ CONFIRMADO</Text>}
              </View>
              <Text style={styles.eventName}>{event.nome}</Text>
              {!!event.descricao && <Text style={styles.eventDescription}>{event.descricao}</Text>}
              <Text style={styles.meta}>◷  {formatDate(event.dataInicio)} às {formatTime(event.dataInicio)}</Text>
            </Pressable>
            {canGenerateQr && <Pressable onPress={() => void openQrCode(event)} style={styles.qrButton}><Text style={styles.qrButtonText}>Exibir QR Code do evento</Text></Pressable>}
          </View>
        ))}
        {!loading && !events.length && <Text style={styles.empty}>Nenhum evento disponível para check-in.</Text>}
        <Pressable onPress={() => setScannerOpen(true)} style={styles.scanButton}><Text style={styles.scanButtonText}>Escanear QR Code do evento</Text></Pressable>
      </ScrollView>

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => { if (!submittingRef.current) setSelected(null); }}>
        <View style={styles.modalBackdrop}><View style={styles.modal}>
          <Text style={styles.modalLabel}>EVENTO SELECIONADO</Text>
          <Text style={styles.modalTitle}>{selected?.nome}</Text>
          {selected && <Text style={styles.modalInfo}>{formatDate(selected.dataInicio)} às {formatTime(selected.dataInicio)}</Text>}
          {notice && <NoticeView notice={notice} />}
          {selected?.hasCheckedIn ? <View style={styles.confirmed}><Text style={styles.confirmedText}>✓ Check-in realizado em {formatDate(selected.checkedInAt!)} às {formatTime(selected.checkedInAt!)}</Text></View> : selected?.qrToken ? (
            <Pressable disabled={submitting || !selected.canCheckIn} onPress={() => void confirm()} style={[styles.confirmButton, (submitting || !selected.canCheckIn) && styles.disabled]}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{selected.canCheckIn ? 'Confirmar check-in' : 'Check-in indisponível'}</Text>}
            </Pressable>
          ) : <Pressable onPress={() => { setSelected(null); setScannerOpen(true); }} style={styles.confirmButton}><Text style={styles.confirmText}>Escanear QR Code</Text></Pressable>}
          <Pressable disabled={submitting} onPress={() => setSelected(null)} style={styles.closeModal}><Text style={styles.closeModalText}>Fechar</Text></Pressable>
        </View></View>
      </Modal>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <QrScanner onCodeScanned={(value) => void scanCode(value)} onClose={() => setScannerOpen(false)} />
      </Modal>

      <Modal visible={qrEvent !== null} transparent animationType="fade" onRequestClose={() => setQrEvent(null)}>
        <View style={styles.modalBackdrop}><View style={styles.qrModal}>
          <Text style={styles.modalLabel}>QR CODE DO EVENTO</Text>
          <Text style={styles.modalTitle}>{qrEvent?.nome}</Text>
          {qrLoading && <ActivityIndicator color="#E25D83" style={styles.qrLoader} />}
          {qrCode && <Image source={{ uri: qrCode.imageData }} style={styles.qrImage} accessibilityLabel="QR Code do evento" />}
          <Text style={styles.qrHint}>Este QR Code identifica o evento. Cada participante deve escaneá-lo no próprio aplicativo.</Text>
          <Pressable onPress={() => setQrEvent(null)} style={styles.closeModal}><Text style={styles.closeModalText}>Fechar</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function NoticeView({ notice }: { notice: Exclude<Notice, null> }) {
  return <View style={[styles.notice, notice.tone === 'success' ? styles.noticeSuccess : styles.noticeError]}><Text style={styles.noticeText}>{notice.text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D1018' },
  header: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#252834' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: 10, color: '#C64E70', fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 27, color: '#F4F5F6', fontWeight: '700', marginTop: 4 },
  description: { color: '#A6AFBC', fontSize: 15, marginBottom: 20, lineHeight: 22 },
  scanHeaderButton: { borderWidth: 1, borderColor: '#80304D', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  scanHeaderText: { color: '#EEB4C5', fontSize: 12, fontWeight: '700' },
  backButton: { paddingHorizontal: 6, paddingVertical: 10 },
  backText: { color: '#A6AFBC', fontSize: 12, fontWeight: '700' },
  content: { padding: 22, paddingBottom: 44, maxWidth: 650, width: '100%', alignSelf: 'center' },
  notice: { borderRadius: 10, padding: 13, marginBottom: 14, borderWidth: 1 },
  noticeSuccess: { backgroundColor: '#173228', borderColor: '#356451' },
  noticeError: { backgroundColor: '#391926', borderColor: '#783047' },
  noticeText: { color: '#EDF0F2', fontSize: 13, fontWeight: '600' },
  loader: { marginTop: 48 },
  cardWrapper: { marginBottom: 13 },
  card: { backgroundColor: '#161923', borderWidth: 1, borderColor: '#292E3A', borderRadius: 14, padding: 17 },
  cardSelected: { borderColor: '#B34364', backgroundColor: '#1D1721' },
  pressed: { opacity: 0.76 },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  category: { color: '#CB637F', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  done: { color: '#82C9AA', fontSize: 10, fontWeight: '800' },
  eventName: { color: '#F2F3F5', fontSize: 19, fontWeight: '700' },
  eventDescription: { color: '#9DA6B4', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 11 },
  meta: { color: '#B7BFCA', fontSize: 12, marginTop: 4 },
  empty: { color: '#9DA6B4', textAlign: 'center', marginTop: 40 },
  scanButton: { height: 51, borderWidth: 1, borderColor: '#7F304C', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  scanButtonText: { color: '#E8A5B7', fontWeight: '700', fontSize: 14 },
  qrButton: { height: 38, borderWidth: 1, borderColor: '#3C526E', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  qrButtonText: { color: '#AFC9E6', fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(3,5,10,.75)', justifyContent: 'center', padding: 22 },
  modal: { backgroundColor: '#191C26', borderWidth: 1, borderColor: '#66263F', borderRadius: 17, padding: 24 },
  qrModal: { backgroundColor: '#191C26', borderWidth: 1, borderColor: '#66263F', borderRadius: 17, padding: 24, alignItems: 'center' },
  modalLabel: { color: '#C45778', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  modalTitle: { color: '#F5F5F6', fontSize: 23, fontWeight: '700', marginTop: 8 },
  modalInfo: { color: '#ABB3BF', fontSize: 13, marginTop: 8 },
  confirmButton: { minHeight: 47, borderRadius: 9, backgroundColor: '#8D1E43', marginTop: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.55 },
  confirmed: { borderWidth: 1, borderColor: '#356451', backgroundColor: '#183027', borderRadius: 9, padding: 14, marginTop: 24 },
  confirmedText: { color: '#93D4B7', fontWeight: '700', fontSize: 13 },
  closeModal: { alignItems: 'center', paddingTop: 18 },
  closeModalText: { color: '#B9C0CB', fontWeight: '600' },
  qrLoader: { marginVertical: 28 },
  qrImage: { width: '100%', maxWidth: 280, aspectRatio: 1, marginTop: 18, backgroundColor: '#fff' },
  qrHint: { color: '#ABB3BF', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
});
