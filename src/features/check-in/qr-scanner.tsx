import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { onCodeScanned: (value: string) => void; onClose: () => void };

export function QrScanner({ onCodeScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const processingRef = useRef(false);
  const [cameraError, setCameraError] = useState(false);

  const handleCodeScanned = useCallback(({ data }: { data: string }) => {
    if (processingRef.current || !data.trim()) return;
    processingRef.current = true;
    onCodeScanned(data);
  }, [onCodeScanned]);

  if (!permission) return <View style={styles.screen} />;
  if (cameraError) return <View style={styles.permissionScreen}><Text style={styles.permissionTitle}>Não foi possível abrir a câmera</Text><Text style={styles.permissionText}>Verifique a permissão e se a câmera está sendo usada por outro aplicativo. Na web, utilize HTTPS ou localhost.</Text><Pressable onPress={onClose}><Text style={styles.cancelText}>Voltar</Text></Pressable></View>;
  if (!permission.granted) {
    // Depois de negar de forma definitiva, o sistema não mostra mais o pedido: é preciso liberar nas configurações.
    const bloqueada = !permission.canAskAgain;
    const web = Platform.OS === 'web';
    const texto = !bloqueada
      ? 'Precisamos da câmera para ler o QR Code.'
      : web
        ? 'O acesso à câmera foi bloqueado. Clique no ícone de cadeado ao lado do endereço, permita a câmera para este site e recarregue a página.'
        : 'O acesso à câmera está bloqueado. Abra as configurações do aparelho, permita a câmera para o Capricha e volte para escanear.';
    return <View style={styles.permissionScreen}><Text style={styles.permissionTitle}>Permita o uso da câmera</Text><Text style={styles.permissionText}>{texto}</Text>{!(bloqueada && web) && <Pressable style={styles.primaryButton} onPress={bloqueada ? () => { void Linking.openSettings(); } : requestPermission}><Text style={styles.primaryText}>{bloqueada ? 'Abrir configurações' : 'Permitir câmera'}</Text></Pressable>}<Pressable onPress={onClose}><Text style={styles.cancelText}>Voltar</Text></Pressable></View>;
  }

  return <View style={styles.screen}>
    <CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handleCodeScanned} onMountError={() => setCameraError(true)} />
    <View style={styles.overlay}><View style={styles.topBar}><Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable><Text style={styles.topTitle}>Escanear QR Code</Text><View style={styles.topSpacer}/></View><View style={styles.scanFrame}/><Text style={styles.hint}>Posicione o QR Code dentro da moldura</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D1018' }, overlay: { flex: 1, backgroundColor: 'rgba(6, 8, 13, .42)', alignItems: 'center' }, topBar: { width: '100%', paddingTop: 58, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(13,16,24,.8)', alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#fff', fontSize: 29, lineHeight: 32 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' }, topSpacer: { width: 42 }, scanFrame: { width: 245, height: 245, borderWidth: 3, borderColor: '#E25D83', borderRadius: 24, marginTop: 118, backgroundColor: 'transparent' }, hint: { color: '#F7EEF1', fontSize: 14, marginTop: 23, fontWeight: '600' }, permissionScreen: { flex: 1, backgroundColor: '#0D1018', padding: 28, justifyContent: 'center', alignItems: 'center' }, permissionTitle: { color: '#F4F5F6', fontSize: 22, fontWeight: '700', textAlign: 'center' }, permissionText: { color: '#A9B0BC', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 24 }, primaryButton: { backgroundColor: '#8D1E43', paddingHorizontal: 24, height: 46, borderRadius: 8, justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '700' }, cancelText: { color: '#C1C6CF', marginTop: 22, fontWeight: '600' },
});