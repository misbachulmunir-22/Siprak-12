import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import PresensiSuccessSheet from '@/components/PresensiSuccessSheet';
import { useSiprakContext } from '@/context/SiprakContext';
import type { PraktikanPresensiActionProps } from '@/types/siprak';

type CheckInReason = 'belum_dibuka' | 'ditutup' | 'sudah_presensi';

function formatJam(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function reasonMessage(reason: CheckInReason | undefined): string {
  switch (reason) {
    case 'belum_dibuka':
      return 'Presensi belum dibuka oleh asisten. Silakan tunggu sampai sesi dimulai.';
    case 'ditutup':
      return 'Sesi sudah ditutup. Presensi baru tidak dapat dilakukan.';
    case 'sudah_presensi':
      return 'Presensimu untuk sesi ini sudah tercatat. Kamu tidak perlu melakukan presensi lagi.';
    default:
      return 'Presensi belum dapat diproses. Periksa status sesi atau coba lagi.';
  }
}

/** Aksi presensi Programmer 4 pada halaman detail sesi. */
export default function PraktikanPresensiAction({ sesi }: PraktikanPresensiActionProps) {
  const { currentUser, sessions, getUserAttendance, checkIn } = useSiprakContext();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTime, setSuccessTime] = useState('');
  const [feedback, setFeedback] = useState('');
  const [waitingForAttendance, setWaitingForAttendance] = useState(false);
  const submittingRef = useRef(false);

  // Context adalah sumber data terbaru; prop menjadi fallback saat sesi tidak ditemukan.
  const activeSesi = sessions.find((item) => item.id === sesi.id) ?? sesi;
  const attendance = currentUser?.peran === 'praktikan'
    ? getUserAttendance(currentUser.id).find((item) => item.sesiId === activeSesi.id)
    : undefined;

  // Gunakan waktu persis yang disimpan Context, bukan membuat cap waktu kedua di UI.
  useEffect(() => {
    if (waitingForAttendance && attendance) {
      setSuccessTime(formatJam(attendance.waktuHadir));
      setSuccessVisible(true);
      setWaitingForAttendance(false);
      submittingRef.current = false;
      setFeedback('');
    }
  }, [attendance, waitingForAttendance]);

  if (!currentUser || currentUser.peran !== 'praktikan') {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Masuk sebagai praktikan</Text>
        <Text style={styles.noticeText}>Pilih identitas praktikan untuk melakukan presensi.</Text>
      </View>
    );
  }

  const hasAttended = Boolean(attendance);
  const isOpen = activeSesi.status === 'dibuka';
  const isNotStarted = activeSesi.status === 'belum_dibuka';
  const isClosed = activeSesi.status === 'ditutup';

  const openConfirmation = () => {
    if (submittingRef.current || waitingForAttendance) return;
    setFeedback('');
    if (attendance) {
      setFeedback(`Presensi sudah tercatat pukul ${formatJam(attendance.waktuHadir)}.`);
      return;
    }
    if (isNotStarted) {
      setFeedback('Presensi belum dibuka. Silakan tunggu sampai asisten membuka sesi.');
      return;
    }
    if (isClosed) {
      setFeedback('Sesi sudah ditutup. Presensi baru tidak dapat dilakukan.');
      return;
    }
    setConfirmVisible(true);
  };

  const confirmCheckIn = () => {
    // Tahan pengiriman sampai Context mengembalikan catatan presensi terbaru.
    if (submittingRef.current || waitingForAttendance) return;
    submittingRef.current = true;
    setConfirmVisible(false);
    let accepted = false;

    try {
      const result = checkIn(activeSesi.id);
      if (!result.ok) {
        setFeedback(reasonMessage(result.reason));
        return;
      }

      accepted = true;
      setFeedback('');
      setWaitingForAttendance(true);
    } catch {
      setFeedback('Presensi gagal diproses. Silakan coba lagi.');
    } finally {
      if (!accepted) submittingRef.current = false;
    }
  };

  let buttonLabel = 'Presensi sekarang';
  let buttonDisabled = waitingForAttendance;
  let helperText = 'Pastikan kamu berada di sesi praktikum yang benar.';
  let stateColor = '#245BDB';

  if (hasAttended && attendance) {
    buttonLabel = `Sudah presensi pukul ${formatJam(attendance.waktuHadir)}`;
    // Tombol tetap dapat ditekan untuk menampilkan pesan, tetapi tidak mengirim presensi kedua.
    helperText = 'Kehadiranmu untuk sesi ini sudah tersimpan.';
    stateColor = '#15803D';
  } else if (isNotStarted) {
    buttonLabel = 'Presensi belum dibuka';
    buttonDisabled = true;
    helperText = 'Tombol presensi aktif setelah asisten membuka sesi.';
    stateColor = '#64748B';
  } else if (isClosed) {
    buttonLabel = 'Sesi sudah ditutup';
    buttonDisabled = true;
    helperText = 'Hubungi asisten jika ada kendala kehadiran.';
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
        <View style={styles.feedbackBox} accessibilityLiveRegion="polite">
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: buttonDisabled }}
        disabled={buttonDisabled}
        onPress={openConfirmation}
        style={({ pressed }) => [
          styles.primaryButton,
          buttonDisabled && styles.primaryButtonDisabled,
          hasAttended && styles.primaryButtonAttended,
          pressed && !buttonDisabled && styles.primaryButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.primaryButtonText,
            buttonDisabled && styles.primaryButtonTextDisabled,
            hasAttended && styles.primaryButtonTextAttended,
          ]}
        >
          {waitingForAttendance ? 'Mencatat presensi...' : buttonLabel}
        </Text>
      </Pressable>

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
              Kamu akan mencatat kehadiran untuk {activeSesi.praktikum}, kelas {activeSesi.kelas}. Pastikan sesi ini benar.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.primaryButtonPressed]}
              >
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmCheckIn}
                style={({ pressed }) => [styles.confirmButton, pressed && styles.primaryButtonPressed]}
              >
                <Text style={styles.confirmButtonText}>Ya, presensi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PresensiSuccessSheet
        visible={successVisible}
        waktuHadir={successTime}
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
  feedbackText: { color: '#9A3412', fontSize: 13, lineHeight: 19 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#245BDB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  primaryButtonDisabled: { backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#DCE3EC' },
  primaryButtonAttended: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#BBF7D0' },
  primaryButtonPressed: { opacity: 0.82 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  primaryButtonTextDisabled: { color: '#64748B' },
  primaryButtonTextAttended: { color: '#166534' },
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
  notice: { padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  noticeTitle: { color: '#10223D', fontSize: 15, fontWeight: '800' },
  noticeText: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 5 },
});
