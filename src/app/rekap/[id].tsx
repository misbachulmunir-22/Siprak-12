import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import type { Sesi } from '@/types/siprak';
import { subscribeSession } from '@/services/sessionService';
import { subscribeSessionAttendance, type AttendanceRosterItem } from '@/services/attendanceReadService';

const EMPTY_ROSTER: AttendanceRosterItem[] = [];

export default function DetailRekapScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { currentUser } = useSiprakContext();
  const [sessionResult, setSessionResult] = useState<{ key: string; session: Sesi | null; error: string | null } | null>(null);
  const [rosterResult, setRosterResult] = useState<{ key: string; roster: AttendanceRosterItem[]; error: string | null } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const sessionKey = `${sessionId ?? ''}:${retryKey}`;

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    return subscribeSession(sessionId, (item) => {
      setSessionResult({ key: sessionKey, session: item, error: item ? null : 'Sesi tidak ditemukan atau kamu tidak memiliki akses ke kelas ini.' });
    }, (error) => {
      const message = error.message.includes('permission-denied')
        ? 'Akun ini tidak berwenang melihat sesi tersebut.'
        : 'Detail sesi gagal dimuat. Periksa koneksi lalu coba lagi.';
      setSessionResult({ key: sessionKey, session: null, error: message });
    });
  }, [sessionId, retryKey, sessionKey]);

  const currentSessionResult = sessionResult?.key === sessionKey ? sessionResult : null;
  const session = currentSessionResult?.session ?? null;
  const sessionLoading = Boolean(sessionId) && currentSessionResult === null;
  const sessionError = currentSessionResult?.error ?? (sessionId ? null : 'ID sesi tidak tersedia. Kembali ke daftar rekap dan pilih sesi.');
  const rosterKey = `${session?.id ?? ''}:${session?.classId ?? ''}:${retryKey}`;

  useEffect(() => {
    if (!session?.classId) {
      return;
    }
    return subscribeSessionAttendance(session.id, session.classId, (items) => {
      setRosterResult({ key: rosterKey, roster: items, error: null });
    }, (error) => {
      const message = error.message.includes('permission-denied')
        ? 'Tidak memiliki akses ke peserta kelas ini.'
        : 'Rekap gagal dimuat. Periksa koneksi lalu coba lagi.';
      setRosterResult({ key: rosterKey, roster: [], error: message });
    });
  }, [rosterKey, retryKey, session?.classId, session?.id]);

  const currentRosterResult = rosterResult?.key === rosterKey ? rosterResult : null;
  const roster = currentRosterResult?.roster ?? EMPTY_ROSTER;
  const rosterLoading = Boolean(session?.classId) && currentRosterResult === null;
  const rosterError = currentRosterResult?.error ?? null;
  const attendedCount = useMemo(() => roster.filter((item) => item.presensi !== null).length, [roster]);

  if (!currentUser || currentUser.peran !== 'asisten') {
    return <Notice title="Akses asisten diperlukan" description="Masuk menggunakan akun asisten yang ditugaskan pada kelas ini." />;
  }

  if (sessionLoading) return <Loading />;
  if (!session) {
    return <Notice title="Sesi tidak tersedia" description={sessionError ?? 'Sesi tidak ditemukan.'} action="Coba lagi" onAction={() => setRetryKey((key) => key + 1)} />;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={roster}
        keyExtractor={(item) => item.uid}
        renderItem={({ item, index }) => <RosterRow item={item} index={index} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  Kembali</Text></Pressable>
            <View style={styles.sessionCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.meeting}>Pertemuan {session.pertemuan}</Text>
                <Text style={[styles.badge, session.status === 'dibuka' && styles.badgeOpen, session.status === 'ditutup' && styles.badgeClosed]}>
                  {session.status === 'dibuka' ? 'Dibuka' : session.status === 'ditutup' ? 'Ditutup' : 'Belum dibuka'}
                </Text>
              </View>
              <Text style={styles.sessionTitle}>{session.praktikum}</Text>
              <Text style={styles.meta}>{session.kelas} · {session.lab}</Text>
              <Text style={styles.meta}>{session.tanggal} · {session.jamMulai}–{session.jamSelesai}</Text>
            </View>
            {session.status === 'belum_dibuka' ? <Notice title="Sesi belum dibuka" description="Rekap kehadiran akan tersedia setelah sesi dibuka." /> : null}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Ringkasan kehadiran</Text>
              <Text style={styles.summaryCount}>{rosterLoading ? 'Memuat data…' : rosterError ? 'Jumlah hadir belum dapat dihitung' : `${attendedCount} dari ${roster.length} hadir`}</Text>
              {rosterError ? <Text style={styles.error}>{rosterError}</Text> : null}
              {rosterError ? <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.retry}><Text style={styles.retryText}>Coba lagi</Text></Pressable> : null}
            </View>
            <Text style={styles.listTitle}>Daftar praktikan</Text>
            {!rosterLoading && !rosterError && roster.length === 0 ? <Notice title="Belum ada peserta aktif" description="Belum ada praktikan yang terdaftar di kelas sesi ini." /> : null}
          </>
        )}
        ListEmptyComponent={rosterLoading ? <ActivityIndicator color="#315CCB" style={styles.loader} /> : undefined}
      />
    </View>
  );
}

