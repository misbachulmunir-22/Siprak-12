import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import type { PengajuanIzin, StatusIzin } from '@/types/siprak';
import { subscribeAssistantLeaveRequests } from '@/services/leaveReviewService';

type Filter = 'semua' | StatusIzin;
const filters: { label: string; value: Filter }[] = [
  { label: 'Semua', value: 'semua' },
  { label: 'Menunggu', value: 'menunggu' },
  { label: 'Disetujui', value: 'disetujui' },
  { label: 'Ditolak', value: 'ditolak' },
];
const EMPTY_REQUESTS: PengajuanIzin[] = [];

export default function AssistantLeaveRequestsScreen() {
  const { currentUser } = useSiprakContext();
  const [result, setResult] = useState<{ key: string; requests: PengajuanIzin[]; error: string | null } | null>(null);
  const [filter, setFilter] = useState<Filter>('semua');
  const [retryKey, setRetryKey] = useState(0);
  const subscriptionKey = `${currentUser?.id ?? 'anonymous'}:${retryKey}`;

  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'asisten') {
      return;
    }
    return subscribeAssistantLeaveRequests(currentUser.id, (items) => {
      setResult({ key: subscriptionKey, requests: items, error: null });
    }, (listenerError) => {
      const message = listenerError.message.includes('permission-denied')
        ? 'Akun ini tidak memiliki akses ke pengajuan pada kelas tersebut.'
        : 'Daftar izin gagal dimuat. Periksa koneksi lalu coba lagi.';
      setResult({ key: subscriptionKey, requests: [], error: message });
    });
  }, [currentUser, retryKey, subscriptionKey]);

  const currentResult = result?.key === subscriptionKey ? result : null;
  const requests = currentResult?.requests ?? EMPTY_REQUESTS;
  const loading = currentResult === null;
  const error = currentResult?.error ?? null;

  const visibleRequests = useMemo(
    () => requests.filter((item) => filter === 'semua' || item.status === filter),
    [filter, requests],
  );

  if (!currentUser || currentUser.peran !== 'asisten') {
    return <Notice title="Akses asisten diperlukan" description="Masuk dengan akun asisten yang ditugaskan pada kelas." />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AREA ASISTEN</Text>
        <Text style={styles.title}>Pemeriksaan izin</Text>
        <Text style={styles.subtitle}>AI hanya memberikan prediksi kategori. Keputusan tetap dibuat oleh asisten.</Text>
      </View>
      <View accessibilityRole="tablist" style={styles.filters}>
        {filters.map((item) => {
          const selected = filter === item.value;
          return <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setFilter(item.value)} style={[styles.filter, selected && styles.filterSelected]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text></Pressable>;
        })}
      </View>
      {loading ? <ActivityIndicator color="#315CCB" style={styles.loader} /> : null}
      {error ? <Notice title="Daftar izin belum tersedia" description={error} action="Coba lagi" onAction={() => setRetryKey((key) => key + 1)} /> : null}
      {!loading && !error ? (
        <FlatList
          data={visibleRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LeaveRequestCard item={item} />}
          contentContainerStyle={visibleRequests.length === 0 ? styles.emptyContent : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Notice title={filter === 'semua' ? 'Belum ada pengajuan izin' : 'Tidak ada pengajuan pada status ini'} description="Pengajuan dari praktikan di kelas yang kamu kelola akan muncul di sini." />}
        />
      ) : null}
    </View>
  );
}

function LeaveRequestCard({ item }: { item: PengajuanIzin }) {
  const statusLabel = item.status === 'menunggu' ? 'Menunggu' : item.status === 'disetujui' ? 'Disetujui' : 'Ditolak';
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/izin/${item.id}` as Href)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.name}>Praktikan {shortUid(item.praktikanUid)}</Text>
        <Text style={[styles.status, item.status === 'disetujui' && styles.approved, item.status === 'ditolak' && styles.rejected]}>{statusLabel}</Text>
      </View>
      <Text style={styles.session}>Sesi {item.sesiId}</Text>
      <Text style={styles.reason} numberOfLines={3}>{item.alasan}</Text>
      {item.aiCategory ? <Text style={styles.prediction}>Prediksi AI: {item.aiCategory}</Text> : <Text style={styles.predictionMuted}>Prediksi AI: {aiStatusLabel(item.aiStatus)}</Text>}
      <Text style={styles.openDetails}>Lihat alasan dan tinjau  ›</Text>
    </Pressable>
  );
}

function Notice({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <View style={styles.notice}><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.noticeText}>{description}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.retry}><Text style={styles.retryText}>{action}</Text></Pressable> : null}</View>;
}

function shortUid(uid: string): string {
  return uid.length > 12 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;
}

function aiStatusLabel(status: PengajuanIzin['aiStatus']): string {
  if (status === 'berhasil') return 'hasil belum mencantumkan kategori';
  if (status === 'gagal') return 'klasifikasi gagal';
  if (status === 'tidak_tersedia') return 'belum tersedia';
  return 'sedang diproses';
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F7FB', flex: 1, paddingHorizontal: 18, paddingTop: 18 },
  header: { marginBottom: 15 },
  eyebrow: { color: '#315CCB', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#17243B', fontSize: 25, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#65738A', fontSize: 14, lineHeight: 20, marginTop: 5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  filter: { alignItems: 'center', borderColor: '#DCE3EC', borderRadius: 20, borderWidth: 1, justifyContent: 'center', marginBottom: 7, marginRight: 6, minHeight: 42, paddingHorizontal: 12 },
  filterSelected: { backgroundColor: '#315CCB', borderColor: '#315CCB' },
  filterText: { color: '#526074', fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: '#FFFFFF' },
  loader: { marginTop: 28 },
  list: { paddingBottom: 24 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 26 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 16, borderWidth: 1, marginBottom: 11, padding: 15 },
  pressed: { opacity: 0.8 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: '#17243B', flex: 1, fontSize: 14, fontWeight: '700', marginRight: 8 },
  status: { backgroundColor: '#FFF3D6', borderRadius: 16, color: '#805B00', fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  approved: { backgroundColor: '#DFF5E9', color: '#17643D' },
  rejected: { backgroundColor: '#FDE8E7', color: '#A52820' },
  session: { color: '#65738A', fontSize: 12, marginTop: 8 },
  reason: { color: '#34445C', fontSize: 14, lineHeight: 20, marginTop: 10 },
  prediction: { color: '#315CCB', fontSize: 12, fontWeight: '700', marginTop: 9 },
  predictionMuted: { color: '#65738A', fontSize: 12, marginTop: 9 },
  openDetails: { color: '#315CCB', fontSize: 13, fontWeight: '700', marginTop: 14 },
  notice: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 16, borderWidth: 1, padding: 22 },
  noticeTitle: { color: '#17243B', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  noticeText: { color: '#65738A', fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  retry: { alignItems: 'center', backgroundColor: '#315CCB', borderRadius: 10, justifyContent: 'center', marginTop: 14, minHeight: 44, paddingHorizontal: 18 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
