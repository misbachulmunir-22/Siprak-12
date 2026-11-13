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

export default function PraktikanJadwalScreen() {
  const { currentUser } = useSiprakContext();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('semua');

  // FR-S2-09 & FR-S2-13: Real-time listener untuk jadwal kelas tempat praktikan terdaftar aktif
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = scheduleService.subscribeSessionsForPraktikan(
      currentUser.id,
      (updatedSessions) => {
        setSessions(updatedSessions);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Gagal memuat jadwal praktikum Anda.');
        setLoading(false);
      }
    );

    return () => {
      // Lepaskan listener saat layar unmount atau pengguna logout (FR-S2-13)
      unsubscribe();
    };
  }, [currentUser]);

  // Filter sesi berdasarkan status
  const visibleSessions = useMemo(() => {
    return sessions.filter((sesi) => filter === 'semua' || sesi.status === filter);
  }, [sessions, filter]);

  return (
    <View style={styles.container}>
      {/* Header Halaman Jadwal Praktikan */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Halo, {currentUser?.nama || 'Praktikan'} 👋
        </Text>
        <Text style={styles.title}>Jadwal Praktikum</Text>
        <Text style={styles.subtitle}>
          Jadwal sesi untuk kelas praktikum tempat Anda terdaftar aktif
        </Text>
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
          <Text style={styles.loadingText}>Memuat jadwal kelas Anda...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <EmptyState
            title="Gagal Memuat Jadwal"
            description={`${error} Pastikan perangkat terhubung ke internet.`}
          />
          <Button
            title="Coba Lagi"
            variant="secondary"
            onPress={() => {
              if (currentUser) {
                setLoading(true);
                scheduleService
                  .getSessionsForPraktikan(currentUser.id)
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
                  ? sessions.length === 0
                    ? 'Anda belum terdaftar dalam kelas praktikum manapun, atau belum ada jadwal sesi yang aktif.'
                    : 'Belum ada sesi praktikum yang tersedia.'
                  : `Tidak ada sesi praktikum dengan status "${filter}". Coba pilih filter lain.`
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
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
