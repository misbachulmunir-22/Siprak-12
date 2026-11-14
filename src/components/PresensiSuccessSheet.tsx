import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type PresensiSuccessSheetProps = {
  visible: boolean;
  waktuHadir: string;
  pertemuan?: number;
  praktikum?: string;
  onClose: () => void;
};

/**
 * Bottom sheet lokal untuk konfirmasi sukses presensi praktikan.
 * Memenuhi NFR-S2-07 (Area sentuh >= 44dp, Bahasa Indonesia).
 */
export default function PresensiSuccessSheet({
  visible,
  waktuHadir,
  pertemuan,
  praktikum,
  onClose,
}: PresensiSuccessSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup konfirmasi presensi"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.title}>Presensi berhasil!</Text>
          <Text style={styles.description}>
            {praktikum
              ? `Kehadiranmu untuk ${praktikum}${pertemuan ? ` Pertemuan ${pertemuan}` : ''} telah tersimpan di server.`
              : 'Kehadiranmu sudah tercatat pada sesi ini. Berikut waktu presensi resmi yang tersimpan.'}
          </Text>

          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>WAKTU KEHADIRAN RESMI</Text>
            <Text style={styles.timeValue}>{waktuHadir}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Selesai dan tutup"
            onPress={onClose}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Selesai</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#D8DEE8',
    marginBottom: 20,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    marginBottom: 16,
  },
  checkmark: { color: '#15803D', fontSize: 34, fontWeight: '800' },
  title: {
    color: '#10223D',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: '#65748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  timeCard: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 20,
    alignItems: 'center',
  },
  timeLabel: { color: '#166534', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  timeValue: { color: '#15803D', fontSize: 24, fontWeight: '900', marginTop: 4 },
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#245BDB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.86 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
