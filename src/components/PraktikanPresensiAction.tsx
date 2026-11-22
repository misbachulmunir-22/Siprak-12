import { useSiprak } from "@/context/SiprakContext";
import type { Sesi } from "@/types/siprak";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TahapModal = "konfirmasi" | "berhasil" | null;

export function PraktikanPresensiAction({ sesi }: { sesi: Sesi }) {
  const { currentUser, attendances, leaveRequests, checkIn } = useSiprak();
  const [tahapModal, setTahapModal] = useState<TahapModal>(null);
  const [waktuBerhasil, setWaktuBerhasil] = useState<string | null>(null);
  const [pesanError, setPesanError] = useState("");
  const [sedangPresensi, setSedangPresensi] = useState(false);

  const presensi = currentUser
    ? attendances.find(
        (item) =>
          item.sesiId === sesi.id && item.praktikanId === currentUser.id,
      )
    : undefined;

  const waktuHadir = presensi
    ? new Date(presensi.waktuHadir).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const pengajuanIzin = currentUser
    ? leaveRequests.find(
        (item) =>
          item.sesiId === sesi.id && item.praktikanId === currentUser.id,
      )
    : undefined;

  async function konfirmasiPresensi() {
    setSedangPresensi(true);
    setPesanError("");

    try {
      const layananLokasiAktif = await Location.hasServicesEnabledAsync();

      if (!layananLokasiAktif) {
        throw new Error("Aktifkan layanan lokasi perangkat lalu coba lagi.");
      }

      const izinLokasi = await Location.requestForegroundPermissionsAsync();

      if (!izinLokasi.granted) {
        throw new Error(
          izinLokasi.canAskAgain
            ? "Izin lokasi diperlukan untuk melakukan presensi."
            : "Izin lokasi ditolak. Aktifkan izin lokasi SIPRAK melalui Pengaturan perangkat.",
        );
      }

      const lokasi = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      const hasil = await checkIn(sesi, {
        latitude: lokasi.coords.latitude,
        longitude: lokasi.coords.longitude,
        akurasiMeter: lokasi.coords.accuracy ?? 99999,
      });

      setWaktuBerhasil(hasil.waktuHadir);
      setTahapModal("berhasil");
    } catch (error) {
      setTahapModal(null);
      setPesanError(
        error instanceof Error
          ? error.message
          : "Presensi gagal disimpan. Coba lagi.",
      );
    } finally {
      setSedangPresensi(false);
    }
  }

  const waktuKonfirmasi = waktuBerhasil
    ? new Date(waktuBerhasil).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Presensi</Text>

        {currentUser?.peran !== "praktikan" ? (
          <Text style={styles.message}>
            Masuk sebagai praktikan untuk melakukan presensi.
          </Text>
        ) : presensi ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Sudah presensi</Text>
            <Text style={styles.successText}>Tercatat pukul {waktuHadir}</Text>
          </View>
        ) : pengajuanIzin ? (
          <View
            style={
              pengajuanIzin.status === "ditolak"
                ? styles.rejectedBox
                : styles.leaveBox
            }
          >
            <Text
              style={
                pengajuanIzin.status === "ditolak"
                  ? styles.rejectedTitle
                  : styles.leaveTitle
              }
            >
              {pengajuanIzin.status === "diterima"
                ? "Izin diterima"
                : pengajuanIzin.status === "ditolak"
                  ? "Izin ditolak"
                  : "Menunggu keputusan asisten"}
            </Text>
            <Text style={styles.message}>
              {pengajuanIzin.status === "ditolak"
                ? "Pengajuan izin ini tidak dapat digunakan untuk presensi pada sesi yang sama."
                : "Presensi dinonaktifkan karena kamu sudah mengajukan izin untuk sesi ini."}
            </Text>
          </View>
        ) : sesi.status === "belum_dibuka" ? (
          <Text style={styles.message}>Presensi belum dibuka.</Text>
        ) : sesi.status === "ditutup" ? (
          <Text style={styles.message}>Sesi sudah ditutup.</Text>
        ) : (
          <>
            <Text style={styles.message}>
              Tekan tombol berikut untuk mencatat kehadiranmu.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/presensi/scan",
                  params: { id: sesi.id },
                })
              }
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Pindai QR presensi</Text>
            </Pressable>
          </>
        )}

        {pesanError ? <Text style={styles.errorText}>{pesanError}</Text> : null}
      </View>

      <Modal
        visible={tahapModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTahapModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {tahapModal === "konfirmasi" ? (
              <>
                <Text style={styles.modalTitle}>Konfirmasi presensi</Text>
                <Text style={styles.message}>
                  Catat kehadiranmu untuk Pertemuan {sesi.pertemuan}?
                </Text>

                <View style={styles.buttonRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTahapModal(null)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void konfirmasiPresensi()}
                    disabled={sedangPresensi}
                    style={styles.primaryButtonSmall}
                  >
                    {sedangPresensi ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Ya, presensi</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.successIcon}>
                  <Text style={styles.successIconText}>✓</Text>
                </View>
                <Text style={styles.modalTitle}>Presensi berhasil</Text>
                <Text style={styles.message}>
                  Kehadiranmu tercatat pukul {waktuKonfirmasi}.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTahapModal(null)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Selesai</Text>
                </Pressable>
              </>
            )}
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
    lineHeight: 19,
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#174A78",
    borderRadius: 14,
    marginTop: 16,
  },
  primaryButtonSmall: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#174A78",
    borderRadius: 13,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  successBox: {
    backgroundColor: "#EAF7EF",
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  successTitle: {
    color: "#16794A",
    fontSize: 14,
    fontWeight: "800",
  },
  successText: {
    color: "#397858",
    fontSize: 13,
    marginTop: 4,
  },
  leaveBox: {
    backgroundColor: "#FFF4DF",
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  leaveTitle: { color: "#9A5B00", fontSize: 14, fontWeight: "800" },
  rejectedBox: {
    backgroundColor: "#FEF0EF",
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  rejectedTitle: { color: "#B42318", fontSize: 14, fontWeight: "800" },
  errorText: {
    color: "#B42318",
    fontSize: 13,
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
  },
  modalTitle: {
    color: "#172B3A",
    fontSize: 19,
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 13,
  },
  cancelText: {
    color: "#526273",
    fontSize: 14,
    fontWeight: "700",
  },
  successIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7EF",
    borderRadius: 22,
    marginBottom: 14,
  },
  successIconText: {
    color: "#16794A",
    fontSize: 24,
    fontWeight: "800",
  },
});
