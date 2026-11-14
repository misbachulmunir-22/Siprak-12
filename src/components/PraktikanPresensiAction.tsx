import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import PresensiSuccessSheet from '@/components/PresensiSuccessSheet';
import { useSiprakContext } from '@/context/SiprakContext';
import { recordAttendance, subscribeAttendance } from '@/services/attendanceWriteService';
import type { PraktikanPresensiActionProps, Presensi } from '@/types/siprak';
import { formatJam } from '@/utils/presensi';

/**
 * Komponen Aksi Presensi Praktikan (Owner: Programmer 4)
 * Menangani:
 * - FR-S2-11: Presensi hanya saat sesi dibuka
 * - FR-S2-12: Pencegahan presensi ganda & race condition
 * - FR-S2-13: Listener presensi real-time dengan cleanup unsubscribe
 * - FR-S2-21: Loading state, error handling, konfirmasi
 */
export default function PraktikanPresensiAction({ sesi }: PraktikanPresensiActionProps) {
  const { currentUser, sessions, checkIn, getUserAttendance } = useSiprakContext();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTime, setSuccessTime] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverAttendance, setServerAttendance] = useState<Presensi | null>(null);
  const submittingRef = useRef(false);

  // Ambil data sesi paling mutakhir dari context jika ada
  const activeSesi = sessions.find((item) => item.id === sesi.id) ?? sesi;

  // Fallback ke context attendance jika serverAttendance belum terisi
  const contextAttendance = currentUser?.peran === 'praktikan'
    ? getUserAttendance(currentUser.id).find((item) => item.sesiId === activeSesi.id)
    : undefined;

  const currentAttendance = serverAttendance ?? contextAttendance;

  // Pasang listener real-time presensi sesi ini untuk praktikan aktif (FR-S2-13)
  useEffect(() => {
    if (!currentUser || currentUser.peran !== 'praktikan') return;

    const unsubscribe = subscribeAttendance(
      activeSesi.id,
      currentUser.id,
      (att) => {
        if (att) {
          setServerAttendance(att);
        }
      },
      (error) => {
        // Jangan crash UI jika listener gagal
        console.warn('Attendance listener error:', error.message);
      }
    );

    return () => {
      // Cleanup listener saat unmount / pindah layar (FR-S2-13, NFR-S2-06)
      unsubscribe();
    };
  }, [activeSesi.id, currentUser]);

  if (!currentUser || currentUser.peran !== 'praktikan') {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Masuk sebagai praktikan</Text>
        <Text style={styles.noticeText}>
          Pilih akun praktikan yang terdaftar untuk mencatat kehadiran sesi ini.
        </Text>
      </View>
    );
  }

  const hasAttended = Boolean(currentAttendance);
  const isOpen = activeSesi.status === 'dibuka';
  const isNotStarted = activeSesi.status === 'belum_dibuka';
  const isClosed = activeSesi.status === 'ditutup';

  const handleOpenConfirmation = () => {
    if (submittingRef.current || submitting) return;
    setFeedback(null);

    if (currentAttendance) {
      setFeedback({
        message: `Presensi sudah tercatat pukul ${formatJam(currentAttendance.waktuHadir)}.`,
        type: 'info',
      });
      return;
    }
    if (isNotStarted) {
      setFeedback({
        message: 'Presensi belum dibuka. Silakan tunggu hingga asisten membuka sesi praktikum.',
        type: 'info',
      });
      return;
    }
    if (isClosed) {
      setFeedback({
        message: 'Sesi praktikum sudah ditutup. Presensi baru tidak dapat dilakukan.',
        type: 'error',
      });
      return;
    }

    setConfirmVisible(true);
  };

  const handleConfirmCheckIn = async () => {
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmVisible(false);
    setFeedback(null);

    try {
      // 1. Coba catat via attendanceWriteService (Firestore / fallback service)
      const res = await recordAttendance(activeSesi, currentUser.id, activeSesi.classId);

      if (res.ok && res.attendance) {
        setServerAttendance(res.attendance);
        const formatted = formatJam(res.attendance.waktuHadir);
        setSuccessTime(formatted);
        setSuccessVisible(true);
        // Sinkronkan juga ke memory context jika context tersedia
        checkIn(activeSesi.id);
      } else if (res.reason === 'sudah_presensi') {
        if (res.attendance) setServerAttendance(res.attendance);
        setFeedback({
          message: res.message || 'Presensimu untuk sesi ini sudah tercatat.',
          type: 'info',
        });
      } else {
        setFeedback({
          message: res.message || 'Presensi gagal diproses. Silakan coba lagi.',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan jaringan atau server.';
      setFeedback({
        message: msg,
        type: 'error',
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleGoToIzin = () => {
    router.push('/praktikan/izin');
  };

  let buttonLabel = 'Presensi sekarang';
  let buttonDisabled = submitting;
  let helperText = 'Pastikan kamu berada di ruangan lab dan sesi praktikum yang benar.';
  let stateColor = '#245BDB';

  if (hasAttended && currentAttendance) {
    buttonLabel = `Sudah presensi pukul ${formatJam(currentAttendance.waktuHadir)}`;
    buttonDisabled = false; // Memungkinkan klik untuk menampilkan detail jam hadir
    helperText = 'Kehadiranmu untuk sesi ini sudah terverifikasi dan tersimpan.';
    stateColor = '#15803D';
  } else if (isNotStarted) {
    buttonLabel = 'Presensi belum dibuka';
    buttonDisabled = true;
    helperText = 'Tombol presensi akan otomatis aktif setelah asisten membuka sesi.';
    stateColor = '#64748B';
  } else if (isClosed) {
    buttonLabel = 'Sesi sudah ditutup';
    buttonDisabled = true;
    helperText = 'Sesi telah berakhir. Jika berhalangan hadir, kamu dapat mengajukan izin.';
    stateColor = '#B45309';
  }

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}>
          <Text style={styles.headingIconText}>✓</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Presensi kehadiran</Text>
          <Text style={styles.subtitle}>Pertemuan {activeSesi.pertemuan}</Text>
        </View>
      </View>

      <View style={styles.statusStrip}>
        <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
        <Text style={[styles.statusText, { color: stateColor }]}>
          {hasAttended
            ? 'Kehadiran tercatat'
            : isOpen
              ? 'Presensi tersedia'
              : isNotStarted
                ? 'Menunggu sesi dibuka'
                : 'Sesi telah selesai'}
        </Text>
      </View>

      <Text style={styles.helperText}>{helperText}</Text>

      {feedback ? (
        <View
          style={[
            styles.feedbackBox,
            feedback.type === 'error' && styles.feedbackBoxError,
            feedback.type === 'success' && styles.feedbackBoxSuccess,
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text
            style={[
              styles.feedbackText,
              feedback.type === 'error' && styles.feedbackTextError,
              feedback.type === 'success' && styles.feedbackTextSuccess,
            ]}
          >
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityState={{ disabled: buttonDisabled }}
        disabled={buttonDisabled}
        onPress={handleOpenConfirmation}
        style={({ pressed }) => [
          styles.primaryButton,
          buttonDisabled && styles.primaryButtonDisabled,
          hasAttended && styles.primaryButtonAttended,
          pressed && !buttonDisabled && styles.primaryButtonPressed,
        ]}
      >
        {submitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Mencatat presensi...</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.primaryButtonText,
              buttonDisabled && styles.primaryButtonTextDisabled,
              hasAttended && styles.primaryButtonTextAttended,
            ]}
          >
            {buttonLabel}
          </Text>
        )}
      </Pressable>

      {/* Akses cepat ke pengajuan izin bagi praktikan yang berhalangan hadir */}
      {!hasAttended ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tidak dapat hadir? Ajukan izin praktikum"
          onPress={handleGoToIzin}
          hitSlop={8}
          style={styles.izinLink}
        >
          <Text style={styles.izinLinkText}>Berhalangan hadir? Ajukan izin praktikum ›</Text>
        </Pressable>
      ) : null}

      {/* Modal Konfirmasi Presensi */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>?</Text>
            </View>
            <Text style={styles.modalTitle}>Konfirmasi presensi</Text>
            <Text style={styles.modalDescription}>
              Kamu akan mencatat kehadiran untuk{' '}
              <Text style={styles.boldText}>{activeSesi.praktikum}</Text>, kelas{' '}
              <Text style={styles.boldText}>{activeSesi.kelas}</Text>. Pastikan kamu telah berada
              di ruangan lab praktikum.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Batal presensi"
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ya, konfirmasi presensi sekarang"
                onPress={handleConfirmCheckIn}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.confirmButtonText}>Ya, presensi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Sukses Presensi */}
      <PresensiSuccessSheet
        visible={successVisible}
        waktuHadir={successTime}
        pertemuan={activeSesi.pertemuan}
        praktikum={activeSesi.praktikum}
        onClose={() => setSuccessVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8F2',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FF',
  },
  headingIconText: { color: '#245BDB', fontWeight: '900', fontSize: 23 },
  headingCopy: { flex: 1, gap: 2 },
  title: { color: '#10223D', fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#748198', fontSize: 13 },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F6F8FC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  helperText: { color: '#63738A', fontSize: 13, lineHeight: 19 },
  feedbackBox: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  feedbackBoxError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackBoxSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  feedbackText: { color: '#9A3412', fontSize: 13, lineHeight: 19 },
  feedbackTextError: { color: '#B91C1C' },
  feedbackTextSuccess: { color: '#15803D' },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#245BDB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#DCE3EC',
  },
  primaryButtonAttended: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  primaryButtonPressed: { opacity: 0.82 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonTextDisabled: { color: '#64748B' },
  primaryButtonTextAttended: { color: '#166534' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  izinLink: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  izinLinkText: {
    color: '#245BDB',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FF',
    marginBottom: 14,
  },
  modalIconText: { color: '#245BDB', fontSize: 24, fontWeight: '900' },
  modalTitle: { color: '#10223D', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalDescription: {
    color: '#65748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  boldText: { fontWeight: '700', color: '#10223D' },
  modalActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#334155', fontSize: 14, fontWeight: '800' },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#245BDB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  notice: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noticeTitle: { color: '#10223D', fontSize: 15, fontWeight: '800' },
  noticeText: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 5 },
});
