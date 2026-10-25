import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import Button from '@/components/Button';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing, statusTokens } from '@/theme';

/**
 * Placeholder Layar Detail Sesi
 * Rute: /sesi/[id]
 * Area tanggung jawab: Programmer 2 / Harits
 */
export default function SesiDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, sessions } = useSiprakContext();

  // Guard: Membutuhkan pengguna yang sudah login
  if (!currentUser) {
    return <Redirect href="/" />;
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
              title="Kembali ke Jadwal"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Guard: Untuk praktikan, akses sesi kelas lain harus ditolak
  if (currentUser.peran === 'praktikan' && currentUser.kelas !== sesi.kelas) {
    return (
      <ScreenContainer>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Akses Sesi Ditolak</Text>
          <Text style={styles.errorText}>
            Sesi ini diperuntukkan bagi Kelas {sesi.kelas}, sedangkan Anda
            terdaftar pada Kelas {currentUser.kelas}. Anda tidak diizinkan
            mengakses atau melakukan presensi pada sesi ini.
          </Text>
          <View style={styles.actionBtn}>
            <Button
              title="Kembali ke Jadwal"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const token = statusTokens[sesi.status];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.badgeContainer}>
            <View style={styles.moduleBadge}>
              <Text style={styles.moduleBadgeText}>
                Modul Programmer 2 (Harits)
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: token.background }]}>
              <Text style={[styles.statusBadgeText, { color: token.text }]}>
                {token.label}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{sesi.praktikum}</Text>
          <Text style={styles.subtitle}>Pertemuan ke-{sesi.pertemuan}</Text>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kelas:</Text>
              <Text style={styles.infoValue}>Kelas {sesi.kelas}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Laboratorium:</Text>
              <Text style={styles.infoValue}>{sesi.lab}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal:</Text>
              <Text style={styles.infoValue}>{sesi.tanggal}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Waktu:</Text>
              <Text style={styles.infoValue}>
                {sesi.jamMulai} - {sesi.jamSelesai} WIB
              </Text>
            </View>
            {sesi.dibukaPada ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dibuka Pada:</Text>
                <Text style={styles.infoValue}>
                  {new Date(sesi.dibukaPada).toLocaleTimeString('id-ID')}
                </Text>
              </View>
            ) : null}
            {sesi.ditutupPada ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ditutup Pada:</Text>
                <Text style={styles.infoValue}>
                  {new Date(sesi.ditutupPada).toLocaleTimeString('id-ID')}
                </Text>
              </View>
            ) : null}
            {sesi.catatanPenutup ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Catatan Penutup:</Text>
                <Text style={styles.infoValue}>{sesi.catatanPenutup}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.integrationNotice}>
            <Text style={styles.noticeTitle}>Catatan Integrasi Modul</Text>
            <Text style={styles.noticeText}>
              Komponen aksi sesi (`AsistenSesiActions` dari Programmer 3 atau
              `PraktikanPresensiAction` dari Programmer 4) akan dipasang di sini
              oleh Programmer 2 saat menggabungkan modul.
            </Text>
          </View>

          <View style={styles.actionSection}>
            <Button
              title="Kembali ke Jadwal"
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
  infoGrid: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  infoValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  integrationNotice: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  noticeTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionSection: {
    marginTop: spacing.xl,
  },
  actionBtn: {
    width: '100%',
  },
});
