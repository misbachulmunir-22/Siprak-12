import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * Placeholder Layar Jadwal Praktikan
 * Area tanggung jawab: Programmer 2 / Harits
 * (Jadwal, JadwalList, SesiCard, SesiInfoCard, StatusBadge, EmptyState)
 */
export default function PraktikanJadwalScreen() {
  const router = useRouter();
  const { currentUser, sessions } = useSiprakContext();

  // Filter sesi sesuai kelas praktikan
  const userClassSessions = sessions.filter(
    (s) => s.kelas === currentUser?.kelas
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Modul Programmer 2 (Harits)</Text>
          </View>
          <Text style={styles.title}>Jadwal Praktikum Kelas {currentUser?.kelas}</Text>
          <Text style={styles.description}>
            Halaman ini adalah placeholder integrasi untuk jadwal praktikan.
            Menampilkan sesi praktikum untuk kelas Anda dan aksi presensi.
          </Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Sesi Kelas Anda:</Text>
            <Text style={styles.statusValue}>{userClassSessions.length} Sesi</Text>
          </View>

          <View style={styles.linksSection}>
            <Text style={styles.linksTitle}>Uji Navigasi Rute Detail Sesi:</Text>
            {userClassSessions.map((sesi) => (
              <View key={sesi.id} style={styles.linkItem}>
                <Button
                  title={`Detail Pertemuan ${sesi.pertemuan} (${sesi.status})`}
                  variant="secondary"
                  onPress={() => {
                    router.push({
                      pathname: '/sesi/[id]',
                      params: { id: sesi.id },
                    });
                  }}
                />
              </View>
            ))}
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
  linksSection: {
    gap: spacing.sm,
  },
  linksTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  linkItem: {
    marginBottom: spacing.xs,
  },
});
