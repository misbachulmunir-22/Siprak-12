import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { formatAuthError } from '@/services/authService';
import { userService } from '@/services/userService';
import { colors, fontSizes, spacing } from '@/theme';

export default function ProfileView() {
  const router = useRouter();
  const {
    currentUser,
    authStatus,
    authError,
    refreshProfile,
    logout,
  } = useSiprakContext();

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNama, setEditNama] = useState('');
  const [editNim, setEditNim] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (authStatus === 'initializing') {
    return (
      <ScreenContainer>
        <LoadingState
          title="Memuat Profil Pengguna..."
          description="Mengambil dokumen users/{uid} dari Cloud Firestore."
        />
      </ScreenContainer>
    );
  }

  if (authStatus === 'profile-error') {
    return (
      <ScreenContainer>
        <ErrorState
          title="Gagal Memuat Profil"
          message={
            authError ||
            'Tidak dapat membaca data profil dari Cloud Firestore.'
          }
          onRetry={() => {
            void refreshProfile();
          }}
        />
      </ScreenContainer>
    );
  }

  if (!currentUser) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Profil Tidak Ditemukan"
          description="Sesi login tidak aktif atau dokumen profil belum tersedia di Firestore."
        />
        <View style={styles.emptyActionBox}>
          <Button
            title="Kembali ke Halaman Masuk"
            onPress={() => router.replace('/')}
          />
        </View>
      </ScreenContainer>
    );
  }

  const isAsisten = currentUser.peran === 'asisten';
  const roleLabel = isAsisten ? 'Asisten Laboratorium' : 'Praktikan';

  const handleStartEdit = () => {
    setEditNama(currentUser.nama);
    setEditNim(currentUser.nim ?? '');
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setSaveError(null);
    setSaveSuccess(null);

    if (editNama.trim().length < 3) {
      setSaveError('Nama lengkap minimal terdiri dari 3 karakter.');
      return;
    }

    setSaving(true);
    try {
      await userService.updateOwnProfile(currentUser.id, {
        nama: editNama,
        ...(isAsisten ? {} : { nim: editNim }),
      });
      setIsEditing(false);
      setSaveSuccess('Profil berhasil diperbarui di Cloud Firestore.');
    } catch (err) {
      setSaveError(formatAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmLogout = async () => {
    setModalVisible(false);
    await logout();
    router.replace('/');
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {currentUser.nama.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{currentUser.nama}</Text>
          <Text style={styles.emailText}>{currentUser.email}</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{roleLabel}</Text>
          </View>

          <View style={styles.infoDivider} />

          {saveSuccess ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{saveSuccess}</Text>
            </View>
          ) : null}

          {saveError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{saveError}</Text>
            </View>
          ) : null}

          {isEditing ? (
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Ubah Profil Akun</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap</Text>
                <TextInput
                  accessibilityLabel="Nama Lengkap"
                  style={styles.textInput}
                  value={editNama}
                  editable={!saving}
                  onChangeText={setEditNama}
                />
              </View>

              {!isAsisten ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NIM</Text>
                  <TextInput
                    accessibilityLabel="NIM"
                    style={styles.textInput}
                    keyboardType="number-pad"
                    value={editNim}
                    editable={!saving}
                    onChangeText={setEditNim}
                  />
                </View>
              ) : null}

              <View style={styles.editActionRow}>
                <View style={styles.editBtnCol}>
                  <Button
                    title="Batal"
                    variant="secondary"
                    disabled={saving}
                    onPress={() => {
                      setIsEditing(false);
                      setSaveError(null);
                    }}
                  />
                </View>
                <View style={styles.editBtnCol}>
                  <Button
                    title={saving ? 'Menyimpan...' : 'Simpan'}
                    disabled={saving}
                    onPress={() => {
                      void handleSaveProfile();
                    }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Firebase Auth UID</Text>
                <Text style={styles.infoValue}>{currentUser.id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email Terdaftar</Text>
                <Text style={styles.infoValue}>{currentUser.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Peran Otorisasi</Text>
                <Text style={styles.infoValue}>{roleLabel}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status Akun</Text>
                <Text style={styles.infoValueActive}>
                  {currentUser.aktif ? 'Aktif' : 'Nonaktif'}
                </Text>
              </View>

              {!isAsisten && currentUser.nim ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>NIM</Text>
                  <Text style={styles.infoValue}>{currentUser.nim}</Text>
                </View>
              ) : null}

              {currentUser.kelasIds && currentUser.kelasIds.length > 0 ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {isAsisten ? 'Kelas Ditugaskan' : 'Keanggotaan Kelas'}
                  </Text>
                  <Text style={styles.infoValue}>
                    {currentUser.kelasIds.join(', ').toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.securityNotice}>
            <Text style={styles.securityTitle}>
              Keamanan Profil & Otorisasi Firestore
            </Text>
            <Text style={styles.securityText}>
              Data profil dan peran pengguna diambil secara real-time dari
              dokumen Cloud Firestore (users/{currentUser.id}). Peran akun
              dikunci oleh Firebase Security Rules dan tidak dapat dimodifikasi
              dari sisi klien.
            </Text>
          </View>

          <View style={styles.actionContainer}>
            {!isEditing ? (
              <Button
                title="Ubah Nama / Identitas"
                variant="secondary"
                onPress={handleStartEdit}
              />
            ) : null}
            <Button
              title="Keluar (Logout)"
              variant="danger"
              onPress={() => setModalVisible(true)}
            />
          </View>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        title="Konfirmasi Keluar Akun"
        message="Apakah Anda yakin ingin keluar dari sesi Firebase Authentication? Seluruh listener aktif pada perangkat ini akan dihentikan."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        destructive
        onConfirm={() => {
          void handleConfirmLogout();
        }}
        onCancel={() => setModalVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  emptyActionBox: {
    marginTop: spacing.lg,
  },
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
  emailText: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.sm,
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
  successBanner: {
    width: '100%',
    backgroundColor: colors.successLight,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successBannerText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
  },
  errorBanner: {
    width: '100%',
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
  infoSection: {
    width: '100%',
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  infoValue: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  infoValueActive: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.success,
  },
  editSection: {
    width: '100%',
    gap: spacing.md,
  },
  editSectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  textInput: {
    minHeight: 46,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editBtnCol: {
    flex: 1,
  },
  securityNotice: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  securityTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  securityText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionContainer: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
