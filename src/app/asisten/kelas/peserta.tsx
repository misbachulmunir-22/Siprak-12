import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DataState, SkeletonCards } from "@/components/DataStates";
import { ambilKelasAsisten } from "@/lib/firebase-classes";
import {
  ambilAnggotaPraktikum,
  ambilPraktikumKelas,
  hapusAnggotaPraktikum,
  tambahAnggotaPraktikum,
  ubahStatusAnggotaPraktikum,
} from "@/lib/firebase-practicums";
import type { AnggotaKelas, KelasPraktikum, Praktikum } from "@/types/siprak";

type FilterAnggota = "aktif" | "nonaktif";

function pesanError(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.";
}

export default function PesertaPraktikumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const kelasId = typeof params.kelasId === "string" ? params.kelasId : "";
  const praktikumId = typeof params.praktikumId === "string" ? params.praktikumId : "";

  const [kelas, setKelas] = useState<KelasPraktikum | null>(null);
  const [praktikum, setPraktikum] = useState<Praktikum | null>(null);
  const [anggota, setAnggota] = useState<AnggotaKelas[]>([]);
  const [filter, setFilter] = useState<FilterAnggota>("aktif");
  const [search, setSearch] = useState("");
  const [nim, setNim] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [memberMenu, setMemberMenu] = useState<AnggotaKelas | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<AnggotaKelas | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    if (!kelasId || !praktikumId) {
      setError("Kelas atau praktikum tidak ditemukan. Kembali lalu buka praktikum lagi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [daftarKelas, daftarPraktikum] = await Promise.all([
        ambilKelasAsisten(),
        ambilPraktikumKelas(kelasId),
      ]);
      const kelasTerpilih = daftarKelas.find((item) => item.id === kelasId);
      const praktikumTerpilih = daftarPraktikum.find((item) => item.id === praktikumId);
      if (!kelasTerpilih || !praktikumTerpilih) {
        throw new Error("Kelas atau praktikum tidak ditemukan atau akses sudah berubah.");
      }

      const daftarAnggota = await ambilAnggotaPraktikum(kelasId, praktikumId);
      setKelas(kelasTerpilih);
      setPraktikum(praktikumTerpilih);
      setAnggota(daftarAnggota);
    } catch (loadError) {
      setError(pesanError(loadError));
    } finally {
      setLoading(false);
    }
  }, [kelasId, praktikumId]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const jumlahAktif = useMemo(
    () => anggota.filter((item) => item.status === "aktif").length,
    [anggota],
  );
  const jumlahNonaktif = anggota.length - jumlahAktif;
  const daftarTampil = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return anggota.filter((item) => {
      const cocokStatus = item.status === filter;
      const cocokCari = !query || item.nama.toLocaleLowerCase().includes(query) || item.nim.includes(query);
      return cocokStatus && cocokCari;
    });
  }, [anggota, filter, search]);

  async function tambahPeserta() {
    setSaving(true);
    setFormError("");
    try {
      await tambahAnggotaPraktikum(kelasId, praktikumId, nim);
      setNim("");
      setAddModalVisible(false);
      await load();
    } catch (addError) {
      setFormError(pesanError(addError));
    } finally {
      setSaving(false);
    }
  }

  async function ubahStatus(anggotaUid: string, status: "aktif" | "nonaktif") {
    setBusyUid(anggotaUid);
    setError("");
    try {
      await ubahStatusAnggotaPraktikum(kelasId, praktikumId, anggotaUid, status);
      setMemberMenu(null);
      await load();
    } catch (statusError) {
      setError(pesanError(statusError));
    } finally {
      setBusyUid(null);
    }
  }

  function konfirmasiHapus(item: AnggotaKelas) {
    setMemberMenu(null);
    setDeleteError("");
    setPendingDeletion(item);
  }

  async function hapusPeserta() {
    if (!pendingDeletion) return;
    setBusyUid(pendingDeletion.uid);
    setDeleteError("");
    try {
      await hapusAnggotaPraktikum(kelasId, praktikumId, pendingDeletion.uid);
      setPendingDeletion(null);
      await load();
    } catch (deleteError) {
      setDeleteError(pesanError(deleteError));
    } finally {
      setBusyUid(null);
    }
  }

  function bukaFormTambah() {
    setNim("");
    setFormError("");
    setAddModalVisible(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.pageTitleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke praktikum"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{praktikum?.nama ?? "Praktikum"}</Text>
        </View>
        <Text style={styles.subtitle}>
          {kelas ? `Kelas / ${kelas.nama} / Praktikum` : "Kelola peserta praktikum."}
        </Text>

        <View style={styles.segmentedControl}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.segment}
          >
            <Text style={styles.segmentText}>Sesi</Text>
          </Pressable>
          <View style={[styles.segment, styles.segmentSelected]}>
            <Text style={[styles.segmentText, styles.segmentTextSelected]}>Peserta</Text>
          </View>
        </View>

        <View style={styles.searchField}>
          <SymbolView
            name={{ android: "search", ios: "magnifyingglass", web: "search" }}
            size={24}
            tintColor="#52627B"
          />
          <TextInput
            accessibilityLabel="Cari peserta berdasarkan nama atau NIM"
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama atau NIM"
            placeholderTextColor="#52627B"
            style={styles.search}
            returnKeyType="search"
          />
        </View>

        <View style={styles.filterRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === "aktif" }}
            style={[styles.filterChip, filter === "aktif" && styles.filterChipSelected]}
            onPress={() => setFilter("aktif")}
          >
            <Text style={[styles.filterText, filter === "aktif" && styles.filterTextSelected]}>
              Aktif ({jumlahAktif})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === "nonaktif" }}
            style={[styles.filterChip, filter === "nonaktif" && styles.filterChipSelected]}
            onPress={() => setFilter("nonaktif")}
          >
            <Text style={[styles.filterText, filter === "nonaktif" && styles.filterTextSelected]}>
              Nonaktif ({jumlahNonaktif})
            </Text>
          </Pressable>
        </View>

        <View style={styles.memberSectionHeader}>
          <Text style={styles.memberSectionTitle}>
            {filter === "aktif" ? `${jumlahAktif} peserta aktif` : `${jumlahNonaktif} peserta nonaktif`}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!praktikum || praktikum.status !== "aktif"}
            onPress={bukaFormTambah}
            style={[
              styles.addButton,
              (!praktikum || praktikum.status !== "aktif") && styles.addButtonDisabled,
            ]}
          >
            <Text style={styles.addButtonText}>+ Tambah</Text>
          </Pressable>
        </View>
        {praktikum?.status === "diarsipkan" ? (
          <Text style={styles.notice}>Praktikum ini diarsipkan. Aktifkan kembali praktikum untuk menambah peserta.</Text>
        ) : null}

        {loading ? <SkeletonCards count={3} /> : error ? (
          <DataState kind="error" compact title="Peserta belum bisa dimuat" message={error} actionLabel="Coba lagi" onAction={() => void load()} />
        ) : null}
        {!loading && !error && daftarTampil.map((item) => {
          const isBusy = busyUid === item.uid;
          return (
            <View key={item.uid} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberIdentity}>
                  <Text style={styles.memberName}>{item.nama}</Text>
                  <Text style={styles.memberNim}>{item.nim}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Menu ${item.nama}`}
                  disabled={isBusy}
                  hitSlop={8}
                  onPress={() => setMemberMenu(item)}
                  style={styles.memberMenuButton}
                >
                  <SymbolView
                    name={{ android: "more_horiz", ios: "ellipsis", web: "more_horiz" }}
                    size={24}
                    tintColor="#52627B"
                  />
                </Pressable>
              </View>
              <Text style={[styles.statusBadge, item.status === "nonaktif" && styles.statusBadgeInactive]}>
                {item.status === "aktif" ? "Aktif" : "Nonaktif"}
              </Text>
              {isBusy ? (
                <ActivityIndicator style={styles.memberLoader} color="#173F7A" />
              ) : null}
            </View>
          );
        })}
        {!loading && !error && !daftarTampil.length ? (
          <DataState kind="empty" compact title={anggota.length ? "Peserta tidak ditemukan" : "Belum ada peserta"} message={anggota.length ? "Coba kata kunci lain atau pilih status lainnya." : "Tambahkan peserta menggunakan NIM akun SIPRAK mereka."} />
        ) : null}
        <Text style={styles.menuHint}>Buka menu ··· pada peserta untuk mengubah status atau menghapusnya.</Text>
      </ScrollView>

      <Modal
        visible={memberMenu !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberMenu(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={() => setMemberMenu(null)} />
          <View style={styles.menuSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.menuTitle}>{memberMenu?.nama}</Text>
            <Text style={styles.menuSubtitle}>
              {memberMenu ? `${memberMenu.nim} · ${memberMenu.status === "aktif" ? "Aktif" : "Nonaktif"}` : ""}
            </Text>
            {memberMenu ? (
              <>
                <Pressable
                  disabled={busyUid === memberMenu.uid || kelas?.status !== "aktif" || praktikum?.status !== "aktif"}
                  style={styles.menuAction}
                  onPress={() => void ubahStatus(memberMenu.uid, memberMenu.status === "aktif" ? "nonaktif" : "aktif")}
                >
                  <SymbolView
                    name={{ android: memberMenu.status === "aktif" ? "person_off" : "check", ios: memberMenu.status === "aktif" ? "person.fill.xmark" : "checkmark", web: memberMenu.status === "aktif" ? "person_off" : "check" }}
                    size={24}
                    tintColor="#173F7A"
                  />
                  <Text style={styles.menuActionText}>
                    {memberMenu.status === "aktif" ? "Nonaktifkan peserta" : "Aktifkan kembali"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busyUid === memberMenu.uid}
                  style={styles.menuDeleteAction}
                  onPress={() => konfirmasiHapus(memberMenu)}
                >
                  <SymbolView name={{ android: "delete", ios: "trash", web: "delete" }} size={24} tintColor="#B42332" />
                  <Text style={styles.menuDeleteText}>Hapus dari praktikum</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable style={styles.menuCancel} onPress={() => setMemberMenu(null)}>
              <Text style={styles.menuCancelText}>Batal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={pendingDeletion !== null}
        title="Hapus peserta?"
        message={pendingDeletion
          ? `${pendingDeletion.nama} (${pendingDeletion.nim}) akan dihapus dari praktikum ${praktikum?.nama ?? "ini"} · ${kelas?.nama ?? "kelas ini"}.`
          : ""}
        confirmLabel="Hapus peserta"
        busy={Boolean(busyUid)}
        error={deleteError}
        onCancel={() => { if (!busyUid) setPendingDeletion(null); }}
        onConfirm={() => void hapusPeserta()}
      />

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setAddModalVisible(false);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={() => !saving && setAddModalVisible(false)} />
          <View style={styles.addSheet}>
            <Text style={styles.modalTitle}>Tambah peserta</Text>
            <Text style={styles.modalDescription}>Peserta akan langsung aktif setelah NIM-nya ditemukan.</Text>
            <TextInput
              value={nim}
              onChangeText={setNim}
              placeholder="Masukkan NIM"
              keyboardType="number-pad"
              style={styles.nimInput}
              autoFocus
              editable={!saving}
            />
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable disabled={saving} style={styles.cancelButton} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </Pressable>
              <Pressable disabled={saving} style={styles.addButton} onPress={() => void tambahPeserta()}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addButtonText}>Tambahkan</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FC" },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 36 },
  pageTitleRow: { alignItems: "center", flexDirection: "row", marginLeft: -8 },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", width: 40 },
  backIcon: { color: "#173F7A", fontSize: 34, lineHeight: 38, marginTop: -4 },
  title: { color: "#172B4D", flex: 1, fontSize: 25, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#52627B", fontSize: 15, lineHeight: 22, marginTop: 5, marginBottom: 18 },
  segmentedControl: { backgroundColor: "#E9EFFA", borderRadius: 14, flexDirection: "row", gap: 4, padding: 4 },
  segment: { alignItems: "center", borderRadius: 11, flex: 1, justifyContent: "center", minHeight: 48 },
  segmentSelected: { backgroundColor: "#FFFFFF" },
  segmentText: { color: "#52627B", fontSize: 15, fontWeight: "600" },
  segmentTextSelected: { color: "#173F7A", fontWeight: "800" },
  searchField: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 18, minHeight: 52, paddingHorizontal: 14 },
  search: { color: "#172B4D", flex: 1, fontSize: 15, minHeight: 50, paddingVertical: 0 },
  filterRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  filterChip: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 22, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
  filterChipSelected: { backgroundColor: "#173F7A", borderColor: "#173F7A" },
  filterText: { color: "#52627B", fontSize: 14, fontWeight: "700" },
  filterTextSelected: { color: "#FFFFFF" },
  memberSectionHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 22, marginBottom: 4 },
  memberSectionTitle: { color: "#172B4D", flex: 1, fontSize: 19, fontWeight: "800" },
  addButton: { alignItems: "center", backgroundColor: "#173F7A", borderRadius: 13, justifyContent: "center", minHeight: 48, paddingHorizontal: 18 },
  addButtonDisabled: { opacity: 0.55 },
  addButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  notice: { backgroundColor: "#FFF3D6", borderRadius: 12, color: "#8A4B08", lineHeight: 20, marginTop: 10, padding: 12 },
  error: { backgroundColor: "#FCEBEC", borderRadius: 12, color: "#B42332", lineHeight: 20, marginTop: 12, padding: 12 },
  loader: { marginTop: 22 },
  memberCard: { backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 15 },
  memberHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  memberIdentity: { flex: 1 },
  memberName: { color: "#172B4D", fontSize: 17, fontWeight: "800" },
  memberNim: { color: "#52627B", fontSize: 14, marginTop: 6 },
  memberMenuButton: { alignItems: "center", borderRadius: 22, justifyContent: "center", minHeight: 44, minWidth: 44 },
  statusBadge: { alignSelf: "flex-start", backgroundColor: "#E5F5EC", borderRadius: 9, color: "#176547", fontSize: 13, fontWeight: "700", marginTop: 10, overflow: "hidden", paddingHorizontal: 11, paddingVertical: 6 },
  statusBadgeInactive: { backgroundColor: "#FFF3D6", color: "#8A4B08" },
  memberLoader: { position: "absolute", right: 20, top: 22 },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 16, borderWidth: 1, marginTop: 14, padding: 22 },
  emptyTitle: { color: "#172B4D", fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: { color: "#52627B", fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: "center" },
  menuHint: { color: "#52627B", fontSize: 13, lineHeight: 19, marginTop: 16 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(23,43,77,0.42)" },
  menuSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
  sheetHandle: { alignSelf: "center", backgroundColor: "#D8E1EE", borderRadius: 3, height: 5, marginBottom: 22, width: 48 },
  menuTitle: { color: "#172B4D", fontSize: 23, fontWeight: "800" },
  menuSubtitle: { color: "#52627B", fontSize: 15, marginTop: 6 },
  menuAction: { alignItems: "center", backgroundColor: "#E9EFFA", borderRadius: 16, flexDirection: "row", gap: 16, marginTop: 24, minHeight: 68, paddingHorizontal: 18 },
  menuActionText: { color: "#173F7A", flex: 1, fontSize: 16, fontWeight: "700" },
  menuDeleteAction: { alignItems: "center", backgroundColor: "#FCEBEC", borderRadius: 16, flexDirection: "row", gap: 16, marginTop: 12, minHeight: 68, paddingHorizontal: 18 },
  menuDeleteText: { color: "#B42332", flex: 1, fontSize: 16, fontWeight: "700" },
  menuCancel: { alignItems: "center", justifyContent: "center", marginTop: 16, minHeight: 54 },
  menuCancelText: { color: "#173F7A", fontSize: 16, fontWeight: "700" },
  addSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 },
  modalTitle: { color: "#172B4D", fontSize: 22, fontWeight: "800" },
  modalDescription: { color: "#52627B", fontSize: 14, lineHeight: 20, marginTop: 7 },
  nimInput: { backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 13, borderWidth: 1, color: "#172B4D", fontSize: 16, marginTop: 16, minHeight: 52, paddingHorizontal: 14 },
  formError: { backgroundColor: "#FCEBEC", borderRadius: 11, color: "#B42332", lineHeight: 19, marginTop: 10, padding: 11 },
  modalActions: { flexDirection: "row", gap: 9, justifyContent: "flex-end", marginTop: 18 },
  cancelButton: { alignItems: "center", backgroundColor: "#E9EFFA", borderRadius: 12, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  secondaryButtonText: { color: "#173F7A", fontSize: 15, fontWeight: "700" },
});
