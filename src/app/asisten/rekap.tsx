import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import type { Sesi } from '@/types/siprak';
import { subscribeAssistantSessions } from '@/services/sessionService';
import { subscribeSessionAttendance, type AttendanceRosterItem } from '@/services/attendanceReadService';

export default function RekapTabScreen() {
  const { currentUser } = useSiprakContext();
  const [result, setResult] = useState<{ key: string; sessions: Sesi[]; error: string | null } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const subscriptionKey = `${currentUser?.id ?? 'anonymous'}:${retryKey}`;

  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'asisten') {
      return;
    }
    return subscribeAssistantSessions(currentUser.id, (items) => {
      setResult({ key: subscriptionKey, sessions: items, error: null });
    }, (listenerError) => {
      const message = listenerError.message.includes('permission-denied')
        ? 'Akun ini tidak memiliki akses ke rekap kelas.'
        : 'Rekap gagal dimuat. Periksa koneksi lalu coba lagi.';
      setResult({ key: subscriptionKey, sessions: [], error: message });
    });
  }, [currentUser, retryKey, subscriptionKey]);

  if (!currentUser || currentUser.peran !== 'asisten') {
    return <Notice title="Akses asisten diperlukan" description="Masuk menggunakan akun asisten untuk melihat rekap kelas." />;
  }

  const currentResult = result?.key === subscriptionKey ? result : null;
  const sessions = currentResult?.sessions ?? [];
  const loading = currentResult === null;
  const error = currentResult?.error ?? null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AREA ASISTEN</Text>
        <Text style={styles.title}>Rekap kehadiran</Text>
        <Text style={styles.subtitle}>Ringkasan sesi dari kelas yang ditugaskan kepadamu.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/asisten/izin' as Href)} style={styles.reviewButton}>
          <Text style={styles.reviewButtonText}>Periksa pengajuan izin</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Memuat rekap" color="#315CCB" style={styles.loader} /> : null}
      {error ? <Notice title="Rekap belum tersedia" description={error} action="Coba lagi" onAction={() => setRetryKey((key) => key + 1)} /> : null}
      {!loading && !error ? (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionSummaryCard session={item} />}
          contentContainerStyle={sessions.length === 0 ? styles.emptyContent : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Notice title="Belum ada sesi" description="Sesi untuk kelas yang menjadi tugasmu akan tampil di sini." />}
        />
      ) : null}
    </View>
  );
}

function SessionSummaryCard({ session }: { session: Sesi }) {
  const [result, setResult] = useState<{ key: string; roster: AttendanceRosterItem[]; error: boolean } | null>(null);
  const listenerKey = `${session.id}:${session.classId ?? ''}`;

  useEffect(() => {
    if (!session.classId) {
      return;
    }
    return subscribeSessionAttendance(session.id, session.classId, (items) => {
      setResult({ key: listenerKey, roster: items, error: false });
    }, () => {
      setResult({ key: listenerKey, roster: [], error: true });
    });
  }, [listenerKey, session.classId, session.id]);

  const missingClass = !session.classId;
  const currentResult = result?.key === listenerKey ? result : null;
  const roster = currentResult?.roster ?? [];
  const loading = !missingClass && currentResult === null;
  const error = currentResult?.error ?? false;
  const attended = roster.filter((item) => item.presensi).length;
  const statusLabel = session.status === 'dibuka' ? 'Dibuka' : session.status === 'ditutup' ? 'Ditutup' : 'Belum dibuka';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/rekap/${session.id}` as Href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.meeting}>Pertemuan {session.pertemuan}</Text>
        <Text style={[styles.badge, session.status === 'dibuka' && styles.badgeOpen, session.status === 'ditutup' && styles.badgeClosed]}>{statusLabel}</Text>
      </View>
      <Text style={styles.sessionTitle}>{session.praktikum}</Text>
      <Text style={styles.meta}>{session.kelas} · {session.lab}</Text>
      <Text style={styles.meta}>{session.tanggal} · {session.jamMulai}–{session.jamSelesai}</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>{missingClass ? 'Data kelas sesi belum tersedia.' : loading ? 'Memuat jumlah kehadiran…' : error ? 'Rekap tidak dapat dimuat. Buka detail untuk mencoba kembali.' : `${attended} dari ${roster.length} hadir`}</Text>
        {!missingClass && !loading && !error && roster.length > 0 ? <View style={styles.track}><View style={[styles.progress, { width: `${Math.min(100, Math.round((attended / roster.length) * 100))}%` }]} /></View> : null}
      </View>
      <Text style={styles.link}>Buka detail rekap  ›</Text>
    </Pressable>
  );
}

function Notice({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{description}</Text>
      {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.retry}><Text style={styles.retryText}>{action}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F7FB', flex: 1, paddingHorizontal: 18, paddingTop: 18 },
  header: { marginBottom: 18 },
  eyebrow: { color: '#315CCB', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#17243B', fontSize: 25, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#65738A', fontSize: 14, lineHeight: 20, marginTop: 5 },
  reviewButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EEF3FF', borderRadius: 10, justifyContent: 'center', marginTop: 12, minHeight: 44, paddingHorizontal: 14 },
  reviewButtonText: { color: '#315CCB', fontSize: 13, fontWeight: '700' },
  list: { paddingBottom: 28 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 30 },
  loader: { marginTop: 32 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 16 },
  pressed: { opacity: 0.8 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meeting: { color: '#526074', fontSize: 12, fontWeight: '700' },
  badge: { backgroundColor: '#FFF3D6', borderRadius: 16, color: '#805B00', fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  badgeOpen: { backgroundColor: '#DFF5E9', color: '#17643D' },
  badgeClosed: { backgroundColor: '#E9EDF3', color: '#526074' },
  sessionTitle: { color: '#17243B', fontSize: 16, fontWeight: '700', lineHeight: 22, marginTop: 12 },
  meta: { color: '#65738A', fontSize: 13, lineHeight: 19, marginTop: 5 },
  summary: { borderTopColor: '#EEF1F5', borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  summaryText: { color: '#25354D', fontSize: 14, fontWeight: '700' },
  track: { backgroundColor: '#E9EEF7', borderRadius: 4, height: 6, marginTop: 9, overflow: 'hidden' },
  progress: { backgroundColor: '#315CCB', borderRadius: 4, height: 6 },
  link: { color: '#315CCB', fontSize: 13, fontWeight: '700', marginTop: 14 },
  notice: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 16, borderWidth: 1, padding: 22 },
  noticeTitle: { color: '#17243B', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  noticeText: { color: '#65738A', fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  retry: { alignItems: 'center', backgroundColor: '#315CCB', borderRadius: 10, justifyContent: 'center', marginTop: 14, minHeight: 44, paddingHorizontal: 18 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
