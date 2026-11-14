import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { colors, fontSizes, spacing } from '@/theme';

export default function ProfileView() {
  const router = useRouter();
  const { currentUser, logout } = useSiprakContext();
  const [modalVisible, setModalVisible] = useState(false);

  if (!currentUser) {
    return null;
  }

  const handleConfirmLogout = () => {
    setModalVisible(false);
    logout();
    router.replace('/');
  };

  const isAsisten = currentUser.peran === 'asisten';
  const roleLabel = isAsisten ? 'Asisten Laboratorium' : 'Praktikan';

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {currentUser.nama.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{currentUser.nama}</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{roleLabel}</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID Pengguna</Text>
            <Text style={styles.infoValue}>{currentUser.id}</Text>
          </View>

          {!isAsisten && currentUser.nim ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NIM</Text>
              <Text style={styles.infoValue}>{currentUser.nim}</Text>
            </View>
          ) : null}

          {!isAsisten && currentUser.kelas ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kelas Praktikum</Text>
              <Text style={styles.infoValue}>Kelas {currentUser.kelas}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.simulationNotice}>
          <Text style={styles.simulationTitle}>Informasi Data Simulasi</Text>
          <Text style={styles.simulationText}>
            Aplikasi Siprak-12 Sprint 1 berjalan dalam mode in-memory lokal tanpa
            database backend. Pergantian peran tidak akan mereset data sesi atau
            presensi yang sudah dibuat.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <Button
            title="Ganti Peran"
            variant="secondary"
            onPress={() => setModalVisible(true)}
          />
        </View>
      </View>

      <ConfirmModal
        visible={modalVisible}
        title="Konfirmasi Ganti Peran"
        message="Apakah Anda yakin ingin keluar dan mengganti peran? Data sesi dan presensi akan tetap tersimpan selama aplikasi masih aktif."
        confirmText="Ya, Ganti Peran"
        cancelText="Batal"
        onConfirm={handleConfirmLogout}
        onCancel={() => setModalVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  infoSection: {
    width: '100%',
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
  },
  simulationNotice: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  simulationTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  simulationText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionContainer: {
    width: '100%',
    marginTop: spacing.xl,
  },
});
