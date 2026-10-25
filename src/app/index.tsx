import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import ScreenContainer from '@/components/ScreenContainer';
import { useSiprakContext } from '@/context/SiprakContext';
import { dummyAsisten } from '@/data/dummy';
import { colors, fontSizes, spacing } from '@/theme';
import { Peran } from '@/types/siprak';

export default function LoginScreen() {
  const router = useRouter();
  const { currentUser, praktikanList, login } = useSiprakContext();

  const [selectedRole, setSelectedRole] = useState<Peran>('praktikan');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Arahkan otomatis jika pengguna sudah memiliki sesi login aktif
  useEffect(() => {
    if (currentUser) {
      if (currentUser.peran === 'asisten') {
        router.replace('/asisten');
      } else if (currentUser.peran === 'praktikan') {
        router.replace('/praktikan');
      }
    }
  }, [currentUser, router]);

  // Mengganti peran mereset pilihan identitas
  const handleSelectRole = (role: Peran) => {
    if (role !== selectedRole) {
      setSelectedRole(role);
      setSelectedUserId('');
    }
  };

  const handleLogin = () => {
    if (!selectedUserId) return;
    login(selectedUserId);
    // Navigasi dilakukan oleh useEffect di atas setelah currentUser diperbarui oleh Context
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header Aplikasi */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>S12</Text>
          </View>
          <Text style={styles.appName}>Siprak-12</Text>
          <Text style={styles.tagline}>
            Sistem Informasi Praktikum Laboratorium Komputer
          </Text>
          <Text style={styles.description}>
            Silakan pilih peran dan identitas simulasi untuk memulai demonstrasi
            alur praktikum.
          </Text>
        </View>

        {/* Tab Pemilihan Peran */}
        <View style={styles.roleSelector}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRole === 'praktikan' }}
            style={[
              styles.roleTab,
              selectedRole === 'praktikan' && styles.roleTabActive,
            ]}
            onPress={() => handleSelectRole('praktikan')}>
            <Text
              style={[
                styles.roleTabText,
                selectedRole === 'praktikan' && styles.roleTabTextActive,
              ]}>
              Praktikan
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRole === 'asisten' }}
            style={[
              styles.roleTab,
              selectedRole === 'asisten' && styles.roleTabActive,
            ]}
            onPress={() => handleSelectRole('asisten')}>
            <Text
              style={[
                styles.roleTabText,
                selectedRole === 'asisten' && styles.roleTabTextActive,
              ]}>
              Asisten
            </Text>
          </Pressable>
        </View>

        {/* Pemilihan Identitas Pengguna */}
        <View style={styles.identitySection}>
          <Text style={styles.sectionTitle}>
            Pilih Identitas {selectedRole === 'asisten' ? 'Asisten' : 'Praktikan'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Ketuk salah satu identitas di bawah ini untuk mengaktifkan tombol Masuk.
          </Text>

          {selectedRole === 'asisten' ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                selected: selectedUserId === dummyAsisten.id,
              }}
              style={[
                styles.userCard,
                selectedUserId === dummyAsisten.id && styles.userCardSelected,
              ]}
              onPress={() => setSelectedUserId(dummyAsisten.id)}>
              <View style={styles.userIconCircle}>
                <Text style={styles.userIconText}>A</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{dummyAsisten.nama}</Text>
                <Text style={styles.userDetails}>
                  Asisten Laboratorium Komputer
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedUserId === dummyAsisten.id &&
                    styles.radioButtonSelected,
                ]}
              />
            </Pressable>
          ) : (
            <View style={styles.userList}>
              {praktikanList.map((praktikan) => {
                const isSelected = selectedUserId === praktikan.id;
                return (
                  <Pressable
                    key={praktikan.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.userCard,
                      isSelected && styles.userCardSelected,
                    ]}
                    onPress={() => setSelectedUserId(praktikan.id)}>
                    <View style={styles.userIconCircle}>
                      <Text style={styles.userIconText}>
                        {praktikan.nama.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{praktikan.nama}</Text>
                      <Text style={styles.userDetails}>
                        NIM: {praktikan.nim} • Kelas {praktikan.kelas}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        isSelected && styles.radioButtonSelected,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Tombol Aksi Masuk */}
        <View style={styles.actionSection}>
          <Button
            title="Masuk"
            onPress={handleLogin}
            disabled={!selectedUserId}
          />
        </View>

        {/* Informasi Simulasi */}
        <View style={styles.simulationNotice}>
          <Text style={styles.simulationNoticeText}>
            Catatan: Seluruh data pengguna dan sesi merupakan data simulasi lokal
            dalam memori untuk Sprint 1. Tidak diperlukan kata sandi.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appName: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  roleTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  roleTabText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.muted,
  },
  roleTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  identitySection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  userList: {
    gap: spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 64,
  },
  userCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F6FF',
  },
  userIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userIconText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  userDetails: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginLeft: spacing.sm,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  actionSection: {
    marginTop: spacing.xl,
  },
  simulationNotice: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
  },
  simulationNoticeText: {
    fontSize: fontSizes.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
