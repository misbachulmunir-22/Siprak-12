import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataState, SkeletonCards } from "@/components/DataStates";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ambilLaboratorium, buatLaboratorium, hapusLaboratorium, ubahLaboratorium, ubahStatusLaboratorium } from "@/lib/firebase-laboratories";
import type { Laboratorium } from "@/types/siprak";

export default function LaboratoriumAsistenScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Laboratorium[]>([]);
  const [editing, setEditing] = useState<Laboratorium | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Laboratorium | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await ambilLaboratorium()); }
    catch (e) { setError(e instanceof Error ? e.message : "Data ruangan gagal dimuat."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  function open(item?: Laboratorium) { setEditing(item ?? null); setName(item?.nama ?? ""); setModal(true); }
  async function save() {
    setBusy(true); setError("");
    try { if (editing) await ubahLaboratorium(editing.id, name); else await buatLaboratorium(name); setModal(false); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Perubahan ruangan gagal disimpan."); }
    finally { setBusy(false); }
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
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Ruangan gagal dihapus.");
    } finally {
      setDeleteBusy(false);
    }
  }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.replace("/asisten/kelas")}><Text style={styles.back}>‹ Kembali ke kelas</Text></Pressable>
    <Text style={styles.eyebrow}>PANEL ASISTEN</Text><Text style={styles.title}>Ruangan & laboratorium</Text>
    <Text style={styles.subtitle}>Sesi baru menggunakan pilihan ruangan yang terdaftar di sini.</Text>
    <Pressable style={styles.add} onPress={() => open()}><Text style={styles.addText}>+ Tambah ruangan</Text></Pressable>
    {loading ? <SkeletonCards count={3} /> : error ? <DataState kind="error" compact title="Ruangan belum bisa dimuat" message={error} actionLabel="Coba lagi" onAction={() => void load()} /> : items.map(item => <View key={item.id} style={styles.card}>
      <View style={styles.top}><Text style={styles.name}>{item.nama}</Text><Text style={[styles.badge, item.status === "diarsipkan" && styles.archived]}>{item.status === "aktif" ? "Aktif" : "Diarsipkan"}</Text></View>
      <View style={styles.actions}><Pressable style={styles.secondary} onPress={() => open(item)}><Text style={styles.secondaryText}>Edit</Text></Pressable><Pressable style={styles.secondary} onPress={() => void (async () => { try { await ubahStatusLaboratorium(item.id, item.status === "aktif" ? "diarsipkan" : "aktif"); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Gagal mengubah status."); } })()}><Text style={styles.secondaryText}>{item.status === "aktif" ? "Arsip" : "Unarsip"}</Text></Pressable><Pressable style={styles.delete} onPress={() => confirmDelete(item)}><Text style={styles.deleteText}>Hapus</Text></Pressable></View>
    </View>)}
    {!loading && !error && !items.length ? <DataState kind="empty" title="Belum ada ruangan" message="Tambahkan data ruangan untuk membuat sesi." actionLabel="+ Tambah ruangan" onAction={() => open()} /> : null}
  </ScrollView>
  <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}><View style={styles.modalRoot}><Pressable style={styles.scrim} onPress={() => !busy && setModal(false)} /><View style={styles.modal}><Text style={styles.modalTitle}>{editing ? "Edit ruangan" : "Tambah ruangan"}</Text><TextInput value={name} onChangeText={setName} placeholder="Contoh: Lab D" style={styles.input} />{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.actions}><Pressable style={styles.secondary} onPress={() => setModal(false)}><Text style={styles.secondaryText}>Batal</Text></Pressable><Pressable style={styles.add} disabled={busy} onPress={() => void save()}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.addText}>Simpan</Text>}</Pressable></View></View></View></Modal>
  <ConfirmationModal visible={pendingDelete !== null} title="Hapus ruangan?" message={pendingDelete ? `Ruangan ${pendingDelete.nama} akan dihapus. Ruangan yang memiliki jadwal tersimpan tidak dapat dihapus.` : ""} confirmLabel="Hapus ruangan" busy={deleteBusy} error={deleteError} onCancel={() => { if (!deleteBusy) setPendingDelete(null); }} onConfirm={() => void deleteRoom()} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F4F7FB" }, content: { padding: 20, paddingBottom: 40 }, back: { color: "#075985", fontWeight: "700", marginBottom: 24 }, eyebrow: { color: "#174A78", fontWeight: "800", fontSize: 11, letterSpacing: 1.2 }, title: { color: "#172B3A", fontSize: 25, fontWeight: "800", marginTop: 6 }, subtitle: { color: "#647789", fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 16 }, add: { backgroundColor: "#075985", borderRadius: 13, minHeight: 44, paddingHorizontal: 14, justifyContent: "center", alignItems: "center" }, addText: { color: "white", fontWeight: "800" }, card: { backgroundColor: "white", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 16, padding: 15, marginTop: 12 }, top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, name: { color: "#172B3A", fontWeight: "800", fontSize: 16 }, badge: { color: "#16794A", backgroundColor: "#E8F7EE", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: "700" }, archived: { color: "#9A5B00", backgroundColor: "#FFF4DF" }, actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }, secondary: { backgroundColor: "#E8F2FA", borderRadius: 11, minHeight: 40, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" }, secondaryText: { color: "#075985", fontWeight: "700" }, delete: { backgroundColor: "#FEF0EF", borderRadius: 11, minHeight: 40, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" }, deleteText: { color: "#B42318", fontWeight: "700" }, empty: { color: "#647789", backgroundColor: "white", padding: 22, textAlign: "center", borderRadius: 16, marginTop: 12 }, error: { color: "#B42318", backgroundColor: "#FEF0EF", padding: 12, borderRadius: 12, marginTop: 12 }, modalRoot: { flex: 1, justifyContent: "flex-end" }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,23,42,0.4)" }, modal: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 }, modalTitle: { color: "#172B3A", fontSize: 21, fontWeight: "800" }, input: { borderColor: "#D6E2ED", borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, minHeight: 50, color: "#172B3A", marginTop: 14 }, });
