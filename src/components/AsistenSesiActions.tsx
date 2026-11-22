import { useSiprak } from "@/context/SiprakContext";
import {
  arsipkanSesiKelas,
  hapusSesiKelas,
  pulihkanSesiKelas,
  terbitkanKodeQrPresensi,
} from "@/lib/firebase-sessions";
import type { Sesi } from "@/types/siprak";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

type ModeAksi = "arsip" | "pulihkan" | "hapus" | "buka" | "tutup" | null;

export function AsistenSesiActions({ sesi }: { sesi: Sesi }) {
  const { openSession, closeSession, refreshSessions } = useSiprak();
  const router = useRouter();
  const [mode, setMode] = useState<ModeAksi>(null);
  const [catatan, setCatatan] = useState("");
  const [pesanAksi, setPesanAksi] = useState("");
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [nilaiQr, setNilaiQr] = useState<string | null>(null);
  const [pesanQr, setPesanQr] = useState("");

  useEffect(() => {
    if (sesi.status !== "dibuka" || sesi.legacy) return;

    let aktif = true;
    let sedangMemperbarui = false;

    async function perbaruiQr() {
      if (sedangMemperbarui) return;
      sedangMemperbarui = true;

      try {
        const hasil = await terbitkanKodeQrPresensi(sesi);

        if (aktif) {
          setNilaiQr(
            JSON.stringify({
              versi: 1,
              sesiId: sesi.id,
              token: hasil.token,
            }),
          );
          setPesanQr("");
        }
      } catch (error) {
        if (aktif) {
          setPesanQr(
            error instanceof Error
              ? error.message
              : "QR presensi gagal dibuat.",
          );
        }
      } finally {
        sedangMemperbarui = false;
      }
    }

    void perbaruiQr();
    const interval = setInterval(() => void perbaruiQr(), 30_000);

    return () => {
      aktif = false;
      clearInterval(interval);
    };
  }, [sesi]);

  function batalkan() {
    setMode(null);
    setCatatan("");
    setPesanAksi("");
  }

  function bukaFormEdit() {
    router.push({
      pathname: "/asisten/kelas/sesi-form",
      params: {
        kelasId: sesi.kelasId,
        praktikumId: sesi.praktikumId,
        sesiId: sesi.id,
      },
    });
  }

  async function konfirmasi() {
    if (mode === "arsip") {
      setSedangMenyimpan(true);
      setPesanAksi("");

      let berhasil = false;

      try {
        await arsipkanSesiKelas(sesi);
        berhasil = true;
      } catch (error) {
        setPesanAksi(
          error instanceof Error
            ? error.message
            : "Sesi gagal diarsipkan. Coba lagi.",
        );
      } finally {
        setSedangMenyimpan(false);
      }

      if (berhasil) {
        batalkan();
        router.back();
      }

      return;
    }

    if (mode === "pulihkan" || mode === "hapus") {
      setSedangMenyimpan(true);
      setPesanAksi("");
      try {
        if (mode === "pulihkan") await pulihkanSesiKelas(sesi);
        else await hapusSesiKelas(sesi);
        await refreshSessions();
        batalkan();
        router.back();
      } catch (error) {
        setPesanAksi(
          error instanceof Error
            ? error.message
            : "Perubahan sesi gagal disimpan.",
        );
      } finally {
        setSedangMenyimpan(false);
      }
      return;
    }

    if (mode === "buka" || mode === "tutup") {
      setSedangMenyimpan(true);
      setPesanAksi("");

      try {
        if (mode === "buka") {
          await openSession(sesi);
        } else {
          await closeSession(sesi, catatan);
        }

        batalkan();
      } catch (error) {
        setPesanAksi(
          error instanceof Error
            ? error.message
            : "Perubahan status sesi gagal disimpan.",
        );
      } finally {
        setSedangMenyimpan(false);
      }

      return;
    }
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Aksi sesi</Text>

        {sesi.status === "belum_dibuka" ? (
          <>
            <Text style={styles.description}>
              Sesi ini belum dibuka. Kamu masih dapat mengubah jadwalnya.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={bukaFormEdit}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Edit sesi</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("arsip")}
              style={styles.archiveButton}
            >
              <Text style={styles.archiveButtonText}>Arsipkan sesi</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("buka")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Buka sesi</Text>
            </Pressable>
          </>
        ) : null}

        {sesi.status === "dibuka" ? (
          <>
            <View style={styles.qrBox}>
              <Text style={styles.qrTitle}>QR presensi praktikan</Text>

              {nilaiQr ? (
                <View style={styles.qrFrame}>
                  <QRCode value={nilaiQr} size={220} />
                </View>
              ) : (
                <ActivityIndicator style={styles.qrLoader} color="#174A78" />
              )}

              {pesanQr ? (
                <Text style={styles.qrError}>{pesanQr}</Text>
              ) : (
                <Text style={styles.qrHint}>
                  Tampilkan QR ini kepada praktikan. Kode diperbarui otomatis
                  setiap 30 detik.
                </Text>
              )}
            </View>
            <Text style={styles.description}>
              Sesi sedang berjalan. Setelah ditutup, presensi baru tidak dapat
              dilakukan.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("tutup")}
              style={styles.closeButton}
            >
              <Text style={styles.primaryButtonText}>Tutup sesi</Text>
            </Pressable>
          </>
        ) : null}

        {sesi.status === "ditutup" ? (
          <Text style={styles.description}>
            Sesi sudah ditutup. Presensi baru tidak dapat dilakukan.
          </Text>
        ) : null}

        {sesi.status === "diarsipkan" ? (
          <>
            <Text style={styles.description}>
              Sesi ini diarsipkan. Kamu dapat memulihkan atau menghapusnya bila
              tidak memiliki riwayat.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("pulihkan")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Pulihkan sesi</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("hapus")}
              style={styles.archiveButton}
            >
              <Text style={styles.archiveButtonText}>Hapus sesi</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <Modal
        visible={mode !== null}
        transparent
        animationType="slide"
        onRequestClose={batalkan}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <Text style={styles.modalTitle}>
                  {mode === "buka"
                    ? "Buka sesi ini?"
                    : mode === "arsip"
                      ? "Arsipkan sesi ini?"
                      : mode === "pulihkan"
                        ? "Pulihkan sesi ini?"
                        : mode === "hapus"
                          ? "Hapus sesi ini?"
                          : "Tutup sesi ini?"}
                </Text>

                {
                  <>
                    <Text style={styles.description}>
                      {mode === "buka"
                        ? "Praktikan akan dapat melakukan presensi setelah sesi dibuka."
                        : mode === "arsip"
                          ? "Sesi akan disembunyikan dari jadwal aktif. Data sesi tetap tersimpan."
                          : mode === "pulihkan"
                            ? "Sesi kembali masuk ke daftar praktikum dan jadwal."
                            : mode === "hapus"
                              ? "Sesi hanya dapat dihapus jika belum memiliki presensi atau perizinan."
                              : "Pastikan rekap kehadiran sudah diperiksa. Catatan penutup boleh dikosongkan."}
                    </Text>

                    {mode === "tutup" ? (
                      <TextInput
                        value={catatan}
                        onChangeText={setCatatan}
                        placeholder="Catatan penutup (opsional)"
                        placeholderTextColor="#8A98A5"
                        multiline
                        maxLength={200}
                        textAlignVertical="top"
                        style={styles.noteInput}
                      />
                    ) : null}
                  </>
                }

                {pesanAksi ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{pesanAksi}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={batalkan}
                  disabled={sedangMenyimpan}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void konfirmasi()}
                  disabled={sedangMenyimpan}
                  style={[
                    styles.confirmButton,
                    sedangMenyimpan && styles.disabledButton,
                  ]}
                >
                  {sedangMenyimpan ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>
                      {mode === "buka"
                        ? "Ya, buka"
                        : mode === "arsip"
                          ? "Ya, arsipkan"
                          : mode === "pulihkan"
                            ? "Pulihkan"
                            : mode === "hapus"
                              ? "Hapus permanen"
                              : "Ya, tutup"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  qrBox: {
    alignItems: "center",
    backgroundColor: "#F4F7FB",
    borderRadius: 14,
    marginTop: 14,
    padding: 14,
  },
  qrTitle: {
    color: "#172B3A",
    fontSize: 15,
    fontWeight: "800",
  },
  qrFrame: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 12,
    padding: 10,
  },
  qrLoader: {
    marginTop: 20,
  },
  qrHint: {
    color: "#647789",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: "center",
  },
  qrError: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
    padding: 18,
  },
  archiveButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF0EF",
    borderRadius: 14,
    marginTop: 10,
  },
  archiveButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    color: "#172B3A",
    fontSize: 16,
    fontWeight: "800",
  },
  description: {
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
    marginTop: 12,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3F9",
    borderRadius: 14,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: "#174A78",
    fontSize: 14,
    fontWeight: "800",
  },
  closeButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#475569",
    borderRadius: 14,
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: 12,
  },
  modalCard: {
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    color: "#172B3A",
    fontSize: 19,
    fontWeight: "800",
  },
  noteInput: {
    minHeight: 96,
    borderColor: "#DCE5ED",
    borderRadius: 12,
    borderWidth: 1,
    color: "#172B3A",
    fontSize: 14,
    marginTop: 16,
    padding: 12,
  },
  errorBox: {
    backgroundColor: "#FEF0EF",
    borderRadius: 12,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingTop: 8,
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
  confirmButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#174A78",
    borderRadius: 13,
    paddingHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
