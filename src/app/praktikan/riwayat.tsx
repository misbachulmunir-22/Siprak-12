import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useSiprakContext } from '@/context/SiprakContext';
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

export default function RiwayatPraktikanScreen() {
  const { currentUser, sessions, attendances } = useSiprakContext();

  const history = useMemo<RiwayatItem[]>(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') return [];

    const attendanceBySession = new Map<string, Presensi>(
      attendances
        .filter((record) => record.praktikanId === currentUser.id)
        .map((record): [string, Presensi] => [record.sesiId, record]),
    );

    // Riwayat menampilkan pertemuan terbaru di bagian atas.
    return urutkanSesi(
      sessions.filter((sesi) => !currentUser.kelas || sesi.kelas === currentUser.kelas),
    )
      .reverse()
      .map((sesi) => {
        const attendance = attendanceBySession.get(sesi.id);
        return {
          sesi,
          attendance,
          status: getStatusRiwayat(sesi, attendance),
        };
      });
  }, [attendances, currentUser, sessions]);

  if (!currentUser || currentUser.peran !== 'praktikan') {
    return (
      <View style={styles.screen}>
        <Text style={styles.pageTitle}>Riwayat kehadiran</Text>
        <EmptyState
          title="Masuk sebagai praktikan"
          description="Pilih identitas praktikan untuk melihat catatan kehadiranmu."
        />
      </View>
    );
  }

  const totalHadir = history.filter((item) => item.status === 'hadir').length;
  const noAttendance = !attendances.some((record) => record.praktikanId === currentUser.id);

  return (
    <View style={styles.screen}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.sesi.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>AREA PRAKTIKAN</Text>
            <Text style={styles.pageTitle}>Riwayat kehadiran</Text>
            <Text style={styles.intro}>
              Pantau catatan presensi dari setiap pertemuan praktikum kelasmu.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>✓</Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryLabel}>Total kehadiran</Text>
                <Text style={styles.summaryValue}>
                  {totalHadir} <Text style={styles.summaryUnit}>pertemuan</Text>
                </Text>
              </View>
              <View style={styles.summaryFraction}>
                <Text style={styles.summaryFractionValue}>{totalHadir}/{history.length}</Text>
                <Text style={styles.summaryFractionLabel}>hadir</Text>
              </View>
            </View>

            {noAttendance ? (
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyNoticeTitle}>Belum ada catatan kehadiran</Text>
                <Text style={styles.emptyNoticeText}>
                  Riwayat akan terisi setelah kamu melakukan presensi pada sesi yang dibuka.
                </Text>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>Daftar pertemuan</Text>
          </View>
        }
        renderItem={({ item }) => <RiwayatCard item={item} />}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada jadwal praktikum"
            description="Jadwal untuk kelasmu belum tersedia. Coba periksa kembali nanti."
          />
        }
      />
    </View>
  );
}

function RiwayatCard({ item }: { item: RiwayatItem }) {
  const label = labelStatus(item.status);
  const statusStyles = item.status === 'hadir'
    ? styles.statusHadir
    : item.status === 'belum_dimulai'
      ? styles.statusBelumDimulai
      : styles.statusBelumHadir;
  const statusTextStyles = item.status === 'hadir'
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
        <Text style={styles.detailLabel}>Waktu sesi</Text>
        <Text style={styles.detailValue}>{item.sesi.jamMulai}–{item.sesi.jamSelesai}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Kelas / Lab</Text>
        <Text style={styles.detailValue}>{item.sesi.kelas} · {item.sesi.lab}</Text>
      </View>
      {item.attendance ? (
        <View style={styles.attendanceTime}>
          <Text style={styles.attendanceTimeLabel}>Waktu presensi tercatat</Text>
          <Text style={styles.attendanceTimeValue}>{formatJam(item.attendance.waktuHadir)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
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
  listContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 36, flexGrow: 1 },
  header: { gap: 8, marginBottom: 12 },
  eyebrow: { color: '#245BDB', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  pageTitle: { color: '#10223D', fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  intro: { color: '#68778D', fontSize: 14, lineHeight: 21, marginBottom: 8 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#172E56',
    borderRadius: 22, padding: 18, gap: 12, marginTop: 4, marginBottom: 8,
  },
  summaryIcon: {
    height: 46, width: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryIconText: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  summaryCopy: { flex: 1, gap: 3 },
  summaryLabel: { color: '#D5E2F9', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  summaryUnit: { color: '#D5E2F9', fontSize: 12, fontWeight: '600' },
  summaryFraction: { alignItems: 'flex-end' },
  summaryFractionValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  summaryFractionLabel: { color: '#D5E2F9', fontSize: 11, marginTop: 2 },
  emptyNotice: {
    borderWidth: 1, borderColor: '#FCD9A7', backgroundColor: '#FFFAF1',
    borderRadius: 15, padding: 14, marginBottom: 10,
  },
  emptyNoticeTitle: { color: '#92400E', fontSize: 14, fontWeight: '800' },
  emptyNoticeText: { color: '#9A6A2B', fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionTitle: { color: '#10223D', fontSize: 17, fontWeight: '900', marginTop: 8, marginBottom: 4 },
  historyCard: {
    borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E1E8F2', padding: 16, marginBottom: 12,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dateBlock: { flex: 1, gap: 4 },
  meetingLabel: { color: '#245BDB', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  sessionTitle: { color: '#10223D', fontSize: 15, fontWeight: '800', lineHeight: 21 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  statusHadir: { backgroundColor: '#DCFCE7' },
  statusTextHadir: { color: '#166534' },
  statusBelumDimulai: { backgroundColor: '#E2E8F0' },
  statusTextBelumDimulai: { color: '#475569' },
  statusBelumHadir: { backgroundColor: '#FEF3C7' },
  statusTextBelumHadir: { color: '#92400E' },
  divider: { height: 1, backgroundColor: '#EDF1F6', marginVertical: 13 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 12, marginVertical: 4,
  },
  detailLabel: { color: '#7A8799', fontSize: 12 },
  detailValue: { color: '#34445C', fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  attendanceTime: {
    backgroundColor: '#F0FDF4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  attendanceTimeLabel: { color: '#166534', fontSize: 11, flex: 1 },
  attendanceTimeValue: { color: '#166534', fontSize: 12, fontWeight: '900' },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderColor: '#E1E8F2', borderWidth: 1,
    borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 4,
  },
  emptyIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EAF1FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyIconText: { color: '#245BDB', fontSize: 20, fontWeight: '900' },
  emptyTitle: { color: '#10223D', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: '#68778D', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
});
