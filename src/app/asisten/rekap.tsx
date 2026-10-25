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
import { router } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import { Sesi } from '@/types/siprak';

export default function RekapTabScreen() {
  const { sessions, attendances, praktikanList } = useSiprakContext();

  const totalPraktikan = praktikanList.length;

  const renderSesiCard = ({ item }: { item: Sesi }) => {
    const hadirCount = attendances.filter((a) => a.sesiId === item.id).length;
    const persentase = totalPraktikan > 0 ? Math.round((hadirCount / totalPraktikan) * 100) : 0;

    const isBelumDibuka = item.status === 'belum_dibuka';
    const isDibuka = item.status === 'dibuka';
    const isDitutup = item.status === 'ditutup';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => {
          router.push({
            pathname: '/rekap/[id]',
            params: { id: item.id },
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.pertemuanBadge}>
            <Text style={styles.pertemuanText}>Pertemuan {item.pertemuan}</Text>
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

        <Text style={styles.praktikumTitle}>{item.praktikum}</Text>

        <View style={styles.infoMetaContainer}>
          <Text style={styles.infoMetaText}>
            {item.kelas} • {item.lab}
          </Text>
          <Text style={styles.infoMetaText}>
            {item.tanggal} • {item.jamMulai} - {item.jamSelesai} WIB
          </Text>
        </View>

        {/* Ringkasan Kehadiran */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryLabel}>Tingkat Kehadiran</Text>
            <Text style={styles.summaryCount}>
              <Text style={styles.highlightCount}>{hadirCount}</Text> dari {totalPraktikan} hadir ({persentase}%)
            </Text>
          </View>

          {/* Progress Bar Minimalis */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${persentase}%` }]} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerActionText}>Buka Detail Rekap Kehadiran</Text>
          <Text style={styles.footerChevron}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Rekapitulasi Kehadiran</Text>
          <Text style={styles.pageSubtitle}>
            Daftar sesi praktikum dan laporan presensi mahasiswa.
          </Text>
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSesiCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Belum Ada Sesi Praktikum</Text>
              <Text style={styles.emptySubtitle}>
                Jadwal sesi praktikum belum terdaftar pada sistem saat ini.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
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
    marginBottom: 6,
  },
  infoMetaContainer: {
    marginBottom: 14,
  },
  infoMetaText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  summaryCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  highlightCount: {
    color: '#0F172A',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F766E',
  },
  footerChevron: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F766E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
