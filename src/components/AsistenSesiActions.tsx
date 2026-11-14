import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import type { Sesi, StatusSesi } from '@/types/siprak';
import { closeSession, openSession, subscribeSession } from '@/services/sessionService';

type PendingAction = 'open' | 'close' | null;

function readableError(error: Error): string {
  if (error.message.includes('permission-denied')) return 'Akun ini tidak memiliki akses untuk mengelola sesi pada kelas tersebut.';
  if (error.message.includes('unavailable') || error.message.includes('network')) return 'Koneksi ke server gagal. Periksa internet lalu coba lagi.';
  return error.message || 'Perubahan sesi gagal disimpan. Silakan coba lagi.';
}

function statusLabel(status: StatusSesi): string {
  if (status === 'dibuka') return 'Dibuka';
  if (status === 'ditutup') return 'Ditutup';
  return 'Belum dibuka';
}

export function AsistenSesiActions({ sesi }: { sesi: Sesi }) {
  const { currentUser } = useSiprakContext();
  const [liveSession, setLiveSession] = useState<Sesi | null>(null);
  const [dialog, setDialog] = useState<PendingAction>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeSession(sesi.id, (updated) => {
      setLiveSession(updated);
      setError(null);
    }, (listenerError) => setError(readableError(listenerError)));
  }, [sesi.id]);

  const activeSession = liveSession?.id === sesi.id ? liveSession : sesi;

  const canOpen = activeSession.status === 'belum_dibuka';
  const canClose = activeSession.status === 'dibuka';

  const confirmAction = async () => {
    if (!currentUser || currentUser.peran !== 'asisten' || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (dialog === 'open') await openSession(activeSession.id);
      if (dialog === 'close') await closeSession(activeSession.id, note);
      setDialog(null);
      setNote('');
    } catch (actionError: unknown) {
      setError(readableError(actionError instanceof Error ? actionError : new Error('Gagal menyimpan perubahan.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pengelolaan sesi</Text>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status sesi</Text>
        <Text style={[styles.status, activeSession.status === 'dibuka' && styles.statusOpen, activeSession.status === 'ditutup' && styles.statusClosed]}>
          {statusLabel(activeSession.status)}
        </Text>
      </View>
      {activeSession.dibukaPada ? <Info label="Dibuka pada" value={formatTime(activeSession.dibukaPada)} /> : null}
      {activeSession.ditutupPada ? <Info label="Ditutup pada" value={formatTime(activeSession.ditutupPada)} /> : null}
      {activeSession.catatanPenutup ? <Info label="Catatan penutup" value={activeSession.catatanPenutup} /> : null}

      {currentUser?.peran === 'asisten' && canOpen ? (
        <ActionButton label="Buka sesi" onPress={() => setDialog('open')} />
      ) : null}
      {currentUser?.peran === 'asisten' && canClose ? (
        <ActionButton label="Tutup sesi" destructive onPress={() => setDialog('close')} />
      ) : null}
      {activeSession.status === 'ditutup' ? <Text style={styles.helper}>Sesi ditutup dan tidak dapat dibuka kembali.</Text> : null}
      <ActionButton label="Lihat rekap kehadiran" secondary onPress={() => router.push(`/rekap/${activeSession.id}` as Href)} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <Modal transparent animationType="fade" visible={dialog !== null} onRequestClose={() => { if (!busy) setDialog(null); }}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{dialog === 'open' ? 'Buka sesi praktikum?' : 'Tutup sesi praktikum?'}</Text>
            <Text style={styles.helper}>
              {dialog === 'open'
                ? 'Praktikan pada kelas ini dapat melakukan presensi setelah sesi dibuka.'
                : 'Setelah ditutup, sesi tidak dapat dibuka kembali dan presensi baru ditolak.'}
            </Text>
            {dialog === 'close' ? (
              <TextInput
                accessibilityLabel="Catatan penutup (opsional)"
                value={note}
                onChangeText={setNote}
                placeholder="Catatan penutup (opsional)"
                multiline
                textAlignVertical="top"
                style={styles.input}
              />
            ) : null}
            <View style={styles.dialogButtons}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setDialog(null)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={confirmAction} style={[styles.confirmButton, dialog === 'close' && styles.destructiveButton]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>Konfirmasi</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.info}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function ActionButton({ label, onPress, secondary = false, destructive = false }: { label: string; onPress: () => void; secondary?: boolean; destructive?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.actionButton, secondary && styles.secondaryButton, destructive && styles.destructiveButton]}>
      <Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 18, borderWidth: 1, padding: 18 },
  title: { color: '#17243B', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  label: { color: '#68758A', fontSize: 13, fontWeight: '600' },
  status: { backgroundColor: '#FFF3D6', borderRadius: 20, color: '#805B00', fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7 },
  statusOpen: { backgroundColor: '#DFF5E9', color: '#17643D' },
  statusClosed: { backgroundColor: '#E9EDF3', color: '#526074' },
  info: { borderTopColor: '#EEF1F5', borderTopWidth: 1, marginBottom: 12, paddingTop: 11 },
  value: { color: '#25354D', fontSize: 14, lineHeight: 20, marginTop: 4 },
  helper: { color: '#65738A', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  actionButton: { alignItems: 'center', backgroundColor: '#315CCB', borderRadius: 12, justifyContent: 'center', marginTop: 10, minHeight: 48, paddingHorizontal: 14 },
  destructiveButton: { backgroundColor: '#B42318' },
  secondaryButton: { backgroundColor: '#EEF3FF' },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondaryText: { color: '#315CCB' },
  error: { color: '#B42318', fontSize: 13, lineHeight: 19, marginTop: 12 },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)', flex: 1, justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 18, maxWidth: 440, padding: 20, width: '100%' },
  dialogTitle: { color: '#17243B', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  input: { borderColor: '#DCE3EC', borderRadius: 12, borderWidth: 1, color: '#25354D', minHeight: 92, padding: 12, marginTop: 10 },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', marginRight: 8, minHeight: 48, minWidth: 84, paddingHorizontal: 12 },
  cancelText: { color: '#526074', fontSize: 14, fontWeight: '700' },
  confirmButton: { alignItems: 'center', backgroundColor: '#315CCB', borderRadius: 11, justifyContent: 'center', minHeight: 48, minWidth: 125, paddingHorizontal: 14 },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
