import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sesi } from '@/types/siprak';
import StatusBadge from '@/components/StatusBadge';

type SesiCardProps = { sesi: Sesi; onPress: () => void };

function formatTanggal(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export default function SesiCard({ sesi, onPress }: SesiCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sesi.praktikum}, pertemuan ${sesi.pertemuan}, ${sesi.status}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>PERTEMUAN {sesi.pertemuan}</Text>
        <StatusBadge status={sesi.status} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{sesi.praktikum}</Text>
      <Text style={styles.meta}>{sesi.kelas} · {sesi.lab}</Text>
      <View style={styles.footer}>
        <Text style={styles.date}>{formatTanggal(sesi.tanggal)}</Text>
        <Text style={styles.time}>{sesi.jamMulai}–{sesi.jamSelesai}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 16 },
  pressed: { opacity: 0.78 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { color: '#65738A', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: '#17243B', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  meta: { color: '#65738A', fontSize: 13, lineHeight: 19, marginTop: 6 },
  footer: { borderTopColor: '#EEF1F5', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12 },
  date: { color: '#34445C', flexShrink: 1, fontSize: 13, fontWeight: '600' },
  time: { color: '#315CCB', fontSize: 13, fontWeight: '700', marginLeft: 8 },
});
