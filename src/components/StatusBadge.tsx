import { StyleSheet, Text, View } from 'react-native';
import type { StatusSesi } from '@/types/siprak';

type StatusBadgeProps = { status: StatusSesi };

const statusPresentation: Record<StatusSesi, { label: string; background: string; text: string }> = {
  belum_dibuka: { label: 'Belum dibuka', background: '#FFF4D6', text: '#825B00' },
  dibuka: { label: 'Dibuka', background: '#DFF5E9', text: '#17643D' },
  ditutup: { label: 'Ditutup', background: '#E9EDF3', text: '#526074' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = statusPresentation[status];

  return (
    <View style={[styles.badge, { backgroundColor: presentation.background }]}>
      <View style={[styles.dot, { backgroundColor: presentation.text }]} />
      <Text style={[styles.label, { color: presentation.text }]}>{presentation.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderRadius: 20, flexDirection: 'row', minHeight: 32, paddingHorizontal: 11 },
  dot: { borderRadius: 4, height: 7, marginRight: 7, width: 7 },
  label: { fontSize: 12, fontWeight: '700' },
});
