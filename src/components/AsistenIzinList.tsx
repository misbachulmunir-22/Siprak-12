import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { DataState, SkeletonCards } from "@/components/DataStates";
import {
  klasifikasikanUlangIzin,
  pesanErrorKlasifikasi,
  putuskanIzin,
} from "@/lib/firebase-izin";
import type {
  PengajuanIzin,
  Sesi,
  StatusKlasifikasiIzin,
  StatusPengajuanIzin,
} from "@/types/siprak";

type KeputusanIzin = "diterima" | "ditolak";

function pesanErrorAksi(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes("permission-denied")) {
    return "Firebase menolak perubahan. Periksa Firestore Rules dan akun asisten.";
  }
  return error.message || fallback;
}

const LABEL_STATUS: Record<StatusPengajuanIzin, string> = {
  menunggu: "Menunggu pemeriksaan",
  diterima: "Izin diterima",
  ditolak: "Izin ditolak",
};

const LABEL_KLASIFIKASI: Record<StatusKlasifikasiIzin, string> = {
  menunggu: "Menunggu klasifikasi AI",
  berhasil: "Klasifikasi selesai",
  gagal: "Klasifikasi gagal",
};

export function AsistenIzinList({ sesi }: { sesi: Sesi }) {
  const { leaveRequests, refreshSessions } = useSiprak();

  const [pesanError, setPesanError] = useState("");
  const [pesanErrorSimpan, setPesanErrorSimpan] = useState("");
  const [pesanKlasifikasi, setPesanKlasifikasi] = useState<
    Record<string, string>
  >({});
  const [pengajuanDipilih, setPengajuanDipilih] =
    useState<PengajuanIzin | null>(null);
  const [keputusanDipilih, setKeputusanDipilih] =
    useState<KeputusanIzin | null>(null);
  const [catatan, setCatatan] = useState("");
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [sedangKlasifikasiId, setSedangKlasifikasiId] = useState<string | null>(
    null,
  );

  const muatIzin = useCallback(async () => {
    setSedangMemuat(true);
    setPesanError("");
    try {
      await refreshSessions();
    } catch (error) {
      setPesanError(error instanceof Error ? error.message : "Pengajuan izin gagal dimuat.");
    } finally {
      setSedangMemuat(false);
    }
  }, [refreshSessions]);

  useFocusEffect(useCallback(() => { void muatIzin(); }, [muatIzin]));

  const izinSesi = leaveRequests.filter(
    (pengajuan) =>
      pengajuan.kelasId === sesi.kelasId && pengajuan.sesiId === sesi.id,
  );

  function mulaiMemutuskan(pengajuan: PengajuanIzin, keputusan: KeputusanIzin) {
    setPengajuanDipilih(pengajuan);
    setKeputusanDipilih(keputusan);
    setCatatan("");
    setPesanErrorSimpan("");
  }

  function tutupModal() {
    if (sedangMenyimpan) return;

    setPengajuanDipilih(null);
    setKeputusanDipilih(null);
    setCatatan("");
    setPesanErrorSimpan("");
  }

  async function klasifikasiUlang(pengajuan: PengajuanIzin) {
    setSedangKlasifikasiId(pengajuan.id);
    setPesanKlasifikasi((sebelumnya) => ({
      ...sebelumnya,
      [pengajuan.id]: "",
    }));

    try {
      await klasifikasikanUlangIzin(sesi, pengajuan);
      await refreshSessions();
    } catch (error) {
      setPesanKlasifikasi((sebelumnya) => ({
        ...sebelumnya,
        [pengajuan.id]: pesanErrorAksi(
          error,
          "Klasifikasi ulang gagal. Coba lagi.",
        ),
      }));
    } finally {
      setSedangKlasifikasiId(null);
    }
  }

  async function simpanKeputusan() {
    const pengajuan = pengajuanDipilih;
    const keputusan = keputusanDipilih;

    if (!pengajuan || !keputusan) return;

    setPesanErrorSimpan("");
    setSedangMenyimpan(true);

    try {
      await putuskanIzin(sesi, pengajuan, keputusan, catatan);
      await refreshSessions();

      setPengajuanDipilih(null);
      setKeputusanDipilih(null);
      setCatatan("");
    } catch (error) {
      setPesanErrorSimpan(
        pesanErrorAksi(error, "Keputusan izin gagal disimpan. Coba lagi."),
      );
    } finally {
      setSedangMenyimpan(false);
    }
  }

  const labelKeputusan =
    keputusanDipilih === "diterima" ? "Terima izin" : "Tolak izin";

  return (
    <>
      <View>
        <Text style={styles.sectionTitle}>
          Pengajuan izin · {izinSesi.length}
        </Text>

        {sedangMemuat ? (
          <SkeletonCards count={2} />
        ) : pesanError ? (
          <DataState kind="error" compact title="Pengajuan izin belum bisa dimuat" message={pesanError} actionLabel="Coba lagi" onAction={() => void muatIzin()} />
        ) : izinSesi.length === 0 ? (
          <DataState kind="empty" compact title="Belum ada pengajuan izin" message="Pengajuan izin untuk sesi ini akan tampil di sini." />
        ) : (
          izinSesi.map((pengajuan) => {
            const sedangMemproses = sedangKlasifikasiId === pengajuan.id;

            return (
              <View
                key={`${pengajuan.sesiId}-${pengajuan.id}`}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.personInfo}>
                    <Text style={styles.name}>{pengajuan.namaPraktikan}</Text>
                    <Text style={styles.meta}>NIM {pengajuan.nim}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {LABEL_STATUS[pengajuan.status]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.label}>Alasan praktikan</Text>
                <Text style={styles.reason}>{pengajuan.alasan}</Text>

                <View style={styles.aiBox}>
                  <Text style={styles.label}>Klasifikasi AI</Text>
                  <Text style={styles.aiText}>
                    {pengajuan.klasifikasiStatus === "berhasil" &&
                    pengajuan.kategoriAI
                      ? pengajuan.kategoriAI
                      : LABEL_KLASIFIKASI[pengajuan.klasifikasiStatus]}
                  </Text>

                  {pengajuan.klasifikasiError ? (
                    <Text style={styles.classificationErrorText}>
                      {pesanErrorKlasifikasi(pengajuan.klasifikasiError)}
                    </Text>
                  ) : null}

                  {pengajuan.klasifikasiStatus === "gagal" &&
                  pengajuan.kategoriAI ? (
                    <Text style={styles.meta}>
                      Hasil sebelumnya: {pengajuan.kategoriAI}
                    </Text>
                  ) : null}

                  {pengajuan.status === "menunggu" ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={sedangKlasifikasiId !== null}
                      onPress={() => void klasifikasiUlang(pengajuan)}
                      style={[
                        styles.retryButton,
                        sedangKlasifikasiId !== null && styles.disabledButton,
                      ]}
                    >
                      {sedangMemproses ? (
                        <View style={styles.retryButtonBusy}>
                          <ActivityIndicator color="#075985" size="small" />
                          <Text style={styles.retryButtonText}>
                            Mengklasifikasi…
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.retryButtonText}>
                          {pengajuan.klasifikasiStatus === "berhasil"
                            ? "Klasifikasikan ulang"
                            : "Coba klasifikasi"}
                        </Text>
                      )}
                    </Pressable>
                  ) : null}

                  {pesanKlasifikasi[pengajuan.id] ? (
                    <Text style={styles.errorText}>
                      {pesanKlasifikasi[pengajuan.id]}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.aiDisclaimer}>
                  Hasil AI hanya saran. Keputusan akhir tetap di tangan asisten.
                </Text>

                {pengajuan.catatanAsisten ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.label}>Catatan asisten</Text>
                    <Text style={styles.noteText}>
                      {pengajuan.catatanAsisten}
                    </Text>
                  </View>
                ) : null}

                {pengajuan.status === "menunggu" ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => mulaiMemutuskan(pengajuan, "ditolak")}
                      style={styles.rejectButton}
                    >
                      <Text style={styles.actionButtonText}>Tolak</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => mulaiMemutuskan(pengajuan, "diterima")}
                      style={styles.acceptButton}
                    >
                      <Text style={styles.actionButtonText}>Terima</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <Modal
        visible={pengajuanDipilih !== null}
        transparent
        animationType="slide"
        onRequestClose={tutupModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalTitle}>{labelKeputusan}</Text>

              {pengajuanDipilih ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    {pengajuanDipilih.namaPraktikan} · NIM{" "}
                    {pengajuanDipilih.nim}
                  </Text>
                  <Text style={styles.modalReason}>
                    “{pengajuanDipilih.alasan}”
                  </Text>
                </>
              ) : null}

              <Text style={styles.inputLabel}>Catatan untuk praktikan</Text>
              <TextInput
                accessibilityLabel="Catatan untuk praktikan"
                value={catatan}
                onChangeText={setCatatan}
                placeholder="Opsional"
                placeholderTextColor="#8A9AAA"
                multiline
                maxLength={500}
                textAlignVertical="top"
                editable={!sedangMenyimpan}
                style={styles.input}
              />
              <Text style={styles.helperText}>
                Catatan opsional · {catatan.trim().length}/500
              </Text>

              {pesanErrorSimpan ? (
                <Text style={styles.errorText}>{pesanErrorSimpan}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={sedangMenyimpan}
                  onPress={tutupModal}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={sedangMenyimpan}
                  onPress={() => void simpanKeputusan()}
                  style={[
                    keputusanDipilih === "diterima"
                      ? styles.acceptButton
                      : styles.rejectButton,
                    sedangMenyimpan && styles.disabledButton,
                  ]}
                >
                  {sedangMenyimpan ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      {labelKeputusan}
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
  sectionTitle: {
    color: "#172B3A",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 15,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  personInfo: {
    flex: 1,
  },
  name: {
    color: "#172B3A",
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    color: "#647789",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: "#FFF4D8",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: "#805B0A",
    fontSize: 10,
    fontWeight: "700",
  },
  label: {
    color: "#647789",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 14,
  },
  reason: {
    color: "#263B4B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  aiBox: {
    backgroundColor: "#F4F7FB",
    borderRadius: 12,
    marginTop: 12,
    padding: 11,
  },
  aiText: {
    color: "#263B4B",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  aiDisclaimer: {
    color: "#647789",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E6F2FA",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: "#075985",
    fontSize: 12,
    fontWeight: "800",
  },
  retryButtonBusy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  classificationErrorText: {
    color: "#9A3412",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  noteBox: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 2,
  },
  noteText: {
    color: "#263B4B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  acceptButton: {
    alignItems: "center",
    backgroundColor: "#087443",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  rejectButton: {
    alignItems: "center",
    backgroundColor: "#B42318",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  emptyText: {
    color: "#647789",
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    backgroundColor: "#FFF0F0",
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
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
  modalSubtitle: {
    color: "#647789",
    fontSize: 13,
    marginTop: 8,
  },
  modalReason: {
    color: "#263B4B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  inputLabel: {
    color: "#263B4B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 20,
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
    minHeight: 90,
    padding: 14,
  },
  helperText: {
    color: "#647789",
    fontSize: 12,
    marginTop: 7,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#EEF3F7",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: "#526273",
    fontSize: 13,
    fontWeight: "800",
  },
});
