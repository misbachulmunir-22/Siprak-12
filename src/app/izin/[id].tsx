import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import type { PengajuanIzin, StatusIzin } from '@/types/siprak';
import { decideLeaveRequest, subscribeLeaveRequest } from '@/services/leaveReviewService';

type Decision = Exclude<StatusIzin, 'menunggu'>;

export default function AssistantLeaveRequestDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { currentUser } = useSiprakContext();
  const [result, setResult] = useState<{ key: string; request: PengajuanIzin | null; error: string | null } | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const subscriptionKey = `${requestId ?? ''}:${retryKey}`;

  useEffect(() => {
    if (!requestId) {
      return;
    }
    return subscribeLeaveRequest(requestId, (item) => {
      setResult({ key: subscriptionKey, request: item, error: item ? null : 'Pengajuan tidak ditemukan atau tidak dapat diakses.' });
    }, (listenerError) => {
      const message = listenerError.message.includes('permission-denied')
        ? 'Akun ini tidak berwenang memeriksa pengajuan kelas tersebut.'
        : 'Detail pengajuan gagal dimuat. Periksa koneksi lalu coba lagi.';
      setResult({ key: subscriptionKey, request: null, error: message });
    });
  }, [requestId, retryKey, subscriptionKey]);

  const currentResult = result?.key === subscriptionKey ? result : null;
  const request = currentResult?.request ?? null;
  const loading = Boolean(requestId) && currentResult === null;
  const error = decisionError ?? currentResult?.error ?? (requestId ? null : 'ID pengajuan tidak tersedia. Kembali ke daftar izin.');

  const submitDecision = async () => {
    if (!currentUser || currentUser.peran !== 'asisten' || !request || !decision || saving) return;
    setSaving(true);
    setDecisionError(null);
    try {
      await decideLeaveRequest(request.id, currentUser.id, decision, note);
      setDecision(null);
      setNote('');
    } catch (decisionError: unknown) {
      setDecisionError(decisionError instanceof Error ? decisionError.message : 'Keputusan gagal disimpan. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser || currentUser.peran !== 'asisten') {
    return <Notice title="Akses asisten diperlukan" description="Hanya asisten yang ditugaskan pada kelas ini dapat memeriksa pengajuan." />;
  }
  if (loading) return <View style={styles.center}><ActivityIndicator color="#315CCB" /><Text style={styles.muted}>Memuat pengajuan…</Text></View>;
  if (!request) return <Notice title="Pengajuan tidak tersedia" description={error ?? 'Pengajuan tidak ditemukan.'} action="Coba lagi" onAction={() => setRetryKey((key) => key + 1)} />;

  return (
    <View style={styles.screen}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  Daftar izin</Text></Pressable>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>PENGAJUAN IZIN</Text>
          <Text style={[styles.status, request.status === 'disetujui' && styles.approved, request.status === 'ditolak' && styles.rejected]}>
            {request.status === 'menunggu' ? 'Menunggu' : request.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}
          </Text>
        </View>
        <Detail label="Sesi" value={request.sesiId} />
        <Detail label="UID praktikan" value={request.praktikanUid} />
        <View style={styles.reasonBox}>
          <Text style={styles.label}>Alasan asli</Text>
          <Text style={styles.reason}>{request.alasan}</Text>
        </View>
        <View style={styles.aiBox}>
          <Text style={styles.aiTitle}>Prediksi AI — informasi pendukung</Text>
          <Text style={styles.aiValue}>{request.aiCategory ?? aiStatusLabel(request.aiStatus)}</Text>
          {typeof request.aiConfidence === 'number' ? <Text style={styles.aiMeta}>Confidence: {Math.round(request.aiConfidence * 100)}%</Text> : null}
          {request.aiModel ? <Text style={styles.aiMeta}>Model: {request.aiModel}</Text> : null}
          <Text style={styles.aiDisclaimer}>Prediksi AI tidak menentukan persetujuan atau penolakan.</Text>
        </View>
        {request.reviewedAt ? <Detail label="Diputuskan pada" value={formatDate(request.reviewedAt)} /> : null}
        {request.reviewNote ? <Detail label="Catatan keputusan" value={request.reviewNote} /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {request.status === 'menunggu' ? (
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setDecision('ditolak')} style={[styles.actionButton, styles.rejectButton]}><Text style={styles.actionText}>Tolak izin</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setDecision('disetujui')} style={[styles.actionButton, styles.approveButton]}><Text style={styles.actionText}>Setujui izin</Text></Pressable>
          </View>
        ) : <Text style={styles.muted}>Pengajuan ini sudah diputuskan.</Text>}
      </View>

      <Modal transparent animationType="fade" visible={decision !== null} onRequestClose={() => { if (!saving) setDecision(null); }}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{decision === 'disetujui' ? 'Setujui pengajuan izin?' : 'Tolak pengajuan izin?'}</Text>
            <Text style={styles.muted}>Keputusan ini akan disimpan dan terlihat oleh praktikan.</Text>
            <TextInput accessibilityLabel="Catatan keputusan (opsional)" placeholder="Catatan keputusan (opsional)" value={note} onChangeText={setNote} multiline textAlignVertical="top" style={styles.input} />
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDecision(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={saving} onPress={submitDecision} style={[styles.actionButton, decision === 'disetujui' ? styles.approveButton : styles.rejectButton]}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionText}>Konfirmasi</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function Notice({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <View style={styles.center}><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.muted}>{description}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.back}><Text style={styles.backText}>{action}</Text></Pressable> : null}</View>;
}

