import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSiprak } from "@/context/SiprakContext";
import { pesanErrorKlasifikasi } from "@/lib/firebase-izin";
import type { Sesi } from "@/types/siprak";

export function PraktikanIzinAction({ sesi }: { sesi: Sesi }) {
  const { currentUser, attendances, leaveRequests, submitLeave } = useSiprak();

  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [pesanError, setPesanError] = useState("");
  const [sedangMengirim, setSedangMengirim] = useState(false);

  const pengajuanTersimpan = leaveRequests.find(
    (item) =>
      item.kelasId === sesi.kelasId &&
      item.sesiId === sesi.id &&
      item.praktikanId === currentUser?.id,
  );

  const sudahPresensi = currentUser
    ? attendances.some(
        (item) =>
          item.sesiId === sesi.id && item.praktikanId === currentUser.id,
      )
    : false;

  async function kirimPengajuan() {
    setPesanError("");
    setSedangMengirim(true);

    try {
      await submitLeave(sesi, alasan);
      setAlasan("");
      setModalTerbuka(false);
    } catch (error) {
      const pesan =
        error instanceof Error
          ? error.message
          : "Pengajuan izin gagal disimpan. Coba lagi.";

      setPesanError(
        pesan.includes("permission-denied")
          ? "Pengajuan ditolak oleh aturan akses Firebase. Periksa Firestore Rules."
          : pesan,
      );
    } finally {
      setSedangMengirim(false);
    }
  }

  const statusIzin = pengajuanTersimpan?.status;

  const labelStatus =
    statusIzin === "diterima"
      ? "Izin diterima"
      : statusIzin === "ditolak"
        ? "Izin ditolak"
        : "Menunggu keputusan asisten";

  const statusBoxStyle =
    statusIzin === "ditolak"
      ? styles.statusBoxDitolak
      : statusIzin === "diterima"
        ? styles.statusBoxDiterima
        : styles.statusBoxMenunggu;

  const statusTitleStyle =
    statusIzin === "ditolak"
      ? styles.statusTitleDitolak
      : statusIzin === "diterima"
        ? styles.statusTitleDiterima
        : styles.statusTitleMenunggu;

  const labelKlasifikasi =
    pengajuanTersimpan?.klasifikasiStatus === "berhasil"
      ? "Selesai"
      : pengajuanTersimpan?.klasifikasiStatus === "gagal"
        ? "Gagal diproses"
        : "Menunggu";

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Pengajuan izin</Text>

        {pengajuanTersimpan ? (
          <View style={[styles.statusBox, statusBoxStyle]}>
            <Text style={[styles.statusTitle, statusTitleStyle]}>
              {labelStatus}
            </Text>

            <Text style={styles.sectionLabel}>Alasan yang dikirim</Text>
            <Text style={styles.message}>{pengajuanTersimpan.alasan}</Text>

            <Text style={styles.sectionLabel}>Klasifikasi AI</Text>
            <Text style={styles.message}>
              {pengajuanTersimpan.kategoriAI
                ? `${pengajuanTersimpan.kategoriAI}${pengajuanTersimpan.klasifikasiStatus === "berhasil" ? "" : " · hasil belum tersimpan"}`
                : labelKlasifikasi}
            </Text>

            {pengajuanTersimpan.klasifikasiError ? (
              <Text style={styles.message}>
                {pesanErrorKlasifikasi(pengajuanTersimpan.klasifikasiError)}
              </Text>
            ) : null}

            {pengajuanTersimpan.klasifikasiStatus !== "berhasil" ? (
              <Text style={styles.message}>
                Alasanmu tetap tersimpan. Asisten dapat mencoba klasifikasi
                kembali. Keputusan akhir tetap dilakukan oleh asisten.
              </Text>
            ) : null}

            {pengajuanTersimpan.catatanAsisten ? (
              <>
                <Text style={styles.sectionLabel}>Catatan asisten</Text>
                <Text style={styles.message}>
                  {pengajuanTersimpan.catatanAsisten}
                </Text>
              </>
            ) : null}
          </View>
        ) : sudahPresensi ? (
          <Text style={styles.message}>
            Kamu sudah tercatat hadir pada sesi ini, jadi tidak dapat mengajukan
            izin.
          </Text>
        ) : sesi.status === "belum_dibuka" ? (
          <Text style={styles.message}>
            Izin dapat diajukan setelah sesi dibuka.
          </Text>
        ) : (
          <>
            <Text style={styles.message}>
              Alasanmu akan disimpan dan diklasifikasikan oleh AI. Keputusan
              akhir tetap diberikan oleh asisten.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPesanError("");
                setModalTerbuka(true);
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Ajukan izin</Text>
            </Pressable>
          </>
        )}
      </View>

      <Modal
        visible={modalTerbuka}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!sedangMengirim) setModalTerbuka(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Ajukan izin</Text>
              <Text style={styles.message}>
                Pertemuan {sesi.pertemuan} · {sesi.praktikum}
              </Text>

              <Text style={styles.inputLabel}>Alasan izin</Text>
              <TextInput
                accessibilityLabel="Alasan izin"
                value={alasan}
                onChangeText={(value) => {
                  setAlasan(value);
                  setPesanError("");
                }}
                placeholder="Jelaskan alasan kamu tidak dapat hadir"
                placeholderTextColor="#8A9AAA"
                multiline
                maxLength={1000}
                textAlignVertical="top"
                editable={!sedangMengirim}
                style={styles.input}
              />

              <Text style={styles.helperText}>
                Minimal 10 karakter · {alasan.trim().length}/1000
              </Text>
              <Text style={styles.helperText}>
                Alasan disimpan terlebih dahulu. Klasifikasi AI hanya saran;
                keputusan akhir diberikan asisten.
              </Text>

              {pesanError ? (
                <Text style={styles.errorText}>{pesanError}</Text>
              ) : null}

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={sedangMengirim}
                  onPress={() => setModalTerbuka(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={sedangMengirim || alasan.trim().length < 10}
                  onPress={() => void kirimPengajuan()}
                  style={[
                    styles.primaryButton,
                    (sedangMengirim || alasan.trim().length < 10) &&
                      styles.disabledButton,
                  ]}
                >
                  {sedangMengirim ? (
                    <View style={styles.sendingContent}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.primaryButtonText}>
                        Mengirim dan mengklasifikasi…
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Kirim pengajuan
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  title: {
    color: "#172B3A",
    fontSize: 16,
    fontWeight: "800",
  },
  message: {
    color: "#647789",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  sectionLabel: {
    color: "#263B4B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
  },
  statusBox: {
    borderRadius: 14,
    marginTop: 14,
    padding: 14,
  },
  statusBoxDiterima: {
    backgroundColor: "#E8F7EE",
  },
  statusBoxDitolak: {
    backgroundColor: "#FFF0F0",
  },
  statusBoxMenunggu: {
    backgroundColor: "#FFF7E5",
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusTitleDiterima: {
    color: "#16794A",
  },
  statusTitleDitolak: {
    color: "#C62828",
  },
  statusTitleMenunggu: {
    color: "#956000",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#075985",
    borderRadius: 13,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  sendingContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  modalContent: {
    paddingBottom: 28,
  },
  modalTitle: {
    color: "#172B3A",
    fontSize: 21,
    fontWeight: "800",
  },
  inputLabel: {
    color: "#263B4B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 22,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7E3ED",
    borderRadius: 14,
    borderWidth: 1,
    color: "#172B3A",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    minHeight: 130,
    padding: 14,
  },
  helperText: {
    color: "#647789",
    fontSize: 12,
    marginTop: 7,
  },
  errorText: {
    backgroundColor: "#FFF0F0",
    borderRadius: 12,
    color: "#C62828",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    padding: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#EEF3F7",
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: "#526273",
    fontSize: 14,
    fontWeight: "800",
  },
});
