import React, { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { useSiprakContext } from '@/context/SiprakContext';
import {
  ClassItem,
  ClassMember,
  classService,
  PraktikanLookup,
} from '@/services/classService';
import { colors, fontSizes, spacing } from '@/theme';

type MemberFilter = 'aktif' | 'nonaktif' | 'semua';

export default function AsistenPesertaScreen() {
  const { currentUser } = useSiprakContext();
  const params = useLocalSearchParams<{ classId?: string }>();

  // Data State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(params.classId || '');
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemberFilter>('aktif');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Available Praktikan Accounts for Lookup
  const [availablePraktikan, setAvailablePraktikan] = useState<PraktikanLookup[]>([]);

  // Add Member Modal State
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [inputUid, setInputUid] = useState<string>('');
  const [inputNama, setInputNama] = useState<string>('');
  const [inputNim, setInputNim] = useState<string>('');
  const [verifiedLookup, setVerifiedLookup] = useState<PraktikanLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // Edit Member Modal State
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<ClassMember | null>(null);
  const [editNama, setEditNama] = useState<string>('');
  const [editNim, setEditNim] = useState<string>('');
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // Deactivate Member Confirm Modal State
  const [deactivateModal, setDeactivateModal] = useState<{
    visible: boolean;
    member: ClassMember | null;
  }>({ visible: false, member: null });

  // 1. Muat kelas yang ditugaskan ke asisten (FR-S2-13)
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'asisten') return;

    setLoadingClasses(true);
    const unsubscribe = classService.subscribeClassesForAssistant(
      currentUser.id,
      (classList) => {
        setClasses(classList);
        setLoadingClasses(false);

        // Pilih kelas default jika belum terpilih
        if (!selectedClassId && classList.length > 0) {
          const matched = params.classId && classList.find((c) => c.id === params.classId);
          setSelectedClassId(matched ? matched.id : classList[0].id);
        } else if (selectedClassId && !classList.some((c) => c.id === selectedClassId)) {
          setSelectedClassId(classList.length > 0 ? classList[0].id : '');
        }
      },
      (err) => {
        setError(err.message || 'Gagal memuat daftar kelas.');
        setLoadingClasses(false);
      }
    );

    // Ambil database lookup praktikan
    classService.getAvailablePraktikanList().then(setAvailablePraktikan);

    return () => {
      unsubscribe();
    };
  }, [currentUser, params.classId, selectedClassId]);

  // 2. Muat anggota kelas terpilih secara real-time (FR-S2-13)
  useEffect(() => {
    if (!selectedClassId) {
      setMembers([]);
      return;
    }

    setLoadingMembers(true);
    setError(null);

    const unsubscribe = classService.subscribeClassMembers(
      selectedClassId,
      (memberList) => {
        setMembers(memberList);
        setLoadingMembers(false);
      },
      (err) => {
        setError(err.message || 'Gagal memuat peserta kelas.');
        setLoadingMembers(false);
      },
      true // Sertakan juga anggota nonaktif agar dapat ditampilkan di tab arsip/nonaktif
    );

    return () => {
      unsubscribe();
    };
  }, [selectedClassId]);

  // Kelas yang saat ini sedang aktif dipilih
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Filter daftar anggota
  const filteredMembers = useMemo(() => {
    let result = members;
    if (filter === 'aktif') result = result.filter((m) => m.active);
    if (filter === 'nonaktif') result = result.filter((m) => !m.active);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.namaSnapshot.toLowerCase().includes(q) ||
          m.nimSnapshot.toLowerCase().includes(q) ||
          m.uid.toLowerCase().includes(q)
      );
    }

    return result;
  }, [members, filter, searchQuery]);

  // Handler Lookup Akun Praktikan berdasarkan UID / NIM (FR-S2-05)
  const handlePerformLookup = async (targetUid: string) => {
    const trimmed = targetUid.trim();
    if (!trimmed) {
      setVerifiedLookup(null);
      return;
    }

    setLookupLoading(true);
    try {
      const res = await classService.lookupPraktikan(trimmed);
      setVerifiedLookup(res);
      if (res) {
        setInputNama(res.nama);
        setInputNim(res.nim || '');
        setAddFormErrors({});
      } else {
        setAddFormErrors({ uid: 'UID/NIM tidak ditemukan di sistem sebagai praktikan terdaftar.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal lookup akun.';
      setAddFormErrors({ uid: msg });
    } finally {
      setLookupLoading(false);
    }
  };

  // Buka Modal Tambah Peserta
  const handleOpenAddModal = () => {
    setInputUid('');
    setInputNama('');
    setInputNim('');
    setVerifiedLookup(null);
    setAddFormErrors({});
    setAddModalVisible(true);
  };

  // Simpan Tambah Peserta (FR-S2-05)
  const handleSaveAddMember = async () => {
    if (!currentUser || !selectedClassId) return;

    const errs: Record<string, string> = {};
    if (!inputUid.trim()) errs.uid = 'UID praktikan wajib diisi.';
    if (!inputNama.trim()) errs.nama = 'Nama peserta wajib diisi.';
    if (!inputNim.trim()) errs.nim = 'NIM peserta wajib diisi.';

    if (Object.keys(errs).length > 0) {
      setAddFormErrors(errs);
      return;
    }

    setSubmittingAdd(true);
    setAddFormErrors({});

    try {
      await classService.addMemberToClass(selectedClassId, {
        uid: inputUid.trim(),
        namaSnapshot: inputNama.trim(),
        nimSnapshot: inputNim.trim(),
        assistantUid: currentUser.id,
      });

      showSuccess(`Praktikan "${inputNama}" berhasil dipetakan ke kelas.`);
      setAddModalVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan peserta.';
      setAddFormErrors({ general: msg });
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Buka Modal Edit Peserta (FR-S2-07)
  const handleOpenEditModal = (m: ClassMember) => {
    setEditingMember(m);
    setEditNama(m.namaSnapshot);
    setEditNim(m.nimSnapshot);
    setEditFormErrors({});
    setEditModalVisible(true);
  };

  // Simpan Edit Peserta (FR-S2-07)
  const handleSaveEditMember = async () => {
    if (!currentUser || !selectedClassId || !editingMember) return;

    const errs: Record<string, string> = {};
    if (!editNama.trim()) errs.nama = 'Nama peserta tidak boleh kosong.';
    if (!editNim.trim()) errs.nim = 'NIM peserta tidak boleh kosong.';

    if (Object.keys(errs).length > 0) {
      setEditFormErrors(errs);
      return;
    }

    setSubmittingEdit(true);
    setEditFormErrors({});

    try {
      await classService.updateMemberSnapshot(selectedClassId, editingMember.uid, {
        namaSnapshot: editNama.trim(),
        nimSnapshot: editNim.trim(),
        assistantUid: currentUser.id,
      });

      showSuccess(`Data keanggotaan "${editNama}" berhasil diperbarui.`);
      setEditModalVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui data peserta.';
      setEditFormErrors({ general: msg });
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Eksekusi Nonaktifkan / Keluarkan Peserta (FR-S2-07)
  const handleConfirmDeactivate = async () => {
    if (!currentUser || !selectedClassId || !deactivateModal.member) return;

    try {
      await classService.removeMemberFromClass(
        selectedClassId,
        deactivateModal.member.uid,
        currentUser.id
      );
      showSuccess(
        `Peserta "${deactivateModal.member.namaSnapshot}" dinonaktifkan dari kelas. Presensi historis tetap aman.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menonaktifkan peserta.';
      setError(msg);
    } finally {
      setDeactivateModal({ visible: false, member: null });
    }
  };

  // Aktifkan Kembali Peserta yang Pernah Dinonaktifkan (FR-S2-05)
  const handleReactivateMember = async (member: ClassMember) => {
    if (!currentUser || !selectedClassId) return;

    try {
      await classService.addMemberToClass(selectedClassId, {
        uid: member.uid,
        namaSnapshot: member.namaSnapshot,
        nimSnapshot: member.nimSnapshot,
        assistantUid: currentUser.id,
      });
      showSuccess(`Keanggotaan "${member.namaSnapshot}" berhasil diaktifkan kembali.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengaktifkan peserta.';
      setError(msg);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 3500);
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
            <Text style={styles.title}>Kelola Peserta</Text>
            <Text style={styles.subtitle}>
              Pemetaan akun praktikan ke dokumen keanggotaan kelas
            </Text>
          </View>
          <Button
            title="+ Peserta"
            onPress={handleOpenAddModal}
            disabled={!selectedClassId}
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

      {/* Pemilihan Kelas (Selector Chips) */}
      <View style={styles.classSelectorSection}>
        <Text style={styles.sectionLabel}>Pilih Kelas Praktikum:</Text>
        {loadingClasses ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyClassHint}>
            Anda belum memiliki kelas yang ditugaskan. Buat kelas terlebih dahulu di Kelola Kelas.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classChipsScroll}>
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <Pressable
                  key={cls.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedClassId(cls.id)}
                  style={[styles.classChip, isSelected && styles.classChipSelected]}>
                  <Text
                    style={[
                      styles.classChipText,
                      isSelected && styles.classChipTextSelected,
                    ]}>
                    {cls.kode} — {cls.nama}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Info Ringkasan Kelas Terpilih */}
      {currentClass ? (
        <View style={styles.classSummaryBanner}>
          <View style={styles.classSummaryInfo}>
            <Text style={styles.classSummaryTitle}>
              {currentClass.nama} ({currentClass.kode})
            </Text>
            <Text style={styles.classSummarySub}>
              {currentClass.namaPraktikum} • {members.filter((m) => m.active).length} Peserta Aktif
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/asisten/jadwal',
                params: { classId: currentClass.id },
              })
            }
            style={styles.viewScheduleButton}>
            <Text style={styles.viewScheduleButtonText}>Lihat Jadwal ➔</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Search & Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama, NIM, atau UID..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterTabsRow}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'aktif' }}
            onPress={() => setFilter('aktif')}
            style={[styles.filterChip, filter === 'aktif' && styles.filterChipActive]}>
            <Text
              style={[
                styles.filterChipText,
                filter === 'aktif' && styles.filterChipTextActive,
              ]}>
              Aktif ({members.filter((m) => m.active).length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'nonaktif' }}
            onPress={() => setFilter('nonaktif')}
            style={[styles.filterChip, filter === 'nonaktif' && styles.filterChipActive]}>
            <Text
              style={[
                styles.filterChipText,
                filter === 'nonaktif' && styles.filterChipTextActive,
              ]}>
              Nonaktif ({members.filter((m) => !m.active).length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'semua' }}
            onPress={() => setFilter('semua')}
            style={[styles.filterChip, filter === 'semua' && styles.filterChipActive]}>
            <Text
              style={[
                styles.filterChipText,
                filter === 'semua' && styles.filterChipTextActive,
              ]}>
              Semua ({members.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Konten Utama Daftar Anggota */}
      {loadingMembers ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat peserta kelas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <EmptyState
            title="Gagal Memuat Peserta"
            description={`${error} Silakan periksa jaringan Anda.`}
          />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={
            filteredMembers.length === 0 ? styles.emptyListContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Tidak Ada Peserta"
              description={
                members.length === 0
                  ? 'Belum ada praktikan yang dipetakan ke kelas ini. Tekan "+ Peserta" untuk menambahkan praktikan dengan UID.'
                  : 'Tidak ada peserta yang cocok dengan filter pencarian.'
              }
            />
          }
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.memberCardHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {item.namaSnapshot.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{item.namaSnapshot}</Text>
                  <Text style={styles.memberMeta}>
                    NIM: {item.nimSnapshot} • UID: {item.uid}
                  </Text>
                  <Text style={styles.memberJoinDate}>
                    Bergabung: {new Date(item.joinedAt).toLocaleDateString('id-ID')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    item.active ? styles.statusPillActive : styles.statusPillInactive,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      item.active ? styles.statusPillTextActive : styles.statusPillTextInactive,
                    ]}>
                    {item.active ? 'Aktif' : 'Nonaktif'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Peserta */}
              <View style={styles.memberActionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleOpenEditModal(item)}
                  style={styles.actionChipSecondary}>
                  <Text style={styles.actionChipSecondaryText}>Ubah Data</Text>
                </Pressable>

                {item.active ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeactivateModal({ visible: true, member: item })}
                    style={styles.actionChipDanger}>
                    <Text style={styles.actionChipDangerText}>Keluarkan</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleReactivateMember(item)}
                    style={styles.actionChipReactivate}>
                    <Text style={styles.actionChipReactivateText}>Aktifkan Kembali</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Tambah Peserta (FR-S2-05, FR-S2-21) */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Tambah Peserta ke Kelas</Text>
              <Text style={styles.modalSubtitle}>
                Petakan UID akun praktikan resmi ke kelas {currentClass?.nama}.
              </Text>

              {/* Error banner umum */}
              {addFormErrors.general ? (
                <View style={styles.formErrorBanner}>
                  <Text style={styles.formErrorBannerText}>{addFormErrors.general}</Text>
                </View>
              ) : null}

              {/* Quick Pick dari Praktikan Terdaftar */}
              <Text style={styles.fieldLabel}>Pilih Praktikan Terdaftar (Lookup):</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickPickScroll}
                contentContainerStyle={styles.quickPickContainer}>
                {availablePraktikan.map((p) => {
                  const isAlreadyMember = members.some((m) => m.uid === p.uid && m.active);
                  return (
                    <Pressable
                      key={p.uid}
                      onPress={() => {
                        setInputUid(p.uid);
                        setInputNama(p.nama);
                        setInputNim(p.nim || '');
                        setVerifiedLookup(p);
                        setAddFormErrors({});
                      }}
                      style={[
                        styles.quickPickChip,
                        inputUid === p.uid && styles.quickPickChipActive,
                        isAlreadyMember && styles.quickPickChipDisabled,
                      ]}>
                      <Text
                        style={[
                          styles.quickPickChipText,
                          inputUid === p.uid && styles.quickPickChipTextActive,
                        ]}>
                        {p.nama} ({p.nim}) {isAlreadyMember ? '✓' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Input UID */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Firebase Auth UID Praktikan *</Text>
                <View style={styles.inputWithAction}>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.inputFlex,
                      addFormErrors.uid ? styles.textInputError : null,
                    ]}
                    value={inputUid}
                    onChangeText={(val) => {
                      setInputUid(val);
                      if (addFormErrors.uid)
                        setAddFormErrors((prev) => ({ ...prev, uid: '' }));
                    }}
                    placeholder="Contoh: praktikan-1 atau UID Firebase"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                  />
                  <Button
                    title={lookupLoading ? '...' : 'Cek UID'}
                    variant="secondary"
                    onPress={() => handlePerformLookup(inputUid)}
                    style={styles.lookupButton}
                  />
                </View>
                {addFormErrors.uid ? (
                  <Text style={styles.errorFieldText}>{addFormErrors.uid}</Text>
                ) : null}
              </View>

              {/* Lookup Verified Banner */}
              {verifiedLookup ? (
                <View style={styles.verifiedBanner}>
                  <Text style={styles.verifiedBadgeTitle}>
                    ✓ Akun Terverifikasi di Sistem:
                  </Text>
                  <Text style={styles.verifiedBadgeDetail}>
                    Nama: {verifiedLookup.nama} • NIM: {verifiedLookup.nim}
                  </Text>
                  <Text style={styles.verifiedBadgeDetail}>
                    Email: {verifiedLookup.email} • Peran: {verifiedLookup.role}
                  </Text>
                </View>
              ) : null}

              {/* Input Nama Snapshot */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Lengkap (Snapshot) *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    addFormErrors.nama ? styles.textInputError : null,
                  ]}
                  value={inputNama}
                  onChangeText={(val) => {
                    setInputNama(val);
                    if (addFormErrors.nama)
                      setAddFormErrors((prev) => ({ ...prev, nama: '' }));
                  }}
                  placeholder="Nama praktikan"
                  placeholderTextColor={colors.muted}
                />
                {addFormErrors.nama ? (
                  <Text style={styles.errorFieldText}>{addFormErrors.nama}</Text>
                ) : null}
              </View>

              {/* Input NIM Snapshot */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NIM (Snapshot) *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    addFormErrors.nim ? styles.textInputError : null,
                  ]}
                  value={inputNim}
                  onChangeText={(val) => {
                    setInputNim(val);
                    if (addFormErrors.nim)
                      setAddFormErrors((prev) => ({ ...prev, nim: '' }));
                  }}
                  placeholder="Nomor Induk Mahasiswa"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                {addFormErrors.nim ? (
                  <Text style={styles.errorFieldText}>{addFormErrors.nim}</Text>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  title="Batal"
                  variant="secondary"
                  disabled={submittingAdd}
                  onPress={() => setAddModalVisible(false)}
                  style={styles.modalButtonFlex}
                />
                <Button
                  title={submittingAdd ? 'Menyimpan...' : 'Tambahkan'}
                  variant="primary"
                  disabled={submittingAdd}
                  onPress={handleSaveAddMember}
                  style={styles.modalButtonFlex}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Snapshot Peserta (FR-S2-07) */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Perbarui Data Keanggotaan</Text>
              <Text style={styles.modalSubtitle}>
                Ubah snapshot nama atau NIM untuk UID: {editingMember?.uid}
              </Text>

              {editFormErrors.general ? (
                <View style={styles.formErrorBanner}>
                  <Text style={styles.formErrorBannerText}>{editFormErrors.general}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    editFormErrors.nama ? styles.textInputError : null,
                  ]}
                  value={editNama}
                  onChangeText={(val) => {
                    setEditNama(val);
                    if (editFormErrors.nama)
                      setEditFormErrors((prev) => ({ ...prev, nama: '' }));
                  }}
                  placeholder="Nama praktikan"
                  placeholderTextColor={colors.muted}
                />
                {editFormErrors.nama ? (
                  <Text style={styles.errorFieldText}>{editFormErrors.nama}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NIM *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    editFormErrors.nim ? styles.textInputError : null,
                  ]}
                  value={editNim}
                  onChangeText={(val) => {
                    setEditNim(val);
                    if (editFormErrors.nim)
                      setEditFormErrors((prev) => ({ ...prev, nim: '' }));
                  }}
                  placeholder="NIM"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                {editFormErrors.nim ? (
                  <Text style={styles.errorFieldText}>{editFormErrors.nim}</Text>
                ) : null}
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Batal"
                  variant="secondary"
                  disabled={submittingEdit}
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalButtonFlex}
                />
                <Button
                  title={submittingEdit ? 'Menyimpan...' : 'Perbarui'}
                  variant="primary"
                  disabled={submittingEdit}
                  onPress={handleSaveEditMember}
                  style={styles.modalButtonFlex}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Keluarkan/Nonaktifkan (FR-S2-07) */}
      <ConfirmModal
        visible={deactivateModal.visible}
        title="Keluarkan Peserta dari Kelas?"
        message={`Mengeluarkan "${deactivateModal.member?.namaSnapshot}" (${deactivateModal.member?.nimSnapshot}) akan menonaktifkan status keanggotaannya dari kelas ini. Rekam data presensi historis peserta tetap aman dan tersimpan.`}
        confirmText="Ya, Keluarkan"
        cancelText="Batal"
        destructive
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateModal({ visible: false, member: null })}
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
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
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
  classSelectorSection: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  emptyClassHint: {
    fontSize: 13,
    color: colors.danger,
    fontStyle: 'italic',
  },
  classChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  classChip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  classChipSelected: {
    backgroundColor: colors.primary,
  },
  classChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  classChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  classSummaryBanner: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classSummaryInfo: {
    flex: 1,
  },
  classSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  classSummarySub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  viewScheduleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  viewScheduleButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  searchFilterContainer: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#334155',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
  listContent: {
    paddingBottom: 32,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17243B',
  },
  memberMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  memberJoinDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: '#166534',
  },
  statusPillTextInactive: {
    color: '#B91C1C',
  },
  memberActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  actionChipSecondary: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionChipSecondaryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  actionChipDanger: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionChipDangerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  actionChipReactivate: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
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
    marginBottom: 14,
  },
  formErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  formErrorBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  quickPickScroll: {
    marginBottom: 14,
  },
  quickPickContainer: {
    gap: 6,
    paddingVertical: 4,
  },
  quickPickChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickPickChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  quickPickChipDisabled: {
    opacity: 0.6,
  },
  quickPickChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  quickPickChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWithAction: {
    flexDirection: 'row',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  lookupButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  verifiedBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  verifiedBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  verifiedBadgeDetail: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButtonFlex: {
    flex: 1,
  },
});
