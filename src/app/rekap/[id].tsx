import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import Button from '@/components/Button';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing, statusTokens } from '@/theme';

/**
 * Placeholder Layar Rekap Per Sesi
 * Rute: /rekap/[id]
 * Area tanggung jawab: Programmer 3 / Jeje
 */
export default function RekapDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, sessions, getAttendance, praktikanList } =
    useSiprakContext();

  // Guard: Pengguna belum masuk diarahkan ke /
  if (!currentUser) {
    return <Redirect href="/" />;
  }

  // Guard: Praktikan diarahkan ke halaman praktikan
  if (currentUser.peran !== 'asisten') {
    return <Redirect href="/praktikan" />;
  }

  const sesi = sessions.find((s) => s.id === id);

  // Guard: Sesi tidak ditemukan
  if (!sesi) {
    return (
      <ScreenContainer>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sesi Tidak Ditemukan</Text>
          <Text style={styles.errorText}>
            ID sesi &quot;{id}&quot; tidak valid atau tidak terdaftar di sistem.
          </Text>
          <View style={styles.actionBtn}>
            <Button
              title="Kembali ke Rekap"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const attendances = getAttendance(sesi.id);
  const token = statusTokens[sesi.status];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.badgeContainer}>
            <View style={styles.moduleBadge}>
              <Text style={styles.moduleBadgeText}>
                Modul Programmer 3 (Jeje)
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: token.background },
              ]}>
              <Text style={[styles.statusBadgeText, { color: token.text }]}>
                {token.label}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>Rekap Presensi Sesi</Text>
          <Text style={styles.subtitle}>
            {sesi.praktikum} (Pertemuan ke-{sesi.pertemuan})
          </Text>

          <View style={styles.divider} />

          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{attendances.length}</Text>
              <Text style={styles.summaryLabel}>Hadir</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {praktikanList.length - attendances.length}
              </Text>
              <Text style={styles.summaryLabel}>Belum Hadir</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{praktikanList.length}</Text>
              <Text style={styles.summaryLabel}>Total Praktikan</Text>
            </View>
          </View>

          {attendances.length > 0 ? (
            <View style={styles.listSection}>
              <Text style={styles.sectionHeader}>Daftar Kehadiran:</Text>
              {attendances.map((att) => {
                const praktikan = praktikanList.find(
                  (p) => p.id === att.praktikanId
                );
                return (
                  <View key={att.id} style={styles.attendanceRow}>
                    <View>
                      <Text style={styles.studentName}>
                        {praktikan?.nama ?? att.praktikanId}
                      </Text>
                      <Text style={styles.studentNim}>
                        NIM: {praktikan?.nim ?? '-'}
                      </Text>
                    </View>
                    <Text style={styles.attendedTime}>
                      {new Date(att.waktuHadir).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Belum ada praktikan yang melakukan presensi pada sesi ini.
              </Text>
            </View>
          )}

          <View style={styles.actionSection}>
            <Button
              title="Kembali ke Rekap"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
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
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moduleBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  moduleBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.warning,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: spacing.md,
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  listSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  studentNim: {
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  attendedTime: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.success,
  },
  emptyBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  emptyText: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  actionSection: {
    marginTop: spacing.xl,
  },
  actionBtn: {
    width: '100%',
  },
});
