import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSiprakContext } from '@/context/SiprakContext';
import { subscribeUserAttendances } from '@/services/attendanceWriteService';
import type { Presensi, Sesi, StatusRiwayat } from '@/types/siprak';
import { formatJam, formatTanggal, getStatusRiwayat, urutkanSesi } from '@/utils/presensi';

type RiwayatItem = {
  sesi: Sesi;
  attendance?: Presensi;
  status: StatusRiwayat;
};

const labelStatus = (status: StatusRiwayat): string => {
  switch (status) {
    case 'hadir':
      return 'Hadir';
    case 'belum_hadir':
      return 'Belum hadir';
    case 'belum_dimulai':
      return 'Belum dimulai';
  }
};

/**
 * Layar Riwayat Kehadiran Pribadi Praktikan (Owner: Programmer 4)
 * Menangani:
 * - FR-S2-13: Listener real-time catatan kehadiran praktikan
 * - FR-S2-15: Riwayat kehadiran pribadi & kalkulasi status
 * - FR-S2-21: Indikator memuat, empty state, penanganan error, retry
 * - NFR-S2-07: Area sentuh >= 44dp, bahasa Indonesia
 * - NFR-S2-11: FlatList rapi pada 360-430 dp
 */
export default function RiwayatPraktikanScreen() {
  const { currentUser, sessions, attendances: contextAttendances } = useSiprakContext();

  const [serverAttendances, setServerAttendances] = useState<Presensi[]>([]);
  const [loading, setLoading] = useState<boolean>(() => Boolean(currentUser && currentUser.peran === 'praktikan'));
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pasang listener real-time riwayat presensi praktikan (FR-S2-13 & FR-S2-15)
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') return;

    const unsubscribe = subscribeUserAttendances(
      currentUser.id,
      (records) => {
        setServerAttendances(records);
        setLoading(false);
        setErrorMsg(null);
      },
      (error) => {
        console.warn('Gagal memuat listener riwayat presensi:', error.message);
        setErrorMsg('Gagal menyinkronkan data presensi dari server.');
        setLoading(false);
      }
    );

    return () => {
      // Unsubscribe listener saat layar unmount / logout (FR-S2-13)
      unsubscribe();
    };
  }, [currentUser]);

  // Gabungkan attendance server dengan context attendance sebagai cadangan
  const mergedAttendances = useMemo<Presensi[]>(() => {
    if (!currentUser) return [];

    const map = new Map<string, Presensi>();

    // Masukkan data context dahulu
    contextAttendances
      .filter((a) => a.praktikanUid === currentUser.id || a.praktikanId === currentUser.id)
      .forEach((a) => map.set(a.sesiId, a));

    // Timpa dengan data server terbaru dari Firestore
    serverAttendances.forEach((a) => map.set(a.sesiId, a));

    return Array.from(map.values());
  }, [contextAttendances, currentUser, serverAttendances]);

  const history = useMemo<RiwayatItem[]>(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') return [];

    const attendanceBySession = new Map<string, Presensi>(
      mergedAttendances.map((record): [string, Presensi] => [record.sesiId, record])
    );

    // Filter sesi yang relevan untuk kelas praktikan
    const filteredSessions = sessions.filter(
      (sesi) => !currentUser.kelas || sesi.kelas === currentUser.kelas
    );

    // Tampilkan pertemuan terbaru di urutan teratas
    return urutkanSesi(filteredSessions)
      .reverse()
      .map((sesi) => {
        const att = attendanceBySession.get(sesi.id);
        return {
          sesi,
          attendance: att,
          status: getStatusRiwayat(sesi, att),
        };
      });
  }, [currentUser, mergedAttendances, sessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  if (!currentUser || currentUser.peran !== 'praktikan') {
    return (
      <View style={styles.screen}>
        <Text style={styles.pageTitle}>Riwayat kehadiran</Text>
        <EmptyStateCard
          title="Masuk sebagai praktikan"
          description="Pilih akun praktikan yang terdaftar untuk melihat riwayat kehadiran praktikummu."
        />
      </View>
    );
  }

  const totalHadir = history.filter((item) => item.status === 'hadir').length;
  const totalSelesai = history.filter((item) => item.sesi.status !== 'belum_dibuka').length;
  const persentaseHadir = totalSelesai > 0 ? Math.round((totalHadir / totalSelesai) * 100) : 0;

  return (
    <View style={styles.screen}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#245BDB" />
          <Text style={styles.loadingText}>Memuat riwayat kehadiran...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.sesi.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#245BDB']}
              tintColor="#245BDB"
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.eyebrow}>AREA PRAKTIKAN</Text>
              <Text style={styles.pageTitle}>Riwayat Kehadiran</Text>
              <Text style={styles.intro}>
                Pantau catatan kehadiran resmi dari setiap pertemuan praktikum kelasmu.
              </Text>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Coba muat ulang"
                    onPress={onRefresh}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Muat Ulang</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Kartu Ringkasan Kehadiran */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Text style={styles.summaryIconText}>✓</Text>
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>Total Kehadiran</Text>
                  <Text style={styles.summaryValue}>
                    {totalHadir} <Text style={styles.summaryUnit}>pertemuan</Text>
                  </Text>
                  <Text style={styles.summaryPercentage}>
                    Persentase: {persentaseHadir}% dari sesi berjalan
                  </Text>
                </View>
                <View style={styles.summaryFraction}>
                  <Text style={styles.summaryFractionValue}>
                    {totalHadir}/{history.length}
                  </Text>
                  <Text style={styles.summaryFractionLabel}>hadir</Text>
                </View>
              </View>

              {history.length > 0 && totalHadir === 0 ? (
                <View style={styles.emptyNotice}>
                  <Text style={styles.emptyNoticeTitle}>Belum ada catatan presensi</Text>
                  <Text style={styles.emptyNoticeText}>
                    Kehadiranmu akan tercatat otomatis saat kamu melakukan presensi pada sesi yang sedang dibuka asisten.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Daftar Pertemuan</Text>
            </View>
          }
          renderItem={({ item }) => <RiwayatCard item={item} />}
          ListEmptyComponent={
            <EmptyStateCard
              title="Belum ada jadwal praktikum"
              description="Jadwal praktikum untuk kelasmu belum terdaftar. Hubungi asisten praktikum jika ada kekeliruan kelas."
            />
          }
        />
      )}
    </View>
  );
}

