import { StyleSheet, Text, View } from 'react-native';
import type { Sesi } from '@/types/siprak';
import StatusBadge from '@/components/StatusBadge';

type SesiInfoCardProps = { sesi: Sesi };

function formatTanggal(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function formatWaktu(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function SesiInfoCard({ sesi }: SesiInfoCardProps) {
  const openedAt = formatWaktu(sesi.dibukaPada);
  const closedAt = formatWaktu(sesi.ditutupPada);

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>PERTEMUAN {sesi.pertemuan}</Text>
        <StatusBadge status={sesi.status} />
      </View>
      <Text style={styles.title}>{sesi.praktikum}</Text>
      <View style={styles.divider} />
      <InfoRow label="Kelas" value={sesi.kelas} />
      <InfoRow label="Laboratorium" value={sesi.lab} />
      <InfoRow label="Jadwal" value={`${formatTanggal(sesi.tanggal)} · ${sesi.jamMulai}–${sesi.jamSelesai}`} />
      {openedAt ? <InfoRow label="Waktu dibuka" value={openedAt} /> : null}
      {closedAt ? <InfoRow label="Waktu ditutup" value={closedAt} /> : null}
      {sesi.catatanPenutup ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>Catatan penutup</Text>
          <Text style={styles.noteText}>{sesi.catatanPenutup}</Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: 20, borderWidth: 1, padding: 18 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#65738A', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: '#17243B', fontSize: 20, fontWeight: '700', lineHeight: 27, marginTop: 14 },
  divider: { backgroundColor: '#EEF1F5', height: 1, marginVertical: 16 },
  infoRow: { marginBottom: 13 },
  label: { color: '#65738A', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  value: { color: '#25354D', fontSize: 14, lineHeight: 20 },
  note: { backgroundColor: '#F7F9FC', borderRadius: 12, marginTop: 2, padding: 13 },
  noteLabel: { color: '#34445C', fontSize: 12, fontWeight: '700', marginBottom: 5 },
  noteText: { color: '#526074', fontSize: 14, lineHeight: 21 },
});
