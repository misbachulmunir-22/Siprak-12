import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * Placeholder Layar Tab Rekap Asisten
 * Area tanggung jawab: Programmer 3 / Jeje
 * (Tab Rekap, RekapItem, AsistenSesiActions, dan rekap per sesi)
 */
export default function AsistenRekapScreen() {
  const router = useRouter();
  const { sessions, getAttendance } = useSiprakContext();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Modul Programmer 3 (Jeje)</Text>
          </View>
          <Text style={styles.title}>Rekap Presensi Sesi</Text>
          <Text style={styles.description}>
            Halaman ini adalah placeholder integrasi untuk tab Rekap Asisten.
            Menampilkan ringkasan kehadiran praktikan untuk seluruh sesi.
          </Text>

          <View style={styles.linksSection}>
            <Text style={styles.linksTitle}>Uji Navigasi Rute Rekap Per Sesi:</Text>
            {sessions.map((sesi) => {
              const count = getAttendance(sesi.id).length;
              return (
                <View key={sesi.id} style={styles.linkItem}>
                  <Button
                    title={`Lihat Rekap: Pertemuan ${sesi.pertemuan} (${count} hadir)`}
                    variant="secondary"
                    onPress={() => {
                      router.push({
                        pathname: '/rekap/[id]',
                        params: { id: sesi.id },
                      });
                    }}
                  />
                </View>
              );
            })}
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
