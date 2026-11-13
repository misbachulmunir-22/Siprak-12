import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { useSiprakContext } from '@/context/SiprakContext';
import { ClassItem, classService } from '@/services/classService';
import { colors, fontSizes, spacing } from '@/theme';

type FilterTab = 'aktif' | 'arsip' | 'semua';

export default function AsistenKelasScreen() {
  const { currentUser } = useSiprakContext();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('aktif');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modal Form State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formNama, setFormNama] = useState<string>('');
  const [formKode, setFormKode] = useState<string>('');
  const [formPraktikum, setFormPraktikum] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Archive Confirm Modal State
  const [archiveModal, setArchiveModal] = useState<{
    visible: boolean;
    classItem: ClassItem | null;
  }>({ visible: false, classItem: null });

  // FR-S2-13: Real-time listener kelas asisten
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'asisten') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = classService.subscribeClassesForAssistant(
      currentUser.id,
      (updatedList) => {
        setClasses(updatedList);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Gagal memuat data kelas.');
        setLoading(false);
      },
      true // Sertakan juga kelas yang diarsipkan agar bisa difilter
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Filter kelas berdasarkan tab
  const filteredClasses = useMemo(() => {
    if (filter === 'aktif') return classes.filter((c) => c.active);
    if (filter === 'arsip') return classes.filter((c) => !c.active);
    return classes;
  }, [classes, filter]);

  // Buka modal untuk tambah kelas
  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormNama('');
    setFormKode('');
    setFormPraktikum('');
    setFormErrors({});
    setModalVisible(true);
  };

  // Buka modal untuk edit kelas
  const handleOpenEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setFormNama(c.nama);
    setFormKode(c.kode);
    setFormPraktikum(c.namaPraktikum);
    setFormErrors({});
    setModalVisible(true);
  };

  // Validasi form (FR-S2-21)
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formNama.trim()) errs.nama = 'Nama kelas wajib diisi.';
    if (!formKode.trim()) errs.kode = 'Kode kelas wajib diisi.';
    if (!formPraktikum.trim()) errs.praktikum = 'Nama praktikum wajib diisi.';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Simpan kelas (Create atau Update) - FR-S2-06
  const handleSaveClass = async () => {
    if (!currentUser) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingClass) {
        await classService.updateClass(
          editingClass.id,
          {
            nama: formNama,
            kode: formKode,
            namaPraktikum: formPraktikum,
          },
          currentUser.id
        );
        showSuccess(`Kelas "${formNama}" berhasil diperbarui.`);
      } else {
        await classService.createClass({
          nama: formNama,
          kode: formKode,
          namaPraktikum: formPraktikum,
          assistantUid: currentUser.id,
        });
        showSuccess(`Kelas baru "${formNama}" berhasil ditambahkan.`);
      }
      setModalVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan kelas.';
      setFormErrors({ general: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Konfirmasi dan eksekusi arsip kelas (FR-S2-06 soft delete)
  const handleConfirmArchive = async () => {
    if (!currentUser || !archiveModal.classItem) return;
    try {
      if (archiveModal.classItem.active) {
        await classService.archiveClass(archiveModal.classItem.id, currentUser.id);
        showSuccess(`Kelas "${archiveModal.classItem.nama}" berhasil diarsipkan.`);
      } else {
        await classService.reactivateClass(archiveModal.classItem.id, currentUser.id);
        showSuccess(`Kelas "${archiveModal.classItem.nama}" berhasil diaktifkan kembali.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status arsip kelas.';
      setError(msg);
    } finally {
      setArchiveModal({ visible: false, classItem: null });
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 3500);
  };

  const renderFilterTab = (key: FilterTab, label: string) => {
    const isSelected = filter === key;
    return (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
        onPress={() => setFilter(key)}
        style={[styles.filterChip, isSelected && styles.filterChipActive]}>
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Dashboard"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Dashboard</Text>
        </Pressable>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Kelola Kelas</Text>
            <Text style={styles.subtitle}>
              Kelas praktikum di bawah kewenangan Anda
            </Text>
          </View>
          <Button
            title="+ Kelas Baru"
            onPress={handleOpenAddModal}
            style={styles.addHeaderButton}
          />
        </View>
      </View>

      {/* Banner Pesan Sukses */}
      {successBanner ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>✓ {successBanner}</Text>
        </View>
      ) : null}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {renderFilterTab('aktif', 'Kelas Aktif')}
        {renderFilterTab('arsip', 'Diarsipkan')}
        {renderFilterTab('semua', 'Semua Kelas')}
      </View>

      {/* Konten Utama */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat daftar kelas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <EmptyState
            title="Gagal Memuat Data"
            description={`${error} Silakan periksa koneksi data Anda.`}
          />
          <Button
            title="Coba Lagi"
            variant="secondary"
            onPress={() => {
              if (currentUser) {
                setLoading(true);
                classService
                  .getClassesForAssistant(currentUser.id, true)
                  .then((res) => {
                    setClasses(res);
                    setError(null);
                  })
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }
            }}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <FlatList
          data={filteredClasses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filteredClasses.length === 0 ? styles.emptyListContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Tidak Ada Kelas"
              description={
                filter === 'aktif'
                  ? 'Belum ada kelas aktif. Tekan tombol "+ Kelas Baru" untuk menambahkan kelas praktikum pertama.'
                  : filter === 'arsip'
                  ? 'Tidak ada kelas yang diarsipkan.'
                  : 'Belum ada data kelas yang tercatat.'
              }
            />
          }
          renderItem={({ item }) => (
            <View style={styles.classCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.classCode}>{item.kode}</Text>
                  <Text style={styles.className}>{item.nama}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    item.active ? styles.statusPillActive : styles.statusPillArchived,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      item.active ? styles.statusPillTextActive : styles.statusPillTextArchived,
                    ]}>
                    {item.active ? 'Aktif' : 'Arsip'}
                  </Text>
                </View>
              </View>

              <Text style={styles.praktikumTitle}>{item.namaPraktikum}</Text>

              {/* Action Buttons Navigasi & Kelola */}
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/asisten/peserta',
                      params: { classId: item.id },
                    })
                  }
                  style={styles.actionChipPrimary}>
                  <Text style={styles.actionChipPrimaryText}>👥 Peserta</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/asisten/jadwal',
                      params: { classId: item.id },
                    })
                  }
                  style={styles.actionChipPrimary}>
                  <Text style={styles.actionChipPrimaryText}>📅 Jadwal</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleOpenEditModal(item)}
                  style={styles.actionChipSecondary}>
                  <Text style={styles.actionChipSecondaryText}>Ubah</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setArchiveModal({ visible: true, classItem: item })}
                  style={
                    item.active ? styles.actionChipDanger : styles.actionChipReactivate
                  }>
                  <Text
                    style={
                      item.active
                        ? styles.actionChipDangerText
                        : styles.actionChipReactivateText
                    }>
                    {item.active ? 'Arsip' : 'Buka Arsip'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Tambah / Edit Kelas (FR-S2-06, FR-S2-21) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingClass ? 'Ubah Data Kelas' : 'Tambah Kelas Baru'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editingClass
                  ? 'Perbarui informasi kelas yang ditugaskan kepada Anda.'
                  : 'Lengkapi identitas kelas praktikum baru.'}
              </Text>

              {/* Error banner umum */}
              {formErrors.general ? (
                <View style={styles.formErrorBanner}>
                  <Text style={styles.formErrorBannerText}>{formErrors.general}</Text>
                </View>
              ) : null}

              {/* Input Nama Kelas */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Kelas *</Text>
                <TextInput
                  style={[styles.textInput, formErrors.nama ? styles.textInputError : null]}
                  value={formNama}
                  onChangeText={(val) => {
                    setFormNama(val);
                    if (formErrors.nama) setFormErrors((prev) => ({ ...prev, nama: '' }));
                  }}
                  placeholder="Contoh: Kelas A, Kelas B-Pagi"
                  placeholderTextColor={colors.muted}
                />
                {formErrors.nama ? (
                  <Text style={styles.errorFieldText}>{formErrors.nama}</Text>
                ) : null}
              </View>

              {/* Input Kode Kelas */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Kode Kelas *</Text>
                <TextInput
                  style={[styles.textInput, formErrors.kode ? styles.textInputError : null]}
                  value={formKode}
                  onChangeText={(val) => {
                    setFormKode(val);
                    if (formErrors.kode) setFormErrors((prev) => ({ ...prev, kode: '' }));
                  }}
                  placeholder="Contoh: IF-A, TIF-2026-A"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                />
                {formErrors.kode ? (
                  <Text style={styles.errorFieldText}>{formErrors.kode}</Text>
                ) : null}
              </View>

              {/* Input Nama Praktikum */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mata Praktikum *</Text>
                <TextInput
                  style={[styles.textInput, formErrors.praktikum ? styles.textInputError : null]}
                  value={formPraktikum}
                  onChangeText={(val) => {
                    setFormPraktikum(val);
                    if (formErrors.praktikum)
                      setFormErrors((prev) => ({ ...prev, praktikum: '' }));
                  }}
                  placeholder="Contoh: Pemrograman Perangkat Bergerak"
                  placeholderTextColor={colors.muted}
                />
                {formErrors.praktikum ? (
                  <Text style={styles.errorFieldText}>{formErrors.praktikum}</Text>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  title="Batal"
                  variant="secondary"
                  disabled={submitting}
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButtonFlex}
                />
                <Button
                  title={submitting ? 'Menyimpan...' : 'Simpan'}
                  variant="primary"
                  disabled={submitting}
                  onPress={handleSaveClass}
                  style={styles.modalButtonFlex}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Arsip / Nonaktifkan (FR-S2-06) */}
      <ConfirmModal
        visible={archiveModal.visible}
        title={
          archiveModal.classItem?.active
            ? 'Arsipkan Kelas?'
            : 'Aktifkan Kembali Kelas?'
        }
        message={
          archiveModal.classItem?.active
            ? `Mengarsipkan kelas "${archiveModal.classItem?.nama}" akan menyembunyikannya dari jadwal aktif. Riwayat sesi dan presensi tetap tersimpan dan tidak akan dihapus.`
            : `Apakah Anda ingin mengaktifkan kembali kelas "${archiveModal.classItem?.nama}"?`
        }
        confirmText={archiveModal.classItem?.active ? 'Ya, Arsipkan' : 'Aktifkan'}
        cancelText="Batal"
        destructive={archiveModal.classItem?.active}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveModal({ visible: false, classItem: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  header: {
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17243B',
  },
  subtitle: {
    fontSize: 13,
    color: '#65738A',
    marginTop: 2,
  },
  addHeaderButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  successBannerText: {
    color: '#166534',
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EBEFF5',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#526074',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#65738A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classCode: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  className: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17243B',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillArchived: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: '#166534',
  },
  statusPillTextArchived: {
    color: '#64748B',
  },
  praktikumTitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionChipPrimary: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionChipPrimaryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionChipSecondary: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionChipSecondaryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  actionChipDanger: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionChipDangerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  actionChipReactivate: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionChipReactivateText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17243B',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#65738A',
    marginBottom: 16,
  },
  formErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  formErrorBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FAFCFF',
  },
  textInputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFF5F5',
  },
  errorFieldText: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalButtonFlex: {
    flex: 1,
  },
});
