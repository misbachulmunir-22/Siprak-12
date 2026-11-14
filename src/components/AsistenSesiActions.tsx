import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { AsistenSesiActionsProps } from '@/types/siprak';
import { useSiprakContext } from '@/context/SiprakContext';

export function AsistenSesiActions({ sesi }: AsistenSesiActionsProps) {
  const { openSession, closeSession } = useSiprakContext();

  const [modalBukaVisible, setModalBukaVisible] = useState(false);
  const [modalTutupVisible, setModalTutupVisible] = useState(false);
  const [catatanText, setCatatanText] = useState('');

  const isBelumDibuka = sesi.status === 'belum_dibuka';
  const isDibuka = sesi.status === 'dibuka';
  const isDitutup = sesi.status === 'ditutup';

  const handleConfirmBuka = () => {
    openSession(sesi.id);
    setModalBukaVisible(false);
  };

  const handleConfirmTutup = () => {
    closeSession(sesi.id, catatanText);
    setCatatanText('');
    setModalTutupVisible(false);
  };

  const handleNavigasiRekap = () => {
    router.push({
      pathname: '/rekap/[id]',
      params: { id: sesi.id },
    });
  };

  const formatWaktu = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const jam = String(d.getHours()).padStart(2, '0');
      const menit = String(d.getMinutes()).padStart(2, '0');
      return `${jam}:${menit} WIB`;
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Panel Pengelolaan Asisten</Text>
        <Text style={styles.sectionSubtitle}>
          Kelola status pelaksanaan sesi praktikum dan pantau kehadiran mahasiswa.
        </Text>

        {/* Informasi Status Sesi */}
        <View style={styles.statusInfoBox}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status Sesi</Text>
            <View
              style={[
                styles.statusPill,
                isBelumDibuka && styles.pillBelum,
                isDibuka && styles.pillDibuka,
                isDitutup && styles.pillDitutup,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  isBelumDibuka && styles.textBelum,
                  isDibuka && styles.textDibuka,
                  isDitutup && styles.textDitutup,
                ]}
              >
                {isBelumDibuka
                  ? 'Belum Dibuka'
                  : isDibuka
                  ? 'Sedang Dibuka'
                  : 'Telah Ditutup'}
              </Text>
            </View>
          </View>

          {sesi.dibukaPada ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Dibuka</Text>
              <Text style={styles.metaValue}>{formatWaktu(sesi.dibukaPada)}</Text>
            </View>
          ) : null}

          {sesi.ditutupPada ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Ditutup</Text>
              <Text style={styles.metaValue}>{formatWaktu(sesi.ditutupPada)}</Text>
            </View>
          ) : null}

          {sesi.catatanPenutup ? (
            <View style={styles.catatanBox}>
              <Text style={styles.catatanTitle}>Catatan Penutup</Text>
              <Text style={styles.catatanBody}>{sesi.catatanPenutup}</Text>
            </View>
          ) : null}
        </View>

        {/* Tombol Aksi Utama */}
        <View style={styles.actionButtonsContainer}>
          {isBelumDibuka && (
            <TouchableOpacity
              style={[styles.btnBase, styles.btnBuka]}
              onPress={() => setModalBukaVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnBukaText}>Buka Sesi Praktikum</Text>
            </TouchableOpacity>
          )}

          {isDibuka && (
            <TouchableOpacity
              style={[styles.btnBase, styles.btnTutup]}
              onPress={() => setModalTutupVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnTutupText}>Tutup Sesi Praktikum</Text>
            </TouchableOpacity>
          )}

          {isDitutup && (
            <View style={styles.infoDitutupBox}>
              <Text style={styles.infoDitutupText}>
                Sesi praktikum telah selesai dan ditutup. Pencatatan kehadiran baru tidak dapat dilakukan.
              </Text>
            </View>
          )}

          {/* Tombol Lihat Rekap Kehadiran */}
          <TouchableOpacity
            style={[styles.btnBase, styles.btnSecondary]}
            onPress={handleNavigasiRekap}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryText}>Lihat Rekap Kehadiran</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Konfirmasi Buka Sesi */}
      <Modal
        visible={modalBukaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalBukaVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Buka Sesi Praktikum</Text>
            <Text style={styles.modalMessage}>
              Sesi akan diaktifkan dan praktikan yang terdaftar dapat melakukan presensi mandiri.
            </Text>

            <View style={styles.modalDetailBox}>
              <Text style={styles.modalDetailItem}>
                Praktikum: {sesi.praktikum}
              </Text>
              <Text style={styles.modalDetailItem}>
                Pertemuan: Ke-{sesi.pertemuan} ({sesi.kelas})
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalBukaVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirmBuka]}
                onPress={handleConfirmBuka}
              >
                <Text style={styles.modalBtnConfirmText}>Konfirmasi Buka</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Tutup Sesi */}
      <Modal
        visible={modalTutupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTutupVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <ScrollView bounces={false}>
              <Text style={styles.modalTitle}>Tutup Sesi Praktikum</Text>
              <Text style={styles.modalMessage}>
                Setelah ditutup, status sesi tidak dapat dibuka kembali dan presensi baru akan ditolak.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Catatan Evaluasi / Penutup (Opsional)
                </Text>
                <TextInput
                  style={styles.textInputArea}
                  placeholder="Tuliskan catatan evaluasi sesi praktikum..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={catatanText}
                  onChangeText={setCatatanText}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setModalTutupVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirmTutup]}
                  onPress={handleConfirmTutup}
                >
                  <Text style={styles.modalBtnConfirmText}>Tutup Sesi</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  statusInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillBelum: {
    backgroundColor: '#F1F5F9',
  },
  pillDibuka: {
    backgroundColor: '#ECFDF5',
  },
  pillDitutup: {
    backgroundColor: '#FEF2F2',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textBelum: {
    color: '#64748B',
  },
  textDibuka: {
    color: '#059669',
  },
  textDitutup: {
    color: '#DC2626',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  catatanBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  catatanTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  catatanBody: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  actionButtonsContainer: {
    gap: 10,
  },
  btnBase: {
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnBuka: {
    backgroundColor: '#0F766E',
  },
  btnBukaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnTutup: {
    backgroundColor: '#DC2626',
  },
  btnTutupText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  btnSecondaryText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  infoDitutupBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoDitutupText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 16,
  },
  modalDetailBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalDetailItem: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 3,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInputArea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalBtnConfirmBuka: {
    backgroundColor: '#0F766E',
  },
  modalBtnConfirmTutup: {
    backgroundColor: '#DC2626',
  },
  modalBtnConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
