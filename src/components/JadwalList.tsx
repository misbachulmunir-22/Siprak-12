import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import type { StatusSesi } from '@/types/siprak';
import EmptyState from '@/components/EmptyState';
import SesiCard from '@/components/SesiCard';

type FilterStatus = 'semua' | StatusSesi;
const filters: { label: string; value: FilterStatus }[] = [
  { label: 'Semua', value: 'semua' },
  { label: 'Belum dibuka', value: 'belum_dibuka' },
  { label: 'Dibuka', value: 'dibuka' },
  { label: 'Ditutup', value: 'ditutup' },
];

export default function JadwalList() {
  const { currentUser, sessions } = useSiprakContext();
  const [filter, setFilter] = useState<FilterStatus>('semua');

  const visibleSessions = useMemo(() => sessions
    .filter((sesi) => currentUser?.peran !== 'praktikan' || !currentUser.kelas || sesi.kelas === currentUser.kelas)
    .filter((sesi) => filter === 'semua' || sesi.status === filter)
    .slice()
    .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`)),
  [currentUser, filter, sessions]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jadwal praktikum</Text>
        <Text style={styles.subtitle}>{currentUser?.peran === 'praktikan' ? 'Jadwal untuk kelasmu' : 'Semua sesi praktikum'}</Text>
      </View>
      <View accessibilityRole="tablist" style={styles.filters}>
        {filters.map((item) => {
          const selected = filter === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.value)}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SesiCard
            sesi={item}
            onPress={() => router.push({ pathname: '/sesi/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={visibleSessions.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={(
          <EmptyState
            title="Jadwal tidak ditemukan"
            description={filter === 'semua' ? 'Belum ada sesi praktikum yang tersedia.' : 'Tidak ada sesi dengan status ini. Coba pilih filter lain.'}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F7FB', flex: 1, paddingHorizontal: 18, paddingTop: 16 },
  header: { marginBottom: 16 },
  title: { color: '#17243B', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#65738A', fontSize: 14, marginTop: 5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  filter: { alignItems: 'center', borderColor: '#DCE3EC', borderRadius: 20, borderWidth: 1, justifyContent: 'center', marginBottom: 8, marginRight: 7, minHeight: 42, paddingHorizontal: 13 },
  filterSelected: { backgroundColor: '#315CCB', borderColor: '#315CCB' },
  filterText: { color: '#526074', fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: '#FFFFFF' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 30 },
});