function RosterRow({ item, index }: { item: AttendanceRosterItem; index: number }) {
  const present = Boolean(item.presensi);
  return (
    <View style={styles.rosterRow}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{index + 1}</Text></View>
      <View style={styles.person}>
        <Text style={styles.personName}>{item.nama}</Text>
        <Text style={styles.personId}>{item.nim}</Text>
      </View>
      <View style={styles.attendance}>
        <Text style={[styles.attendanceStatus, present ? styles.present : styles.absent]}>{present ? 'Hadir' : 'Belum hadir'}</Text>
        {present ? <Text style={styles.time}>{formatTime(item.presensi?.waktuHadir)}</Text> : null}
      </View>
    </View>
  );
}

function Loading() {
  return <View style={styles.center}><ActivityIndicator color="#315CCB" /><Text style={styles.loadingText}>Memuat detail sesi…</Text></View>;
}

function Notice({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <View style={styles.notice}><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.noticeText}>{description}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.retry}><Text style={styles.retryText}>{action}</Text></Pressable> : null}</View>;
}

function formatTime(value?: string): string {
  if (!value) return 'Waktu tidak tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waktu tidak tersedia';
  return `${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date)} WIB`;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F7FB', flex: 1 },
  listContent: { paddingBottom: 30, paddingHorizontal: 18, paddingTop: 8 },
  back: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingRight: 10 },
  backText: { color: '#315CCB', fontSize: 14, fontWeight: '700' },
  sessionCard: { backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 18, borderWidth: 1, padding: 16 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meeting: { color: '#526074', fontSize: 12, fontWeight: '700' },
  badge: { backgroundColor: '#FFF3D6', borderRadius: 16, color: '#805B00', fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  badgeOpen: { backgroundColor: '#DFF5E9', color: '#17643D' },
  badgeClosed: { backgroundColor: '#E9EDF3', color: '#526074' },
  sessionTitle: { color: '#17243B', fontSize: 18, fontWeight: '800', lineHeight: 25, marginTop: 12 },
  meta: { color: '#65738A', fontSize: 13, lineHeight: 19, marginTop: 5 },
  summary: { backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 16, borderWidth: 1, marginTop: 14, padding: 16 },
  summaryTitle: { color: '#526074', fontSize: 13, fontWeight: '600' },
  summaryCount: { color: '#17243B', fontSize: 23, fontWeight: '800', marginTop: 5 },
  listTitle: { color: '#17243B', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 22 },
  rosterRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 9, minHeight: 76, paddingHorizontal: 13, paddingVertical: 11 },
  avatar: { alignItems: 'center', backgroundColor: '#EEF3FF', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  avatarText: { color: '#315CCB', fontSize: 13, fontWeight: '800' },
  person: { flex: 1, marginLeft: 11 },
  personName: { color: '#17243B', fontSize: 14, fontWeight: '700' },
  personId: { color: '#65738A', fontSize: 12, marginTop: 4 },
  attendance: { alignItems: 'flex-end', marginLeft: 8 },
  attendanceStatus: { fontSize: 12, fontWeight: '700' },
  present: { color: '#167346' },
  absent: { color: '#65738A' },
  time: { color: '#65738A', fontSize: 11, marginTop: 4 },
  notice: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E3E8F0', borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 20 },
  noticeTitle: { color: '#17243B', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  noticeText: { color: '#65738A', fontSize: 13, lineHeight: 20, marginTop: 5, textAlign: 'center' },
  error: { color: '#B42318', fontSize: 13, marginTop: 8 },
  retry: { alignItems: 'center', backgroundColor: '#315CCB', borderRadius: 10, justifyContent: 'center', marginTop: 10, minHeight: 44, paddingHorizontal: 16 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  center: { alignItems: 'center', backgroundColor: '#F5F7FB', flex: 1, justifyContent: 'center' },
  loadingText: { color: '#65738A', fontSize: 14, marginTop: 10 },
  loader: { marginVertical: 22 },
});
