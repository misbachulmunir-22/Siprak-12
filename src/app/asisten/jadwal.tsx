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
import StatusBadge from '@/components/StatusBadge';
import { useSiprakContext } from '@/context/SiprakContext';
import { ClassItem, classService } from '@/services/classService';
import {
  ScheduleItem,
  scheduleService,
  SessionItem,
} from '@/services/scheduleService';
import { colors, fontSizes, spacing } from '@/theme';

function formatTanggal(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function AsistenJadwalScreen() {
  const { currentUser } = useSiprakContext();
  const params = useLocalSearchParams<{ classId?: string }>();

  // Data State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(params.classId || '');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modal Add / Edit State (FR-S2-08, FR-S2-21)
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [formPraktikum, setFormPraktikum] = useState<string>('');
  const [formPertemuan, setFormPertemuan] = useState<string>('1');
  const [formLab, setFormLab] = useState<string>('Lab Komputer 3');
  const [formTanggal, setFormTanggal] = useState<string>('');
  const [formJamMulai, setFormJamMulai] = useState<string>('08:00');
  const [formJamSelesai, setFormJamSelesai] = useState<string>('10:30');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Archive Confirm Modal State
  const [archiveModal, setArchiveModal] = useState<{
    visible: boolean;
    schedule: ScheduleItem | null;
  }>({ visible: false, schedule: null });

  // 1. Muat kelas asisten real-time (FR-S2-13)
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'asisten') return;

    setLoadingClasses(true);
    const unsubscribe = classService.subscribeClassesForAssistant(
      currentUser.id,
      (classList) => {
        setClasses(classList);
        setLoadingClasses(false);

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

    return () => {
      unsubscribe();
    };
  }, [currentUser, params.classId, selectedClassId]);

  // 2. Muat jadwal & sesi untuk kelas terpilih secara real-time (FR-S2-13)
  useEffect(() => {
    if (!selectedClassId) {
      setSchedules([]);
      setSessions([]);
      return;
    }

    setLoadingData(true);
    setError(null);

    // Subscribe jadwal kelas
    const unsubSchedules = scheduleService.subscribeSchedulesForClass(
      selectedClassId,
      (list) => {
        setSchedules(list);
        setLoadingData(false);
      },
      (err) => {
        setError(err.message || 'Gagal memuat jadwal praktikum.');
        setLoadingData(false);
      }
    );

    // Subscribe master data sesi
    const unsubSessions = scheduleService.subscribeSessionsForAssistant(
      currentUser?.id || '',
      (allSessions) => {
        setSessions(allSessions.filter((s) => s.classId === selectedClassId));
      }
    );

    return () => {
      unsubSchedules();
      unsubSessions();
    };
  }, [selectedClassId, currentUser]);

  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Gabungkan jadwal dengan data sesi aktif
  const scheduleRows = useMemo(() => {
    return schedules.map((sch) => {
      const sess = sessions.find((s) => s.scheduleId === sch.id);
      return {
        schedule: sch,
        session: sess,
      };
    });
  }, [schedules, sessions]);

  // Buka modal untuk tambah jadwal baru
  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormPraktikum(currentClass ? currentClass.namaPraktikum : '');
    // Nomor pertemuan berikutnya = jumlah jadwal saat ini + 1
    setFormPertemuan(String(schedules.length + 1));
    setFormLab('Lab Komputer 3');
    // Default tanggal hari ini dalam format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    setFormTanggal(today);
    setFormJamMulai('08:00');
    setFormJamSelesai('10:30');
    setFormErrors({});
    setModalVisible(true);
  };

  // Buka modal untuk ubah jadwal
  const handleOpenEditModal = (sch: ScheduleItem) => {
    setEditingSchedule(sch);
    setFormPraktikum(sch.namaPraktikum);
    setFormPertemuan(String(sch.pertemuan));
    setFormLab(sch.lab);
    setFormTanggal(sch.tanggal);
    setFormJamMulai(sch.jamMulai);
    setFormJamSelesai(sch.jamSelesai);
    setFormErrors({});
    setModalVisible(true);
  };

  // Validasi form jadwal (FR-S2-08, FR-S2-21)
  const validateForm = (): boolean => {
    const valResult = scheduleService.validateInput({
      classId: selectedClassId,
      namaPraktikum: formPraktikum,
      pertemuan: Number(formPertemuan),
      lab: formLab,
      tanggal: formTanggal,
      jamMulai: formJamMulai,
      jamSelesai: formJamSelesai,
    });

    setFormErrors(valResult.errors);
    return valResult.valid;
  };

  // Simpan Jadwal dan Master Sesi (FR-S2-08)
  const handleSaveSchedule = async () => {
    if (!currentUser || !selectedClassId) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingSchedule) {
        await scheduleService.updateScheduleAndSession(editingSchedule.id, {
          namaPraktikum: formPraktikum,
          pertemuan: Number(formPertemuan),
          lab: formLab,
          tanggal: formTanggal,
          jamMulai: formJamMulai,
          jamSelesai: formJamSelesai,
          updatedBy: currentUser.id,
        });
        showSuccess(`Jadwal pertemuan ${formPertemuan} berhasil diperbarui.`);
      } else {
        await scheduleService.createScheduleAndSession({
          classId: selectedClassId,
          namaPraktikum: formPraktikum,
          pertemuan: Number(formPertemuan),
          lab: formLab,
          tanggal: formTanggal,
          jamMulai: formJamMulai,
          jamSelesai: formJamSelesai,
          createdBy: currentUser.id,
        });
        showSuccess(
          `Jadwal dan sesi baru (pertemuan ${formPertemuan}) berhasil dibuat dengan status awal belum_dibuka.`
        );
      }
      setModalVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan jadwal.';
      setFormErrors({ general: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Konfirmasi & Eksekusi Arsip Jadwal (FR-S2-08 soft delete)
  const handleConfirmArchive = async () => {
    if (!currentUser || !archiveModal.schedule) return;

    try {
      await scheduleService.archiveScheduleAndSession(
        archiveModal.schedule.id,
        currentUser.id
      );
      showSuccess(
        `Jadwal pertemuan ${archiveModal.schedule.pertemuan} berhasil diarsipkan. Data riwayat presensi tetap aman.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengarsipkan jadwal.';
      setError(msg);
    } finally {
      setArchiveModal({ visible: false, schedule: null });
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
            <Text style={styles.title}>Kelola Jadwal & Sesi</Text>
            <Text style={styles.subtitle}>
              Atur jadwal dan data master sesi praktikum
            </Text>
          </View>
          <Button
            title="+ Jadwal"
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

      {/* Pemilihan Kelas */}
      <View style={styles.classSelectorSection}>
        <Text style={styles.sectionLabel}>Pilih Kelas:</Text>
        {loadingClasses ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyClassHint}>
            Anda belum memiliki kelas yang ditugaskan.
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

      {/* Konten Utama Daftar Jadwal & Sesi */}
      {loadingData ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat jadwal kelas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <EmptyState
            title="Gagal Memuat Jadwal"
            description={`${error} Silakan periksa jaringan Anda.`}
          />
        </View>
      ) : (
        <FlatList
          data={scheduleRows}
          keyExtractor={(item) => item.schedule.id}
          contentContainerStyle={
            scheduleRows.length === 0 ? styles.emptyListContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Belum Ada Jadwal"
              description='Belum ada sesi praktikum yang dijadwalkan pada kelas ini. Tekan "+ Jadwal" untuk membuat pertemuan praktikum.'
            />
          }
          renderItem={({ item }) => {
            const sch = item.schedule;
            const sess = item.session;
            const statusSesi = sess?.status || 'belum_dibuka';

            return (
              <View style={styles.scheduleCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.eyebrow}>PERTEMUAN {sch.pertemuan}</Text>
                  <StatusBadge status={statusSesi} />
                </View>

                <Text style={styles.praktikumTitle}>{sch.namaPraktikum}</Text>
                <Text style={styles.metaText}>
                  {currentClass?.nama} · {sch.lab}
                </Text>

                <View style={styles.dateTimeRow}>
                  <Text style={styles.dateText}>{formatTanggal(sch.tanggal)}</Text>
                  <Text style={styles.timeText}>
                    {sch.jamMulai}–{sch.jamSelesai}
                  </Text>
                </View>

                {/* Info ID Transparansi Master Data */}
                <View style={styles.idInfoRow}>
                  <Text style={styles.idInfoText}>
                    Schedule ID: {sch.id} • Session ID: {sess?.id || '-'}
                  </Text>
                </View>

                {/* Tombol Aksi */}
                <View style={styles.cardActionsRow}>
                  {sess ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/sesi/[id]',
                          params: { id: sess.id },
                        })
                      }
                      style={styles.actionChipPrimary}>
                      <Text style={styles.actionChipPrimaryText}>Detail Sesi ➔</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleOpenEditModal(sch)}
                    style={styles.actionChipSecondary}>
                    <Text style={styles.actionChipSecondaryText}>Ubah</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setArchiveModal({ visible: true, schedule: sch })}
                    style={styles.actionChipDanger}>
                    <Text style={styles.actionChipDangerText}>Arsipkan</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal Tambah / Ubah Jadwal & Sesi (FR-S2-08, FR-S2-21) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingSchedule ? 'Ubah Jadwal Praktikum' : 'Tambah Jadwal & Sesi Baru'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editingSchedule
                  ? `Mengubah jadwal pertemuan ${editingSchedule.pertemuan} kelas ${currentClass?.nama}`
                  : `Jadwal baru akan otomatis membuat data master sesi dengan status awal belum_dibuka.`}
              </Text>

              {formErrors.general ? (
                <View style={styles.formErrorBanner}>
                  <Text style={styles.formErrorBannerText}>{formErrors.general}</Text>
                </View>
              ) : null}

              {/* Nama Praktikum */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mata Praktikum *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    formErrors.namaPraktikum ? styles.textInputError : null,
                  ]}
                  value={formPraktikum}
                  onChangeText={(val) => {
                    setFormPraktikum(val);
                    if (formErrors.namaPraktikum)
                      setFormErrors((prev) => ({ ...prev, namaPraktikum: '' }));
                  }}
                  placeholder="Nama praktikum"
                  placeholderTextColor={colors.muted}
                />
                {formErrors.namaPraktikum ? (
                  <Text style={styles.errorFieldText}>{formErrors.namaPraktikum}</Text>
                ) : null}
              </View>

              {/* Nomor Pertemuan & Lab */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.fieldGroup, styles.flexColumn]}>
                  <Text style={styles.fieldLabel}>Pertemuan Ke- *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      formErrors.pertemuan ? styles.textInputError : null,
                    ]}
                    value={formPertemuan}
                    onChangeText={(val) => {
                      setFormPertemuan(val);
                      if (formErrors.pertemuan)
                        setFormErrors((prev) => ({ ...prev, pertemuan: '' }));
                    }}
                    placeholder="1, 2, ..."
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                  />
                  {formErrors.pertemuan ? (
                    <Text style={styles.errorFieldText}>{formErrors.pertemuan}</Text>
                  ) : null}
                </View>

                <View style={[styles.fieldGroup, styles.flexColumn]}>
                  <Text style={styles.fieldLabel}>Lab / Lokasi *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      formErrors.lab ? styles.textInputError : null,
                    ]}
                    value={formLab}
                    onChangeText={(val) => {
                      setFormLab(val);
                      if (formErrors.lab)
                        setFormErrors((prev) => ({ ...prev, lab: '' }));
                    }}
                    placeholder="Lab Komputer 3"
                    placeholderTextColor={colors.muted}
                  />
                  {formErrors.lab ? (
                    <Text style={styles.errorFieldText}>{formErrors.lab}</Text>
                  ) : null}
                </View>
              </View>

              {/* Tanggal (YYYY-MM-DD) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Tanggal (YYYY-MM-DD) *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    formErrors.tanggal ? styles.textInputError : null,
                  ]}
                  value={formTanggal}
                  onChangeText={(val) => {
                    setFormTanggal(val);
                    if (formErrors.tanggal)
                      setFormErrors((prev) => ({ ...prev, tanggal: '' }));
                  }}
                  placeholder="YYYY-MM-DD (contoh: 2026-10-25)"
                  placeholderTextColor={colors.muted}
                />
                {formErrors.tanggal ? (
                  <Text style={styles.errorFieldText}>{formErrors.tanggal}</Text>
                ) : null}
              </View>

              {/* Jam Mulai & Jam Selesai (HH:MM) */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.fieldGroup, styles.flexColumn]}>
                  <Text style={styles.fieldLabel}>Jam Mulai (HH:MM) *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      formErrors.jamMulai ? styles.textInputError : null,
                    ]}
                    value={formJamMulai}
                    onChangeText={(val) => {
                      setFormJamMulai(val);
                      if (formErrors.jamMulai)
                        setFormErrors((prev) => ({ ...prev, jamMulai: '' }));
                    }}
                    placeholder="08:00"
                    placeholderTextColor={colors.muted}
                  />
                  {formErrors.jamMulai ? (
                    <Text style={styles.errorFieldText}>{formErrors.jamMulai}</Text>
                  ) : null}
                </View>

                <View style={[styles.fieldGroup, styles.flexColumn]}>
                  <Text style={styles.fieldLabel}>Jam Selesai (HH:MM) *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      formErrors.jamSelesai ? styles.textInputError : null,
                    ]}
                    value={formJamSelesai}
                    onChangeText={(val) => {
                      setFormJamSelesai(val);
                      if (formErrors.jamSelesai)
                        setFormErrors((prev) => ({ ...prev, jamSelesai: '' }));
                    }}
                    placeholder="10:30"
                    placeholderTextColor={colors.muted}
                  />
                  {formErrors.jamSelesai ? (
                    <Text style={styles.errorFieldText}>{formErrors.jamSelesai}</Text>
                  ) : null}
                </View>
              </View>

              {/* Hint Validasi Waktu */}
              <Text style={styles.timeRuleHint}>
                * Jam selesai harus secara kronologis berada setelah jam mulai (misal 08:00 sampai 10:30).
              </Text>

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
                  title={submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                  variant="primary"
                  disabled={submitting}
                  onPress={handleSaveSchedule}
                  style={styles.modalButtonFlex}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Arsip Jadwal (FR-S2-08) */}
      <ConfirmModal
        visible={archiveModal.visible}
        title="Arsipkan Jadwal Praktikum?"
        message={`Mengarsipkan jadwal pertemuan ${archiveModal.schedule?.pertemuan} akan menyembunyikan sesi ini dari jadwal aktif. Rekam presensi historis peserta yang sudah tercatat pada sesi ini tetap tersimpan.`}
        confirmText="Ya, Arsipkan"
        cancelText="Batal"
        destructive
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveModal({ visible: false, schedule: null })}
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
    marginBottom: 12,
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
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5EAF1',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eyebrow: {
    color: '#65738A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  praktikumTitle: {
    color: '#17243B',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  metaText: {
    color: '#65738A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  dateTimeRow: {
    borderTopColor: '#EEF1F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
  },
  dateText: {
    color: '#34445C',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  timeText: {
    color: '#315CCB',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  idInfoRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  idInfoText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
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
  fieldGroup: {
    marginBottom: 12,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexColumn: {
    flex: 1,
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
  timeRuleHint: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtonFlex: {
    flex: 1,
  },
});
