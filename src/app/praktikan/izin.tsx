import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSiprakContext } from '@/context/SiprakContext';
import {
  submitLeaveRequest,
  subscribeMyLeaveRequests,
} from '@/services/leaveService';
import type { PengajuanIzin, Sesi, StatusIzin } from '@/types/siprak';
import { formatTanggal, formatWaktuLengkap, validateAlasanIzin } from '@/utils/presensi';

/**
 * Layar Pengajuan Izin dan Pemantauan Status Izin Praktikan (Owner: Programmer 4)
 * Menangani:
 * - FR-S2-16: Form pengajuan izin praktikan & pencegahan duplikasi
 * - FR-S2-17: Tampilan hasil klasifikasi AI sebagai prediksi pendukung
 * - FR-S2-18: Fallback saat AI gagal/tidak tersedia
 * - FR-S2-20: Pemantauan status persetujuan asisten secara real-time
 * - FR-S2-21: Validasi alasan, indikator loading, empty state, dan error state
 * - NFR-S2-07: Aksesibilitas, area sentuh >= 44dp, Bahasa Indonesia
 */
export default function PengajuanIzinScreen() {
  const { currentUser, sessions } = useSiprakContext();

  // State Pengajuan Form
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [alasan, setAlasan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<PengajuanIzin | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);

  // State Daftar Riwayat Izin Real-time (FR-S2-13, FR-S2-20)
  const [leaveRequests, setLeaveRequests] = useState<PengajuanIzin[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(
    () => Boolean(currentUser && currentUser.peran === 'praktikan')
  );
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Filter sesi yang relevan untuk kelas praktikan
  const relevantSessions = useMemo(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') return [];
    return sessions.filter(
      (sesi) => !currentUser.kelas || sesi.kelas === currentUser.kelas
    );
  }, [currentUser, sessions]);

  // Tentukan id sesi yang aktif secara deterministik tanpa cascading render
  const effectiveSessionId = useMemo(() => {
    if (selectedSessionId) return selectedSessionId;
    if (relevantSessions.length === 0) return '';
    const upcoming = relevantSessions.find((s) => s.status !== 'ditutup');
    return upcoming ? upcoming.id : relevantSessions[0].id;
  }, [relevantSessions, selectedSessionId]);

  // Pasang listener real-time pengajuan izin milik praktikan (FR-S2-13 & FR-S2-20)
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') return;

    const unsubscribe = subscribeMyLeaveRequests(
      currentUser.id,
      (list) => {
        setLeaveRequests(list);
        setLoadingRequests(false);
        setRequestsError(null);
      },
      (error) => {
        console.warn('Listener pengajuan izin gagal:', error.message);
        setRequestsError('Gagal menyinkronkan daftar pengajuan izin.');
        setLoadingRequests(false);
      }
    );

    return () => {
      // Cleanup listener saat unmount / logout
      unsubscribe();
    };
  }, [currentUser]);

  if (!currentUser || currentUser.peran !== 'praktikan') {
    return (
      <View style={styles.screen}>
        <Text style={styles.pageTitle}>Pengajuan Izin</Text>
        <EmptyNotice
          title="Masuk sebagai praktikan"
          description="Pilih akun praktikan yang terdaftar untuk mengajukan izin praktikum."
        />
      </View>
    );
  }

  const selectedSession = relevantSessions.find((s) => s.id === effectiveSessionId);

  // Tangani submit pengajuan izin
  const handleSubmit = async () => {
    if (!selectedSession) {
      setFormError('Silakan pilih pertemuan praktikum yang ingin diajukan izin.');
      return;
    }

    const validation = validateAlasanIzin(alasan);
    if (!validation.valid) {
      setFormError(validation.error || 'Alasan izin tidak valid.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await submitLeaveRequest(
        selectedSession,
        currentUser.id,
        alasan,
        selectedSession.classId
      );

      if (res.ok && res.leaveRequest) {
        setLastSubmission(res.leaveRequest);
        setShowResultModal(true);
        setAlasan('');
      } else {
        setFormError(res.message || 'Gagal mengirim pengajuan izin.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan sistem saat mengajukan izin.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={leaveRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>AREA PRAKTIKAN</Text>
            <Text style={styles.pageTitle}>Pengajuan Izin</Text>
            <Text style={styles.intro}>
              Ajukan izin ketidakhadiran praktikum. Alasanmu akan dianalisis secara otomatis oleh model AI
              dan ditinjau langsung oleh Asisten Praktikum.
            </Text>

            {/* FORMULIR PENGAJUAN IZIN */}
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Formulir Izin Baru</Text>

              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Pemilihan Pertemuan Praktikum */}
              <Text style={styles.inputLabel}>Pilih Pertemuan Praktikum *</Text>
              {relevantSessions.length === 0 ? (
                <Text style={styles.emptySessionNotice}>
                  Belum ada jadwal pertemuan praktikum untuk kelasmu.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionChipsScroll}>
                  <View style={styles.sessionChipsRow}>
                    {relevantSessions.map((sesi) => {
                      const isSelected = sesi.id === effectiveSessionId;
                      return (
                        <Pressable
                          key={sesi.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Pilih pertemuan ${sesi.pertemuan}`}
                          onPress={() => {
                            setSelectedSessionId(sesi.id);
                            setFormError(null);
                          }}
                          style={[styles.sessionChip, isSelected && styles.sessionChipSelected]}
                        >
                          <Text style={[styles.sessionChipText, isSelected && styles.sessionChipTextSelected]}>
                            Pertemuan {sesi.pertemuan}
                          </Text>
                          <Text style={[styles.sessionChipSub, isSelected && styles.sessionChipSubSelected]}>
                            {sesi.tanggal}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              {selectedSession ? (
                <View style={styles.selectedSessionInfo}>
                  <Text style={styles.selectedSessionText}>
                    <Text style={styles.boldText}>{selectedSession.praktikum}</Text> ({formatTanggal(selectedSession.tanggal)}, {selectedSession.jamMulai}–{selectedSession.jamSelesai} WIB)
                  </Text>
                </View>
              ) : null}

              {/* Input Teks Alasan */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Alasan Ketidakhadiran *</Text>
                  <Text style={[styles.charCounter, alasan.length > 500 && styles.charCounterOver]}>
                    {alasan.length}/500
                  </Text>
                </View>
                <TextInput
                  value={alasan}
                  onChangeText={(val) => {
                    setAlasan(val);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Tuliskan alasan jelas mengapa tidak dapat mengikuti praktikum (contoh: sakit demam tinggi, rawat inap, mewakili kampus dalam kompetisi)..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                  style={styles.textArea}
                />
                <Text style={styles.fieldHint}>
                  Minimal 10 karakter. Deskripsikan kondisi secara jujur dan jelas.
                </Text>
              </View>

              {/* Tombol Kirim Pengajuan */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kirim pengajuan izin"
                accessibilityState={{ disabled: isSubmitting || !effectiveSessionId }}
                disabled={isSubmitting || !effectiveSessionId}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  (isSubmitting || !effectiveSessionId) && styles.submitButtonDisabled,
                  pressed && !isSubmitting && styles.submitButtonPressed,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Menyimpan & Menganalisis AI...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Kirim Pengajuan Izin</Text>
                )}
              </Pressable>
            </View>

            {/* Sub-judul Daftar Pengajuan */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>Riwayat Pengajuan Izin Saya</Text>
              {loadingRequests ? <ActivityIndicator size="small" color="#245BDB" /> : null}
            </View>

            {requestsError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{requestsError}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const sesiInfo = sessions.find((s) => s.id === item.sesiId);
          return <LeaveRequestItemCard item={item} sesi={sesiInfo} />;
        }}
        ListEmptyComponent={
          !loadingRequests ? (
            <EmptyNotice
              title="Belum ada pengajuan izin"
              description="Kamu belum pernah mengajukan izin ketidakhadiran praktikum."
            />
          ) : undefined
        }
      />

      {/* MODAL HASIL PENGAJUAN & KLASIFIKASI AI */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <View style={styles.modalSuccessIcon}>
              <Text style={styles.modalSuccessCheckmark}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Pengajuan Izin Terkirim!</Text>
            <Text style={styles.modalDesc}>
              Pengajuan izinmu telah berhasil tersimpan dengan status{' '}
              <Text style={styles.boldText}>Menunggu Pemeriksaan</Text> Asisten.
            </Text>

            {/* AI Result Card Sesuai SRS 5.3 & 6.6 */}
            {lastSubmission ? (
              <AIResultCard leaveRequest={lastSubmission} />
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup dialog konfirmasi"
              onPress={() => setShowResultModal(false)}
              style={({ pressed }) => [styles.modalCloseButton, pressed && styles.submitButtonPressed]}
            >
              <Text style={styles.modalCloseButtonText}>Tutup dan Kembali</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Komponen Kartu Hasil Klasifikasi AI (SRS 5.3 LeaveRequestForm / AIResultCard) */
function AIResultCard({ leaveRequest }: { leaveRequest: PengajuanIzin }) {
  const isSuccess = leaveRequest.aiStatus === 'berhasil';
  const isUnavailable = leaveRequest.aiStatus === 'tidak_tersedia';

  return (
    <View style={styles.aiResultCard}>
      <View style={styles.aiHeaderRow}>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 Prediksi AI</Text>
        </View>
        <Text style={styles.aiDisclaimerText}>Bukan Keputusan Resmi</Text>
      </View>

      {isSuccess ? (
        <View style={styles.aiContent}>
          <View style={styles.aiCategoryRow}>
            <Text style={styles.aiCategoryLabel}>Kategori Prediksi:</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{leaveRequest.aiCategory || 'Lainnya'}</Text>
            </View>
          </View>

          {typeof leaveRequest.aiConfidence === 'number' ? (
            <View style={styles.aiConfidenceRow}>
              <Text style={styles.aiConfidenceLabel}>Tingkat Keyakinan:</Text>
              <Text style={styles.aiConfidenceValue}>
                {Math.round(leaveRequest.aiConfidence * 100)}%
              </Text>
            </View>
          ) : null}

          {leaveRequest.aiModel ? (
            <Text style={styles.aiModelText}>Model: {leaveRequest.aiModel}</Text>
          ) : null}

          <View style={styles.aiNoticeBox}>
            <Text style={styles.aiNoticeText}>
              Model AI telah mengklasifikasikan alasanmu. Keputusan akhir (Disetujui/Ditolak) tetap
              menjadi kewenangan Asisten Praktikum setelah meninjau bukti dan alasan lengkap.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.aiFallbackContent}>
          <Text style={styles.aiFallbackTitle}>
            {isUnavailable ? 'Layanan AI Belum Dikonfigurasi' : 'Klasifikasi AI Tidak Tersedia / Timeout'}
          </Text>
          <Text style={styles.aiFallbackDesc}>
            Pengajuan izinmu tetap tersimpan dengan aman dan status tetap{' '}
            <Text style={styles.boldText}>Menunggu</Text>. Asisten praktikum akan meninjau alasanmu secara manual.
          </Text>
        </View>
      )}
    </View>
  );
}

/** Komponen Kartu Pengajuan Izin dalam Riwayat */
function LeaveRequestItemCard({
  item,
  sesi,
}: {
  item: PengajuanIzin;
  sesi?: Sesi;
}) {
  const statusColor = getStatusColor(item.status);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemCardTop}>
        <View style={styles.itemTitleBlock}>
          <Text style={styles.itemMeeting}>
            PERTEMUAN {sesi ? sesi.pertemuan : '?'}
          </Text>
          <Text style={styles.itemSubject}>
            {sesi ? sesi.praktikum : 'Praktikum'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
            {formatStatusIzin(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.itemDivider} />

      {/* Alasan dari praktikan */}
      <View style={styles.reasonSection}>
        <Text style={styles.reasonLabel}>Alasan Izin:</Text>
        <Text style={styles.reasonText}>&ldquo;{item.alasan}&rdquo;</Text>
      </View>

      {/* Metadata Prediksi AI jika ada */}
      {item.aiStatus === 'berhasil' && item.aiCategory ? (
        <View style={styles.itemAiRow}>
          <Text style={styles.itemAiTag}>Prediksi AI: {item.aiCategory}</Text>
          {item.aiConfidence ? (
            <Text style={styles.itemAiConfidence}>
              ({Math.round(item.aiConfidence * 100)}%)
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Catatan Keputusan dari Asisten (jika ada) */}
      {item.reviewNote ? (
        <View style={styles.reviewNoteBox}>
          <Text style={styles.reviewNoteTitle}>Catatan Asisten:</Text>
          <Text style={styles.reviewNoteText}>{item.reviewNote}</Text>
          {item.reviewedAt ? (
            <Text style={styles.reviewTimeText}>
              Ditinjau: {formatWaktuLengkap(item.reviewedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.itemFooterRow}>
        <Text style={styles.itemDateText}>
          Diajukan: {formatWaktuLengkap(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function EmptyNotice({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>i</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function formatStatusIzin(status: StatusIzin): string {
  switch (status) {
    case 'menunggu':
      return 'Menunggu';
    case 'disetujui':
      return 'Disetujui';
    case 'ditolak':
      return 'Ditolak';
    default:
      return status;
  }
}

function getStatusColor(status: StatusIzin): { bg: string; text: string } {
  switch (status) {
    case 'menunggu':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'disetujui':
      return { bg: '#DCFCE7', text: '#15803D' };
    case 'ditolak':
      return { bg: '#FEE2E2', text: '#B91C1C' };
    default:
      return { bg: '#E2E8F0', text: '#475569' };
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  listContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 36, flexGrow: 1 },
  header: { gap: 8, marginBottom: 12 },
  eyebrow: { color: '#245BDB', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  pageTitle: { color: '#10223D', fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  intro: { color: '#68778D', fontSize: 14, lineHeight: 21, marginBottom: 8 },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderColor: '#E1E8F2',
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  formCardTitle: { color: '#10223D', fontSize: 17, fontWeight: '800' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 13, lineHeight: 18 },
  inputLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  sessionChipsScroll: { marginHorizontal: -4 },
  sessionChipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
  sessionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 44,
    justifyContent: 'center',
  },
  sessionChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  sessionChipText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  sessionChipTextSelected: { color: '#1D4ED8' },
  sessionChipSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  sessionChipSubSelected: { color: '#2563EB' },
  emptySessionNotice: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic' },
  selectedSessionInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedSessionText: { color: '#475569', fontSize: 12, lineHeight: 18 },
  boldText: { fontWeight: '700', color: '#10223D' },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCounter: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  charCounterOver: { color: '#DC2626' },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 96,
  },
  fieldHint: { color: '#64748B', fontSize: 11, lineHeight: 16 },
  submitButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#245BDB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonPressed: { opacity: 0.84 },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: { color: '#10223D', fontSize: 17, fontWeight: '900' },

  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderColor: '#E1E8F2',
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  itemCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitleBlock: { flex: 1, gap: 2 },
  itemMeeting: { color: '#245BDB', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  itemSubject: { color: '#10223D', fontSize: 15, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  itemDivider: { height: 1, backgroundColor: '#EDF1F6' },
  reasonSection: { gap: 4 },
  reasonLabel: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  reasonText: { color: '#334155', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  itemAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemAiTag: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  itemAiConfidence: { color: '#3B82F6', fontSize: 11 },
  reviewNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    gap: 4,
  },
  reviewNoteTitle: { color: '#1E293B', fontSize: 12, fontWeight: '800' },
  reviewNoteText: { color: '#475569', fontSize: 12, lineHeight: 18 },
  reviewTimeText: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
  itemFooterRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  itemDateText: { color: '#94A3B8', fontSize: 11 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F2',
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconText: { color: '#245BDB', fontSize: 22, fontWeight: '900' },
  emptyTitle: { color: '#10223D', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: {
    color: '#68778D',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.54)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  modalSuccessIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSuccessCheckmark: { color: '#15803D', fontSize: 30, fontWeight: '900' },
  modalTitle: { color: '#10223D', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalDesc: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  modalCloseButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#245BDB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  aiResultCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiBadgeText: { color: '#4338CA', fontSize: 11, fontWeight: '800' },
  aiDisclaimerText: { color: '#94A3B8', fontSize: 10, fontStyle: 'italic' },
  aiContent: { gap: 6 },
  aiCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiCategoryLabel: { color: '#475569', fontSize: 12, fontWeight: '700' },
  categoryPill: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillText: { color: '#1D4ED8', fontSize: 12, fontWeight: '800' },
  aiConfidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiConfidenceLabel: { color: '#64748B', fontSize: 11 },
  aiConfidenceValue: { color: '#1E293B', fontSize: 11, fontWeight: '800' },
  aiModelText: { color: '#94A3B8', fontSize: 10 },
  aiNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
  },
  aiNoticeText: { color: '#92400E', fontSize: 11, lineHeight: 16 },
  aiFallbackContent: { gap: 4 },
  aiFallbackTitle: { color: '#D97706', fontSize: 12, fontWeight: '800' },
  aiFallbackDesc: { color: '#64748B', fontSize: 11, lineHeight: 16 },
});