function aiStatusLabel(status: PengajuanIzin['aiStatus']): string {
  if (status === 'gagal') return 'Klasifikasi gagal atau timeout';
  if (status === 'tidak_tersedia') return 'Klasifikasi AI belum tersedia';
  if (status === 'menunggu') return 'Klasifikasi sedang diproses';
  return 'Kategori tidak tersedia pada hasil';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F7FB', flex: 1, padding: 18 },
  back: { alignSelf: 'flex-start', justifyContent: 'center', marginBottom: 10, minHeight: 44, paddingRight: 12 },
  backText: { color: '#315CCB', fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 18, borderWidth: 1, padding: 17 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { color: '#65738A', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  status: { backgroundColor: '#FFF3D6', borderRadius: 16, color: '#805B00', fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  approved: { backgroundColor: '#DFF5E9', color: '#17643D' },
  rejected: { backgroundColor: '#FDE8E7', color: '#A52820' },
  detail: { borderTopColor: '#EEF1F5', borderTopWidth: 1, marginBottom: 12, paddingTop: 11 },
  label: { color: '#65738A', fontSize: 12, fontWeight: '600' },
  detailValue: { color: '#25354D', fontSize: 14, lineHeight: 20, marginTop: 4 },
  reasonBox: { backgroundColor: '#F7F9FC', borderRadius: 13, marginVertical: 4, padding: 13 },
  reason: { color: '#25354D', fontSize: 15, lineHeight: 23, marginTop: 6 },
  aiBox: { backgroundColor: '#EEF3FF', borderRadius: 13, marginTop: 13, padding: 13 },
  aiTitle: { color: '#315CCB', fontSize: 12, fontWeight: '800' },
  aiValue: { color: '#17243B', fontSize: 15, fontWeight: '700', marginTop: 7 },
  aiMeta: { color: '#526074', fontSize: 12, marginTop: 5 },
  aiDisclaimer: { color: '#65738A', fontSize: 12, lineHeight: 18, marginTop: 9 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
  actionButton: { alignItems: 'center', borderRadius: 11, justifyContent: 'center', marginLeft: 8, minHeight: 46, minWidth: 112, paddingHorizontal: 14 },
  approveButton: { backgroundColor: '#167346' },
  rejectButton: { backgroundColor: '#B42318' },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  error: { color: '#B42318', fontSize: 13, lineHeight: 19, marginTop: 12 },
  muted: { color: '#65738A', fontSize: 13, lineHeight: 20, marginTop: 6 },
  center: { alignItems: 'center', backgroundColor: '#F5F7FB', flex: 1, justifyContent: 'center', padding: 24 },
  noticeTitle: { color: '#17243B', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'center', padding: 18 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 18, maxWidth: 440, padding: 19, width: '100%' },
  dialogTitle: { color: '#17243B', fontSize: 17, fontWeight: '800' },
  input: { borderColor: '#DCE3EC', borderRadius: 12, borderWidth: 1, color: '#25354D', marginTop: 12, minHeight: 78, padding: 12 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 46, minWidth: 75, paddingHorizontal: 10 },
  cancelText: { color: '#526074', fontSize: 13, fontWeight: '700' },
});
