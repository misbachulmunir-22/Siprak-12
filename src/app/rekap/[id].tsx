import React from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import { RekapItem } from '@/components/RekapItem';

export default function DetailRekapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, attendances, praktikanList } = useSiprakContext();

  const sesi = sessions.find((s) => s.id === id);

  if (!sesi) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Sesi Tidak Ditemukan</Text>
          <Text style={styles.errorSubtitle}>
            Data sesi praktikum yang dicari tidak tersedia atau telah dihapus.
          </Text>
          <TouchableOpacity
            style={styles.btnKembali}
            onPress={() => router.back()}
          >
            <Text style={styles.btnKembaliText}>Kembali ke Halaman Sebelumnya</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isBelumDibuka = sesi.status === 'belum_dibuka';
  const isDibuka = sesi.status === 'dibuka';
  const isDitutup = sesi.status === 'ditutup';

  const sesiAttendances = attendances.filter((a) => a.sesiId === sesi.id);

  // Daftar data praktikan dengan status kehadirannya pada sesi ini
  const rekapData = praktikanList.map((praktikan, index) => {
    const matched = sesiAttendances.find((a) => a.praktikanId === praktikan.id);
    return {
      nomor: index + 1,
      id: praktikan.id,
      nama: praktikan.nama,
      nim: praktikan.nim,
      status: matched ? ('hadir' as const) : ('belum_hadir' as const),
      waktuHadir: matched ? matched.waktuHadir : undefined,
    };
  });

  const totalPraktikan = praktikanList.length;
  const jumlahHadir = sesiAttendances.length;
  const jumlahBelumHadir = Math.max(0, totalPraktikan - jumlahHadir);

  const formatWaktu = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const jam = String(d.getHours()).padStart(2, '0');
      const menit = String(d.getMinutes()).padStart(2, '0');
      return `${jam}:${menit} WIB`;
    } catch {
      return isoString;
    }
  };

  const renderHeader = () => (
    <View style={styles.headerComponent}>
      {/* Kartu Ringkasan Sesi */}
      <View style={styles.sesiCard}>
        <View style={styles.sesiCardTop}>
          <View style={styles.pertemuanBadge}>
            <Text style={styles.pertemuanText}>Pertemuan {sesi.pertemuan}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isBelumDibuka && styles.statusBadgeBelum,
              isDibuka && styles.statusBadgeDibuka,
              isDitutup && styles.statusBadgeDitutup,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isBelumDibuka && styles.statusTextBelum,
                isDibuka && styles.statusTextDibuka,
                isDitutup && styles.statusTextDitutup,
              ]}
            >
              {isBelumDibuka ? 'Belum dibuka' : isDibuka ? 'Dibuka' : 'Ditutup'}
            </Text>
          </View>
        </View>

        <Text style={styles.praktikumTitle}>{sesi.praktikum}</Text>

        <View style={styles.detailGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Kelas</Text>
            <Text style={styles.detailValue}>{sesi.kelas}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Laboratorium</Text>
            <Text style={styles.detailValue}>{sesi.lab}</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Tanggal Pelaksanaan</Text>
            <Text style={styles.detailValue}>{sesi.tanggal}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Waktu Jadwal</Text>
            <Text style={styles.detailValue}>
              {sesi.jamMulai} - {sesi.jamSelesai} WIB
            </Text>
          </View>
        </View>

        {sesi.dibukaPada || sesi.ditutupPada ? (
          <View style={styles.timelineBox}>
            {sesi.dibukaPada ? (
              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>Dibuka pada:</Text>
                <Text style={styles.timelineValue}>{formatWaktu(sesi.dibukaPada)}</Text>
              </View>
            ) : null}
            {sesi.ditutupPada ? (
              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>Ditutup pada:</Text>
                <Text style={styles.timelineValue}>{formatWaktu(sesi.ditutupPada)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {sesi.catatanPenutup ? (
          <View style={styles.catatanBox}>
            <Text style={styles.catatanLabel}>Catatan Penutup Sesi</Text>
            <Text style={styles.catatanContent}>{sesi.catatanPenutup}</Text>
          </View>
        ) : null}
      </View>

      {/* Ringkasan Angka Kehadiran */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{jumlahHadir}</Text>
          <Text style={styles.statLabel}>Hadir</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statNumberSecondary]}>
            {jumlahBelumHadir}
          </Text>
          <Text style={styles.statLabel}>Belum Hadir</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statNumberTotal]}>
            {totalPraktikan}
          </Text>
          <Text style={styles.statLabel}>Total Mahasiswa</Text>
        </View>
      </View>

      {/* Banner Kondisi Khusus Sesuai Spesifikasi FR-10, FR-12, UT-07 */}
      {isBelumDibuka && (
        <View style={styles.bannerBelumDibuka}>
          <Text style={styles.bannerBelumDibukaTitle}>Sesi belum dibuka</Text>
          <Text style={styles.bannerBelumDibukaDesc}>
            Sesi praktikum ini belum diaktifkan oleh asisten. Mahasiswa belum dapat melakukan presensi kehadiran.
          </Text>
        </View>
      )}

      {!isBelumDibuka && jumlahHadir === 0 && (
        <View style={styles.bannerKosong}>
          <Text style={styles.bannerKosongTitle}>Belum ada praktikan yang hadir</Text>
          <Text style={styles.bannerKosongDesc}>
            Data presensi akan otomatis diperbarui begitu praktikan melakukan presensi mandiri.
          </Text>
        </View>
      )}

      {/* Judul Seksi Daftar Praktikan */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daftar Kehadiran Mahasiswa</Text>
        <Text style={styles.sectionSubtitle}>
          {jumlahHadir} dari {totalPraktikan} hadir
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top Bar Navigasi */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Rekap Pertemuan {sesi.pertemuan}
        </Text>
        <View style={styles.navBarPlaceholder} />
      </View>

      <FlatList
        data={rekapData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RekapItem
            nomor={item.nomor}
            nama={item.nama}
            nim={item.nim}
            status={item.status}
            waktuHadir={item.waktuHadir}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  navBar: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navBarPlaceholder: {
    width: 60,
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  headerComponent: {
    marginBottom: 8,
  },
  sesiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sesiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pertemuanBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pertemuanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeBelum: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  statusBadgeDibuka: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeDitutup: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextBelum: {
    color: '#64748B',
  },
  statusTextDibuka: {
    color: '#059669',
  },
  statusTextDitutup: {
    color: '#DC2626',
  },
  praktikumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timelineBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  timelineValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  catatanBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catatanLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 3,
  },
  catatanContent: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 17,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 2,
  },
  statNumberSecondary: {
    color: '#64748B',
  },
  statNumberTotal: {
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  bannerBelumDibuka: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  bannerBelumDibukaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 3,
  },
  bannerBelumDibukaDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  bannerKosong: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  bannerKosongTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  bannerKosongDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  btnKembali: {
    minHeight: 44,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnKembaliText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});