import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DataState, SkeletonCards } from "@/components/DataStates";
import {
  ambilLaboratorium,
  buatLaboratorium,
  hapusLaboratorium,
  simpanLokasiLaboratorium,
  ubahLaboratorium,
  ubahStatusLaboratorium,
} from "@/lib/firebase-laboratories";
import type { Laboratorium } from "@/types/siprak";

function angkaDariInput(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export default function LaboratoriumAsistenScreen() {
  const router = useRouter();

  const [items, setItems] = useState<Laboratorium[]>([]);
  const [editing, setEditing] = useState<Laboratorium | null>(null);
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("50");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [modal, setModal] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Laboratorium | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      setItems(await ambilLaboratorium());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Data ruangan gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openForm(item?: Laboratorium) {
    setEditing(item ?? null);
    setName(item?.nama ?? "");
    setLatitude(
      typeof item?.latitude === "number" ? String(item.latitude) : "",
    );
    setLongitude(
      typeof item?.longitude === "number" ? String(item.longitude) : "",
    );
    setRadius(
      typeof item?.radiusPresensiMeter === "number"
        ? String(item.radiusPresensiMeter)
        : "50",
    );
    setFormError("");
    setModal(true);
  }

  async function save() {
    setFormError("");

    if (!name.trim()) {
      setFormError("Nama ruangan/laboratorium wajib diisi.");
      return;
    }

    if (!latitude.trim() || !longitude.trim() || !radius.trim()) {
      setFormError("Isi latitude, longitude, dan radius presensi.");
      return;
    }

    const latitudeNumber = angkaDariInput(latitude);
    const longitudeNumber = angkaDariInput(longitude);
    const radiusNumber = angkaDariInput(radius);

    if (
      !Number.isFinite(latitudeNumber) ||
      latitudeNumber < -90 ||
      latitudeNumber > 90
    ) {
      setFormError("Latitude harus berupa angka antara -90 dan 90.");
      return;
    }

    if (
      !Number.isFinite(longitudeNumber) ||
      longitudeNumber < -180 ||
      longitudeNumber > 180
    ) {
      setFormError("Longitude harus berupa angka antara -180 dan 180.");
      return;
    }

    if (
      !Number.isFinite(radiusNumber) ||
      radiusNumber < 1 ||
      radiusNumber > 5000
    ) {
      setFormError("Radius harus antara 1 dan 5000 meter.");
      return;
    }

    setBusy(true);

    try {
      let laboratorium = editing;

      if (laboratorium) {
        await ubahLaboratorium(laboratorium.id, name);
      } else {
        laboratorium = await buatLaboratorium(name);
        setEditing(laboratorium);
      }

      await simpanLokasiLaboratorium(laboratorium.id, {
        latitude: latitudeNumber,
        longitude: longitudeNumber,
        radiusPresensiMeter: radiusNumber,
      });

      setModal(false);
      await load();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Data laboratorium gagal disimpan.",
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: Laboratorium) {
    setLoadError("");

    try {
      await ubahStatusLaboratorium(
        item.id,
        item.status === "aktif" ? "diarsipkan" : "aktif",
      );
      await load();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Gagal mengubah status.",
      );
    }
  }

  function confirmDelete(item: Laboratorium) {
    setDeleteError("");
    setPendingDelete(item);
  }

  async function deleteRoom() {
    if (!pendingDelete) return;

    setDeleteBusy(true);
    setDeleteError("");

    try {
      await hapusLaboratorium(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Ruangan gagal dihapus.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.replace("/asisten/kelas")}>
          <Text style={styles.back}>‹ Kembali ke kelas</Text>
        </Pressable>

        <Text style={styles.eyebrow}>PANEL ASISTEN</Text>
        <Text style={styles.title}>Ruangan & laboratorium</Text>
        <Text style={styles.subtitle}>
          Atur titik lokasi dan radius presensi setiap laboratorium.
        </Text>

        <Pressable style={styles.add} onPress={() => openForm()}>
          <Text style={styles.addText}>+ Tambah ruangan</Text>
        </Pressable>

        {loading ? <SkeletonCards count={3} /> : null}

        {!loading && loadError ? (
          <DataState
            kind="error"
            compact
            title="Ruangan belum bisa dimuat"
            message={loadError}
            actionLabel="Coba lagi"
            onAction={() => void load()}
          />
        ) : null}

        {!loading && !loadError
          ? items.map((item) => {
              const punyaLokasi =
                typeof item.latitude === "number" &&
                typeof item.longitude === "number" &&
                typeof item.radiusPresensiMeter === "number";

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.name}>{item.nama}</Text>
                    <Text
                      style={[
                        styles.badge,
                        item.status === "diarsipkan" && styles.archived,
                      ]}
                    >
                      {item.status === "aktif" ? "Aktif" : "Diarsipkan"}
                    </Text>
                  </View>

                  {punyaLokasi ? (
                    <View style={styles.locationBox}>
                      <Text style={styles.locationTitle}>Lokasi presensi</Text>
                      <Text style={styles.locationText}>
                        {item.latitude}, {item.longitude}
                      </Text>
                      <Text style={styles.locationText}>
                        Radius {item.radiusPresensiMeter} meter
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.missingLocation}>
                      Lokasi presensi belum diatur.
                    </Text>
                  )}

                  <View style={styles.actions}>
                    <Pressable
                      style={styles.secondary}
                      onPress={() => openForm(item)}
                    >
                      <Text style={styles.secondaryText}>
                        {punyaLokasi ? "Edit" : "Atur lokasi"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.secondary}
                      onPress={() => void changeStatus(item)}
                    >
                      <Text style={styles.secondaryText}>
                        {item.status === "aktif" ? "Arsip" : "Unarsip"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.delete}
                      onPress={() => confirmDelete(item)}
                    >
                      <Text style={styles.deleteText}>Hapus</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          : null}

        {!loading && !loadError && !items.length ? (
          <DataState
            kind="empty"
            title="Belum ada ruangan"
            message="Tambahkan laboratorium, lalu isi koordinat dan radius presensinya."
            actionLabel="+ Tambah ruangan"
            onAction={() => openForm()}
          />
        ) : null}
      </ScrollView>

      <Modal
        visible={modal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setModal(false);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.scrim}
            onPress={() => {
              if (!busy) setModal(false);
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>
                  {editing ? "Edit laboratorium" : "Tambah laboratorium"}
                </Text>

                <Text style={styles.fieldLabel}>Nama ruangan</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Contoh: Lab Komputer 1"
                  style={styles.input}
                  editable={!busy}
                />

                <Text style={styles.fieldLabel}>Latitude</Text>
                <TextInput
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="-6.893"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  editable={!busy}
                />

                <Text style={styles.fieldLabel}>Longitude</Text>
                <TextInput
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="107.610"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  editable={!busy}
                />

                <Text style={styles.fieldLabel}>Radius presensi (meter)</Text>
                <TextInput
                  value={radius}
                  onChangeText={setRadius}
                  placeholder="50"
                  style={styles.input}
                  keyboardType="number-pad"
                  editable={!busy}
                />

                {formError ? (
                  <Text style={styles.error}>{formError}</Text>
                ) : null}
              </ScrollView>
              <View style={styles.actions}>
                <Pressable
                  style={styles.secondary}
                  disabled={busy}
                  onPress={() => setModal(false)}
                >
                  <Text style={styles.secondaryText}>Batal</Text>
                </Pressable>

                <Pressable
                  style={[styles.add, busy && styles.disabledButton]}
                  disabled={busy}
                  onPress={() => void save()}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.addText}>Simpan</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmationModal
        visible={pendingDelete !== null}
        title="Hapus ruangan?"
        message={
          pendingDelete
            ? `Ruangan ${pendingDelete.nama} akan dihapus. Ruangan yang memiliki jadwal tersimpan tidak dapat dihapus.`
            : ""
        }
        confirmLabel="Hapus ruangan"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
        onConfirm={() => void deleteRoom()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  back: {
    color: "#075985",
    fontWeight: "700",
    marginBottom: 24,
  },
  eyebrow: {
    color: "#174A78",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    color: "#172B3A",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: "#647789",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 16,
  },
  add: {
    backgroundColor: "#075985",
    borderRadius: 13,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  name: {
    color: "#172B3A",
    fontWeight: "800",
    fontSize: 16,
    flexShrink: 1,
  },
  badge: {
    color: "#16794A",
    backgroundColor: "#E8F7EE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  archived: {
    color: "#9A5B00",
    backgroundColor: "#FFF4DF",
  },
  locationBox: {
    backgroundColor: "#F4F7FB",
    borderRadius: 12,
    marginTop: 14,
    padding: 12,
  },
  locationTitle: {
    color: "#172B3A",
    fontSize: 13,
    fontWeight: "800",
  },
  locationText: {
    color: "#526273",
    fontSize: 13,
    marginTop: 5,
  },
  missingLocation: {
    color: "#9A5B00",
    fontSize: 13,
    marginTop: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  secondary: {
    backgroundColor: "#E8F2FA",
    borderRadius: 11,
    minHeight: 40,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#075985",
    fontWeight: "700",
  },
  delete: {
    backgroundColor: "#FEF0EF",
    borderRadius: 11,
    minHeight: 40,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#B42318",
    fontWeight: "700",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 22,
    paddingBottom: 32,
  },
  modalTitle: {
    color: "#172B3A",
    fontSize: 21,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#647789",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
  input: {
    borderColor: "#D6E2ED",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 50,
    color: "#172B3A",
    marginTop: 7,
  },
  helper: {
    color: "#647789",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  error: {
    color: "#B42318",
    backgroundColor: "#FEF0EF",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
});
