import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import { useP2Schedules } from '@/hooks/useP2Data';
import type { StatusSesi } from '@/types/siprak';
import EmptyState from '@/components/EmptyState';
import SesiCard from '@/components/SesiCard';

type FilterStatus = 'semua' | StatusSesi;
const filters: { label: string; value: FilterStatus }[] = [
  { label: 'Semua', value: 'semua' }, { label: 'Belum dibuka', value: 'belum_dibuka' },
  { label: 'Dibuka', value: 'dibuka' }, { label: 'Ditutup', value: 'ditutup' },
];

export default function JadwalList() {
  const { currentUser } = useSiprakContext();
  const { sessions, loading, error } = useP2Schedules();
  const [filter, setFilter] = useState<FilterStatus>('semua');
  const visibleSessions = useMemo(() => sessions.filter(s => filter === 'semua' || s.status === filter),
    [sessions, filter]);
  return <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>Jadwal praktikum</Text>
      <Text style={styles.subtitle}>{currentUser?.peran === 'praktikan' ? 'Jadwal kelas yang kamu ikuti' : 'Jadwal kelas yang ditugaskan kepadamu'}</Text>
    </View>
    <View style={styles.filters}>{filters.map(item => {
      const selected = filter === item.value;
      return <Pressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, selected && styles.filterSelected]}>
        <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
      </Pressable>;
    })}</View>
    {loading ? <Text style={styles.message}>Memuat jadwal dari Firestore…</Text> : null}
    {error ? <Text style={styles.error}>Gagal memuat jadwal: {error}</Text> : null}
    <FlatList data={visibleSessions} keyExtractor={item => item.id}
      renderItem={({ item }) => <SesiCard sesi={item} onPress={() => router.push({ pathname: '/sesi/[id]', params: { id: item.id } })} />}
      contentContainerStyle={visibleSessions.length === 0 ? styles.emptyList : styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={!loading ? <EmptyState title="Jadwal belum tersedia" description={error ? 'Periksa koneksi dan konfigurasi akses Firestore, lalu coba lagi.' : 'Belum ada jadwal untuk kelas yang terhubung ke akun ini.'} /> : null}/>
  </View>;
}
const styles = StyleSheet.create({
  container:{backgroundColor:'#F5F7FB',flex:1,paddingHorizontal:18,paddingTop:16},
  header:{marginBottom:16},title:{color:'#17243B',fontSize:24,fontWeight:'800'},
  subtitle:{color:'#65738A',fontSize:14,marginTop:5},filters:{flexDirection:'row',flexWrap:'wrap',marginBottom:14},
  filter:{alignItems:'center',borderColor:'#DCE3EC',borderRadius:20,borderWidth:1,justifyContent:'center',marginBottom:8,marginRight:7,minHeight:42,paddingHorizontal:13},
  filterSelected:{backgroundColor:'#315CCB',borderColor:'#315CCB'},filterText:{color:'#526074',fontSize:12,fontWeight:'600'},
  filterTextSelected:{color:'#FFFFFF'},list:{paddingBottom:24},emptyList:{flexGrow:1,justifyContent:'center',paddingBottom:30},
  message:{color:'#65738A',padding:8},error:{color:'#B42318',padding:8},
});
