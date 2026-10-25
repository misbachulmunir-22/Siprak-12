import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * Placeholder Layar Riwayat Praktikan
 * Area tanggung jawab: Programmer 4 / Najib
 * (PraktikanPresensiAction, PresensiSuccessSheet, riwayat)
 */
export default function PraktikanRiwayatScreen() {
  const { currentUser, getUserAttendance, sessions } = useSiprakContext();

  const userAttendances = currentUser
    ? getUserAttendance(currentUser.id)
    : [];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Modul Programmer 4 (Najib)</Text>
          </View>
          <Text style={styles.title}>Riwayat Presensi Praktikan</Text>
          <Text style={styles.description}>
            Halaman ini adalah placeholder integrasi untuk riwayat kehadiran.
            Menampilkan riwayat presensi praktikan dari SiprakContext.
          </Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Total Presensi Anda:</Text>
            <Text style={styles.statusValue}>
              {userAttendances.length} Kehadiran
            </Text>
          </View>

          {userAttendances.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Belum Ada Riwayat Presensi</Text>
              <Text style={styles.emptyText}>
                Anda belum melakukan presensi pada sesi mana pun. Buka tab Jadwal
                dan pilih sesi yang berstatus &quot;Dibuka&quot; untuk melakukan presensi.
              </Text>
            </View>
          ) : (
            <View style={styles.attendanceList}>
              <Text style={styles.listTitle}>Catatan Presensi Terdata:</Text>
              {userAttendances.map((att) => {
                const sesi = sessions.find((s) => s.id === att.sesiId);
                return (
                  <View key={att.id} style={styles.attendanceItem}>
                    <Text style={styles.sessionName}>
                      {sesi?.praktikum ?? 'Sesi Praktikum'} - Pertemuan{' '}
                      {sesi?.pertemuan ?? '?'}
                    </Text>
                    <Text style={styles.timeText}>
                      Waktu Hadir:{' '}
                      {new Date(att.waktuHadir).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.idText}>ID: {att.id}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.warning,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  statusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  statusLabel: {
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  statusValue: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  attendanceList: {
    gap: spacing.sm,
  },
  listTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  attendanceItem: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  sessionName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  timeText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  idText: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
});