function RiwayatCard({ item }: { item: RiwayatItem }) {
  const label = labelStatus(item.status);
  const statusStyles =
    item.status === 'hadir'
      ? styles.statusHadir
      : item.status === 'belum_dimulai'
        ? styles.statusBelumDimulai
        : styles.statusBelumHadir;
  const statusTextStyles =
    item.status === 'hadir'
      ? styles.statusTextHadir
      : item.status === 'belum_dimulai'
        ? styles.statusTextBelumDimulai
        : styles.statusTextBelumHadir;

  return (
    <View style={styles.historyCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.meetingLabel}>PERTEMUAN {item.sesi.pertemuan}</Text>
          <Text style={styles.sessionTitle}>{item.sesi.praktikum}</Text>
        </View>
        <View style={[styles.statusBadge, statusStyles]}>
          <Text style={[styles.statusBadgeText, statusTextStyles]}>{label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Tanggal</Text>
        <Text style={styles.detailValue}>{formatTanggal(item.sesi.tanggal)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Waktu Sesi</Text>
        <Text style={styles.detailValue}>
          {item.sesi.jamMulai}–{item.sesi.jamSelesai} WIB
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Kelas / Ruangan Lab</Text>
        <Text style={styles.detailValue}>
          Kelas {item.sesi.kelas} · {item.sesi.lab}
        </Text>
      </View>

      {item.attendance ? (
        <View style={styles.attendanceTime}>
          <Text style={styles.attendanceTimeLabel}>Waktu Presensi Resmi:</Text>
          <Text style={styles.attendanceTimeValue}>{formatJam(item.attendance.waktuHadir)} WIB</Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyStateCard({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>i</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { color: '#68778D', fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 36, flexGrow: 1 },
  header: { gap: 8, marginBottom: 12 },
  eyebrow: { color: '#245BDB', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  pageTitle: { color: '#10223D', fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  intro: { color: '#68778D', fontSize: 14, lineHeight: 21, marginBottom: 6 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 13, flex: 1, marginRight: 8 },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  retryText: { color: '#B91C1C', fontWeight: '800', fontSize: 12 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172E56',
    borderRadius: 22,
    padding: 18,
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryIcon: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  summaryCopy: { flex: 1, gap: 2 },
  summaryLabel: { color: '#D5E2F9', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  summaryUnit: { color: '#D5E2F9', fontSize: 12, fontWeight: '600' },
  summaryPercentage: { color: '#93C5FD', fontSize: 11, fontWeight: '700', marginTop: 2 },
  summaryFraction: { alignItems: 'flex-end' },
  summaryFractionValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  summaryFractionLabel: { color: '#D5E2F9', fontSize: 11, marginTop: 2 },
  emptyNotice: {
    borderWidth: 1,
    borderColor: '#FCD9A7',
    backgroundColor: '#FFFAF1',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },
  emptyNoticeTitle: { color: '#92400E', fontSize: 14, fontWeight: '800' },
  emptyNoticeText: { color: '#9A6A2B', fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionTitle: { color: '#10223D', fontSize: 17, fontWeight: '900', marginTop: 8, marginBottom: 4 },
  historyCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8F2',
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dateBlock: { flex: 1, gap: 4 },
  meetingLabel: { color: '#245BDB', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  sessionTitle: { color: '#10223D', fontSize: 15, fontWeight: '800', lineHeight: 21 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  statusHadir: { backgroundColor: '#DCFCE7' },
  statusTextHadir: { color: '#166534' },
  statusBelumDimulai: { backgroundColor: '#E2E8F0' },
  statusTextBelumDimulai: { color: '#475569' },
  statusBelumHadir: { backgroundColor: '#FEF3C7' },
  statusTextBelumHadir: { color: '#92400E' },
  divider: { height: 1, backgroundColor: '#EDF1F6', marginVertical: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 3,
  },
  detailLabel: { color: '#7A8799', fontSize: 12 },
  detailValue: {
    color: '#34445C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  attendanceTime: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  attendanceTimeLabel: { color: '#166534', fontSize: 11, flex: 1 },
  attendanceTimeValue: { color: '#166534', fontSize: 12, fontWeight: '900' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F2',
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconText: { color: '#245BDB', fontSize: 22, fontWeight: '900' },
  emptyTitle: { color: '#10223D', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: {
    color: '#68778D',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
});
