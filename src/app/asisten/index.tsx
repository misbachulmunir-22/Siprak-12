import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import SesiCard from '@/components/SesiCard';
import { useSiprakContext } from '@/context/SiprakContext';
import { scheduleService, SessionItem } from '@/services/scheduleService';
import { colors, fontSizes, spacing } from '@/theme';
import { StatusSesi } from '@/types/siprak';

type FilterStatus = 'semua' | StatusSesi;

const filters: { label: string; value: FilterStatus }[] = [
  { label: 'Semua', value: 'semua' },
  { label: 'Belum dibuka', value: 'belum_dibuka' },
  { label: 'Dibuka', value: 'dibuka' },
  { label: 'Ditutup', value: 'ditutup' },
];

export default function AsistenIndexScreen() {
  const { currentUser } = useSiprakContext();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('semua');

  // FR-S2-09, FR-S2-13: Real-time subscription untuk sesi kelas asisten yang ditugaskan
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'asisten') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = scheduleService.subscribeSessionsForAssistant(
      currentUser.id,
      (updatedSessions) => {
        setSessions(updatedSessions);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Gagal memuat sesi jadwal praktikum.');
        setLoading(false);
      }
    );

    return () => {
      // Lepas listener saat layar unmount atau akun berubah (FR-S2-13)
      unsubscribe();
    };
  }, [currentUser]);

  // Sesi yang ditampilkan terurut kronologis dan sesuai filter
  const visibleSessions = useMemo(() => {
    return sessions.filter((sesi) => filter === 'semua' || sesi.status === filter);
  }, [sessions, filter]);

  return (
    <View style={styles.container}>
      {/* Header Dashboard Asisten */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Halo, {currentUser?.nama || 'Asisten'} 👋
        </Text>
        <Text style={styles.title}>Dashboard Praktikum</Text>
        <Text style={styles.subtitle}>
          Kelola data kelas, peserta, jadwal, dan pantau sesi praktikum Anda
        </Text>
      </View>

      {/* Quick Action Navigation Buttons (FR-S2-05 s.d FR-S2-08) */}
      <View style={styles.quickActionsContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/asisten/kelas')}
          style={styles.actionCard}>
          <View style={[styles.actionIconBox, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.actionIcon}>🏫</Text>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Kelola Kelas</Text>
            <Text style={styles.actionCardDesc}>CRUD kelas & arsip</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/asisten/peserta')}
          style={styles.actionCard}>
          <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.actionIcon}>👥</Text>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Kelola Peserta</Text>
            <Text style={styles.actionCardDesc}>Pemetaan UID & peserta</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/asisten/jadwal')}
          style={styles.actionCard}>
          <View style={[styles.actionIconBox, { backgroundColor: '#FFFBEB' }]}>
            <Text style={styles.actionIcon}>📅</Text>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Kelola Jadwal</Text>
            <Text style={styles.actionCardDesc}>CRUD jadwal & sesi</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </Pressable>
      </View>

      {/* Bagian Jadwal Sesi */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Sesi Praktikum Ditugaskan</Text>
        <Text style={styles.sectionCountBadge}>{sessions.length} Sesi</Text>
      </View>

      {/* Filter Tabs Status Sesi */}
      <View accessibilityRole="tablist" style={styles.filters}>
        {filters.map((item) => {
          const selected = filter === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.value)}
              style={[styles.filter, selected && styles.filterSelected]}>
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* State Loading, Error, Empty, dan Content (FR-S2-21) */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat jadwal sesi praktikum...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <EmptyState
            title="Gagal Memuat Sesi"
            description={`${error} Pastikan koneksi internet stabil.`}
          />
          <Button
            title="Coba Lagi"
            variant="secondary"
            onPress={() => {
              if (currentUser) {
                setLoading(true);
                scheduleService
                  .getSessionsForAssistant(currentUser.id)
                  .then((res) => {
                    setSessions(res);
                    setError(null);
                  })
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }
            }}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <FlatList
          data={visibleSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SesiCard
              sesi={item}
              onPress={() =>
                router.push({
                  pathname: '/sesi/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
          contentContainerStyle={
            visibleSessions.length === 0 ? styles.emptyList : styles.list
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Jadwal Tidak Ditemukan"
              description={
                filter === 'semua'
                  ? 'Belum ada sesi praktikum pada kelas yang ditugaskan kepada Anda. Buat sesi di Kelola Jadwal.'
                  : `Tidak ada sesi dengan status "${filter}". Coba pilih filter lain.`
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F7FB',
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
  },
  header: {
    marginBottom: 14,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  title: {
    color: '#17243B',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#65738A',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionCardContent: {
    alignItems: 'center',
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  actionCardDesc: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17243B',
  },
  sectionCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filter: {
    alignItems: 'center',
    borderColor: '#DCE3EC',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 6,
    marginRight: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  filterSelected: {
    backgroundColor: '#315CCB',
    borderColor: '#315CCB',
  },
  filterText: {
    color: '#526074',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#65738A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  retryButton: {
    marginTop: 14,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 30,
  },
});
