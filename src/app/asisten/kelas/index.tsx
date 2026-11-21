import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import { aktifkanKelas, ambilKelasAsisten, arsipkanKelas, buatKelas, hapusKelas, ubahKelas } from "@/lib/firebase-classes";
import { ambilPraktikumKelas, ambilSemuaPraktikumAsisten, buatPraktikum, hapusPraktikum, ubahPraktikum, ubahStatusPraktikum } from "@/lib/firebase-practicums";
import type { KelasPraktikum, Praktikum, Sesi } from "@/types/siprak";

function err(error: unknown) { return error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi."; }

function jadwalRingkas(sesi: Sesi | undefined) {
  if (!sesi) return "Belum ada sesi mendatang";
  const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
    new Date(`${sesi.tanggal}T12:00:00`),
  );
  const jamMulai = sesi.jamMulai.replace(":", ".");
  const jamSelesai = sesi.jamSelesai.replace(":", ".");
  return `${hari} · ${jamMulai}–${jamSelesai}`;
}

function formatTanggalSesi(tanggal: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${tanggal}T12:00:00`));
}

function labelStatusSesi(status: Sesi["status"]) {
  if (status === "dibuka") return "Berlangsung";
  if (status === "ditutup") return "Selesai";
  if (status === "diarsipkan") return "Diarsipkan";
  return "Akan datang";
}

export default function KelasAsistenScreen() {
  const router = useRouter();
  const { sessions, practicums, praktikanList, refreshSessions } = useSiprak();
  const [classes, setClasses] = useState<KelasPraktikum[]>([]);
  const [courses, setCourses] = useState<Praktikum[]>([]);
  const [activeClass, setActiveClass] = useState<KelasPraktikum | null>(null);
  const [activeCourse, setActiveCourse] = useState<Praktikum | null>(null);
  const [courseTab, setCourseTab] = useState<"sesi" | "peserta">("sesi");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"kelas" | "praktikum" | null>(null);
  const [editingClass, setEditingClass] = useState<KelasPraktikum | null>(null);
  const [editingCourse, setEditingCourse] = useState<Praktikum | null>(null);
  const [name, setName] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    action: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const classData = await ambilKelasAsisten();
      setClasses(classData);
      await ambilSemuaPraktikumAsisten();
      if (activeClass) setCourses(await ambilPraktikumKelas(activeClass.id));
      await refreshSessions();
    } catch (e) { setError(err(e)); }
    finally { setLoading(false); }
  }, [activeClass, refreshSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); await load(); }
    catch (e) { setError(err(e)); }
    finally { setBusy(false); }
  }

  function ask(title: string, message: string, confirmLabel: string, action: () => Promise<void>) {
    setError("");
    setPendingConfirmation({ title, message, confirmLabel, action });
  }
  function confirmPendingAction() {
    if (!pendingConfirmation) return;
    void run(async () => {
      await pendingConfirmation.action();
      setPendingConfirmation(null);
    });
  }
  function openClassForm(item?: KelasPraktikum) { setEditingClass(item ?? null); setName(item?.nama ?? ""); setModal("kelas"); }
  function openCourseForm(item?: Praktikum) { setEditingCourse(item ?? null); setName(item?.nama ?? ""); setModal("praktikum"); }
  async function saveForm() {
    await run(async () => {
      if (modal === "kelas") {
        if (editingClass) await ubahKelas(editingClass.id, { nama: name }); else await buatKelas({ nama: name });
      } else if (modal === "praktikum" && activeClass) {
        if (editingCourse) await ubahPraktikum(activeClass.id, editingCourse.id, name); else await buatPraktikum(activeClass.id, name);
      }
      setModal(null); setName("");
    });
  }
  async function pickClass(item: KelasPraktikum) {
    setActiveClass(item); setActiveCourse(null);
    try { setCourses(await ambilPraktikumKelas(item.id)); } catch (e) { setError(err(e)); }
  }
  async function pickCourse(item: Praktikum) {
    setActiveCourse(item);
    setCourseTab("sesi");
  }
  const orderedSessions = useMemo(
    () => {
      const filteredSessions = activeCourse
        ? sessions.filter(
            (session) =>
              session.kelasId === activeClass?.id &&
              session.praktikumId === activeCourse.id,
          )
        : [];
      return [...filteredSessions].sort((a, b) => {
        const priority: Record<Sesi["status"], number> = {
          dibuka: 0,
          belum_dibuka: 1,
          ditutup: 2,
          diarsipkan: 3,
        };
        const statusOrder = priority[a.status] - priority[b.status];
        if (statusOrder !== 0) return statusOrder;
        return `${b.tanggal}T${b.jamMulai}`.localeCompare(`${a.tanggal}T${a.jamMulai}`);
      });
    },
    [activeClass?.id, activeCourse, sessions],
  );
  const jumlahPesertaAktifPraktikum = activeCourse
    ? praktikanList.filter(
        (item) =>
          item.praktikumId === activeCourse.id &&
          item.statusKeanggotaan === "aktif",
      ).length
    : 0;

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {activeClass ? (
        <View style={styles.pageTitleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeCourse ? "Kembali ke daftar praktikum" : "Kembali ke daftar kelas"}
            hitSlop={8}
            onPress={() => {
              if (activeCourse) setActiveCourse(null);
              else { setActiveClass(null); setCourses([]); }
            }}
            style={styles.pageBackButton}
          >
            <Text style={styles.pageBackIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{activeCourse?.nama ?? "Praktikum"}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.eyebrow}>PANEL ASISTEN</Text>
          <Text style={styles.title}>Kelas praktikum</Text>
        </>
      )}
      <Text style={styles.subtitle}>{activeCourse ? `Kelas / ${activeClass?.nama} / ${activeCourse.nama}` : activeClass ? `Kelas / ${activeClass.nama}` : "Kelola praktikum berdasarkan kelas."}</Text>
      {!activeClass || (activeCourse && activeCourse.status !== "aktif") ? (
        <View style={[styles.actionRow, !activeClass && styles.classListActions]}>
          {!activeClass ? (
            <>
              <Pressable style={styles.lightButton} onPress={() => router.push("/asisten/laboratorium" as Href)}>
                <Text style={styles.lightText}>Kelola ruangan</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => openClassForm()}>
                <Text style={styles.primaryText}>+ Tambah kelas</Text>
              </Pressable>
            </>
          ) : activeCourse ? (
            <Pressable style={styles.primaryButton} onPress={() => void run(() => ubahStatusPraktikum(activeCourse.kelasId, activeCourse.id, "aktif"))}>
              <Text style={styles.primaryText}>Aktifkan praktikum</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {error && !activeCourse && !activeClass && !loading ? <DataState kind="error" compact title="Kelas belum bisa dimuat" message={error} actionLabel="Coba lagi" onAction={() => void load()} /> : null}
      {loading && !activeCourse ? <SkeletonCards count={3} /> : null}
      {activeClass && !activeCourse ? (
        <>
          <View style={styles.classSummary}>
            <Text style={styles.classSummaryTitle}>{activeClass.nama}</Text>
            <Text style={styles.classSummaryText}>
              {praktikanList.filter((praktikan) => praktikan.kelasId === activeClass.id && praktikan.statusKeanggotaan === "aktif").length} mahasiswa aktif
            </Text>
          </View>
          <View style={styles.courseSectionHeader}>
            <Text style={[styles.section, styles.courseSectionLabel]}>
              {courses.length} praktikum
            </Text>
            {activeClass.status === "aktif" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openCourseForm()}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>+ Tambah praktikum</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
      {!activeClass && !loading && !error ? classes.map(item => {
        const jumlahPraktikum = practicums.filter(
          (praktikum) => praktikum.kelasId === item.id && praktikum.status === "aktif",
        ).length;
        const jumlahPeserta = praktikanList.filter(
          (praktikan) =>
            praktikan.kelasId === item.id &&
            praktikan.statusKeanggotaan === "aktif",
        ).length;

        return (
          <View style={styles.card} key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buka kelas ${item.nama}`}
              onPress={() => void pickClass(item)}
              style={({ pressed }) => pressed && styles.cardPressed}
            >
              <View style={styles.classCardTop}>
                <View style={styles.classIcon}>
                  <SymbolView
                    name={{ android: "menu_book", ios: "book", web: "menu_book" }}
                    size={30}
                    tintColor="#173F7A"
                  />
                </View>
                <View style={styles.classInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{item.nama}</Text>
                    <Text
                      style={[
                        styles.badge,
                        item.status !== "aktif" && styles.badgeArchived,
                      ]}
                    >
                      {item.status === "aktif" ? "Aktif" : "Diarsipkan"}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {item.praktikum
                      ? `Praktikum lama: ${item.praktikum}`
                      : "Buka untuk mengelola praktikum"}
                  </Text>
                </View>
                <Text style={styles.cardChevron}>›</Text>
              </View>
              <Text style={styles.classStats}>
                {jumlahPraktikum} praktikum · {jumlahPeserta} mahasiswa
              </Text>
            </Pressable>
            <View style={styles.classActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openClassForm(item)}
                style={styles.lightButton}
              >
                <Text style={styles.lightText}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  void run(() =>
                    item.status === "aktif"
                      ? arsipkanKelas(item.id)
                      : aktifkanKelas(item.id),
                  )
                }
                style={[
                  styles.lightButton,
                  styles.archiveButton,
                ]}
              >
                <Text
                  style={[
                    styles.lightText,
                    styles.archiveText,
                  ]}
                >
                  {item.status === "aktif" ? "Arsip" : "Unarsip"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  ask(
                    "Hapus kelas?",
                    "Kelas yang memiliki praktikum atau riwayat tidak dapat dihapus.",
                    "Hapus kelas",
                    () => hapusKelas(item.id),
                  )
                }
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        );
      }) : activeClass && !activeCourse && !loading && !error ? courses.map((item) => {
        const sesiPraktikum = sessions.filter(
          (sesi) =>
            sesi.kelasId === activeClass.id &&
            sesi.praktikumId === item.id &&
            sesi.status !== "diarsipkan",
        );
        const sekarang = new Date();
        const sesiBerikutnya = [...sesiPraktikum]
          .filter(
            (sesi) =>
              new Date(`${sesi.tanggal}T${sesi.jamMulai}:00`).getTime() >=
                sekarang.getTime() && sesi.status !== "ditutup",
          )
          .sort((a, b) =>
            `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`),
          )[0];
        const jumlahPeserta = praktikanList.filter(
          (praktikan) =>
            praktikan.praktikumId === item.id &&
            praktikan.statusKeanggotaan === "aktif",
        ).length;

        return (
          <View style={styles.practicumCard} key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buka praktikum ${item.nama}`}
              onPress={() => void pickCourse(item)}
              style={({ pressed }) => pressed && styles.cardPressed}
            >
              <View style={styles.practicumCardTop}>
                <Text style={styles.practicumTitle}>{item.nama}</Text>
                <Text style={[styles.badge, item.status !== "aktif" && styles.badgeArchived]}>
                  {item.status === "aktif" ? "Aktif" : "Diarsipkan"}
                </Text>
                <Text style={styles.cardChevron}>›</Text>
              </View>
              <Text style={styles.practicumMeta}>
                {sesiPraktikum.length} sesi · {jumlahPeserta} peserta aktif
              </Text>
              <Text style={styles.practicumSchedule}>
                {jadwalRingkas(sesiBerikutnya)}
              </Text>
            </Pressable>
            <View style={styles.classActions}>
              <Pressable style={styles.lightButton} onPress={() => openCourseForm(item)}>
                <Text style={styles.lightText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.lightButton, styles.archiveButton]}
                onPress={() =>
                  void run(() =>
                    ubahStatusPraktikum(
                      activeClass.id,
                      item.id,
                      item.status === "aktif" ? "diarsipkan" : "aktif",
                    ),
                  )
                }
              >
                <Text style={[styles.lightText, styles.archiveText]}>
                  {item.status === "aktif" ? "Arsip" : "Unarsip"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() =>
                  ask(
                    "Hapus praktikum?",
                    "Praktikum yang masih memiliki peserta atau sesi tidak dapat dihapus.",
                    "Hapus praktikum",
                    () => hapusPraktikum(activeClass.id, item.id),
                  )
                }
              >
                <Text style={styles.deleteText}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        );
      }) : activeClass && activeCourse ? <>
        <View style={styles.activeMembersBadge}>
          <Text style={styles.activeMembersBadgeText}>
            {jumlahPesertaAktifPraktikum} peserta aktif
          </Text>
        </View>
        <View style={styles.courseTabs}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: courseTab === "sesi" }}
            onPress={() => setCourseTab("sesi")}
            style={[styles.courseTab, courseTab === "sesi" && styles.courseTabSelected]}
          >
            <Text style={[styles.courseTabText, courseTab === "sesi" && styles.courseTabTextSelected]}>Sesi</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: courseTab === "peserta" }}
            onPress={() => {
              if (!activeClass || !activeCourse) return;
              router.push({
                pathname: "/asisten/kelas/peserta",
                params: { kelasId: activeClass.id, praktikumId: activeCourse.id },
              });
            }}
            style={[styles.courseTab, courseTab === "peserta" && styles.courseTabSelected]}
          >
            <Text style={[styles.courseTabText, courseTab === "peserta" && styles.courseTabTextSelected]}>Peserta</Text>
          </Pressable>
        </View>

        {courseTab === "sesi" ? (
          <>
            {orderedSessions.length > 0 && !loading && !error ? (
              <View style={styles.sessionSectionHeader}>
                <Text style={styles.section}>{orderedSessions.length} sesi praktikum</Text>
                {activeCourse.status === "aktif" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/asisten/kelas/sesi-form", params: { kelasId: activeClass.id, praktikumId: activeCourse.id } })}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryText}>+ Buat sesi</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {loading ? (
              <View style={styles.sessionSkeletonList}>
                <View style={styles.sessionSkeletonCard}><View style={styles.sessionSkeletonShort} /><View style={styles.sessionSkeletonMedium} /><View style={styles.sessionSkeletonLong} /></View>
                <View style={styles.sessionSkeletonCard}><View style={styles.sessionSkeletonShort} /><View style={styles.sessionSkeletonMedium} /><View style={styles.sessionSkeletonLong} /></View>
                <View style={styles.sessionSkeletonCard}><View style={styles.sessionSkeletonShort} /><View style={styles.sessionSkeletonMedium} /><View style={styles.sessionSkeletonLong} /></View>
              </View>
            ) : error ? (
              <View style={styles.sessionState}>
                <View style={styles.sessionStateIconError}>
                  <SymbolView name={{ android: "warning", ios: "exclamationmark.triangle", web: "warning" }} size={38} tintColor="#B42332" />
                </View>
                <Text style={styles.sessionStateTitle}>Sesi belum dapat dimuat</Text>
                <Text style={styles.sessionStateDescription}>Periksa koneksi internet Anda, lalu coba lagi.</Text>
                <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.sessionStateButton}>
                  <Text style={styles.sessionStateButtonText}>Coba lagi</Text>
                </Pressable>
              </View>
            ) : !orderedSessions.length ? (
              <View style={styles.sessionState}>
                <View style={styles.sessionStateIcon}>
                  <SymbolView name={{ android: "calendar_month", ios: "calendar", web: "calendar_month" }} size={38} tintColor="#173F7A" />
                </View>
                <Text style={styles.sessionStateTitle}>Belum ada sesi</Text>
                <Text style={styles.sessionStateDescription}>
                  Jadwal praktikum akan tampil di sini.{"\n"}
                  {activeCourse.status === "aktif" ? "Buat sesi pertama untuk praktikum ini." : "Aktifkan praktikum untuk membuat sesi."}
                </Text>
                {activeCourse.status === "aktif" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/asisten/kelas/sesi-form", params: { kelasId: activeClass.id, praktikumId: activeCourse.id } })}
                    style={styles.sessionStateButton}
                  >
                    <Text style={styles.sessionStateButtonText}>+ Buat sesi pertama</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {!loading && !error && orderedSessions.map((sesi) => (
              <Pressable
                key={sesi.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/sesi/[id]", params: { id: sesi.id } })}
                style={({ pressed }) => [styles.sessionCard, pressed && styles.cardPressed]}
              >
                <View style={styles.sessionCardHeader}>
                  <Text style={styles.sessionTitle}>
                    Pertemuan {String(sesi.pertemuan).padStart(2, "0")}
                  </Text>
                  <Text
                    style={[
                      styles.sessionStatus,
                      sesi.status === "dibuka" && styles.sessionStatusOpen,
                      sesi.status === "ditutup" && styles.sessionStatusClosed,
                      sesi.status === "diarsipkan" && styles.sessionStatusArchived,
                    ]}
                  >
                    {labelStatusSesi(sesi.status)}
                  </Text>
                </View>
                <Text style={styles.sessionDate}>{formatTanggalSesi(sesi.tanggal)}</Text>
                <Text style={styles.sessionTimeLab}>
                  {sesi.jamMulai.replace(":", ".")}–{sesi.jamSelesai.replace(":", ".")} · {sesi.lab}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </> : null}
      {!loading && !error && !activeClass && classes.length === 0 ? <DataState kind="empty" title="Belum ada kelas" message="Tambahkan kelas pertama untuk mulai mengelola praktikum." actionLabel="+ Tambah kelas" onAction={() => openClassForm()} /> : null}
      {activeClass && !activeCourse && loading ? <SkeletonCards count={2} /> : null}
      {activeClass && !activeCourse && !loading && error ? <DataState kind="error" compact title="Praktikum belum bisa dimuat" message={error} actionLabel="Coba lagi" onAction={() => void load()} /> : null}
      {!loading && !error && activeClass && !activeCourse && courses.length === 0 ? <DataState kind="empty" compact title="Belum ada praktikum" message={activeClass.status === "aktif" ? "Tambahkan praktikum untuk mulai membuat sesi." : "Aktifkan kelas terlebih dahulu untuk menambahkan praktikum."} /> : null}
    </ScrollView>

    <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={() => setModal(null)}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrim} onPress={() => !busy && setModal(null)} />
        <View style={styles.modalCard}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {modal === "kelas"
                ? editingClass ? "Edit kelas" : "Tambah kelas"
                : editingCourse ? "Edit praktikum" : "Tambah praktikum"}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={modal === "kelas" ? "Nama kelas" : "Nama praktikum"}
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.actionRow}>
              <Pressable style={styles.lightButton} onPress={() => setModal(null)}>
                <Text style={styles.lightText}>Batal</Text>
              </Pressable>
              <Pressable disabled={busy || !name.trim()} style={styles.primaryButton} onPress={() => void saveForm()}>
                {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Simpan</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    <ConfirmationModal
      visible={pendingConfirmation !== null}
      title={pendingConfirmation?.title ?? "Konfirmasi"}
      message={pendingConfirmation?.message ?? ""}
      confirmLabel={pendingConfirmation?.confirmLabel ?? "Lanjutkan"}
      busy={busy}
      error={error}
      onCancel={() => { if (!busy) setPendingConfirmation(null); }}
      onConfirm={confirmPendingAction}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FC" },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  eyebrow: {
    color: "#173F7A",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  pageTitleRow: { alignItems: "center", flexDirection: "row", marginLeft: -8 },
  pageBackButton: { alignItems: "center", height: 44, justifyContent: "center", width: 40 },
  pageBackIcon: { color: "#173F7A", fontSize: 34, lineHeight: 38, marginTop: -4 },
  title: {
    color: "#172B4D",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: "#52627B",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 18,
  },
  section: {
    color: "#172B4D",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 10,
  },
  courseSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 18,
  },
  courseSectionLabel: { marginBottom: 0, marginTop: 0 },
  activeMembersBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E5F5EC",
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeMembersBadgeText: { color: "#176547", fontSize: 14, fontWeight: "700" },
  courseTabs: { backgroundColor: "#E9EFFA", borderRadius: 14, flexDirection: "row", gap: 4, marginTop: 18, padding: 4 },
  courseTab: { alignItems: "center", borderRadius: 11, flex: 1, justifyContent: "center", minHeight: 48 },
  courseTabSelected: { backgroundColor: "#FFFFFF" },
  courseTabText: { color: "#52627B", fontSize: 15, fontWeight: "600" },
  courseTabTextSelected: { color: "#173F7A", fontWeight: "800" },
  sessionSectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  sessionCard: { backgroundColor: "#FFFFFF", borderColor: "#D8E1EE", borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 16 },
  sessionCardHeader: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  sessionTitle: { color: "#172B4D", flex: 1, fontSize: 19, fontWeight: "800" },
  sessionStatus: { backgroundColor: "#E9EFFA", borderRadius: 11, color: "#173F7A", fontSize: 13, fontWeight: "700", overflow: "hidden", paddingHorizontal: 12, paddingVertical: 7 },
  sessionStatusOpen: { backgroundColor: "#E5F5EC", color: "#176547" },
  sessionStatusClosed: { backgroundColor: "#FCEBEC", color: "#B42332" },
  sessionStatusArchived: { backgroundColor: "#FFF3D6", color: "#8A4B08" },
  sessionDate: { color: "#52627B", fontSize: 15, marginTop: 12 },
  sessionTimeLab: { color: "#52627B", fontSize: 14, marginTop: 10 },
  sessionSkeletonList: { marginTop: 16 },
  sessionSkeletonCard: { backgroundColor: "#FFFFFF", borderRadius: 22, gap: 18, justifyContent: "center", marginBottom: 14, minHeight: 164, paddingHorizontal: 22 },
  sessionSkeletonShort: { backgroundColor: "#E1E8F2", borderRadius: 8, height: 16, width: "36%" },
  sessionSkeletonMedium: { backgroundColor: "#E1E8F2", borderRadius: 8, height: 20, width: "72%" },
  sessionSkeletonLong: { backgroundColor: "#EDF1F6", borderRadius: 8, height: 16, width: "92%" },
  sessionState: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingTop: 62, paddingBottom: 46 },
  sessionStateIcon: { alignItems: "center", backgroundColor: "#E9EFFA", borderRadius: 24, height: 112, justifyContent: "center", width: 112 },
  sessionStateIconError: { alignItems: "center", backgroundColor: "#FCEBEC", borderRadius: 24, height: 112, justifyContent: "center", width: 112 },
  sessionStateTitle: { color: "#172B4D", fontSize: 22, fontWeight: "800", marginTop: 28, textAlign: "center" },
  sessionStateDescription: { color: "#52627B", fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: "center" },
  sessionStateButton: { alignItems: "center", backgroundColor: "#173F7A", borderRadius: 14, justifyContent: "center", marginTop: 34, minHeight: 56, paddingHorizontal: 20, width: "100%" },
  sessionStateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  classSummary: {
    backgroundColor: "#E9EFFA",
    borderRadius: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  classSummaryTitle: { color: "#173F7A", fontSize: 20, fontWeight: "800" },
  classSummaryText: { color: "#173F7A", fontSize: 15, marginTop: 6 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardPressed: { opacity: 0.75 },
  classCardTop: { alignItems: "center", flexDirection: "row", gap: 14 },
  classIcon: {
    alignItems: "center",
    backgroundColor: "#E9EFFA",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  classInfo: { flex: 1 },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { color: "#172B4D", fontSize: 20, fontWeight: "800" },
  badge: {
    color: "#176547",
    backgroundColor: "#E5F5EC",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  badgeArchived: { color: "#8A4B08", backgroundColor: "#FFF3D6" },
  meta: { color: "#52627B", fontSize: 14, marginTop: 6 },
  cardChevron: { color: "#52627B", fontSize: 30, lineHeight: 34, marginLeft: 2 },
  classStats: { color: "#52627B", fontSize: 15, marginTop: 20 },
  practicumCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  practicumCardTop: { alignItems: "center", flexDirection: "row", gap: 8 },
  practicumTitle: { color: "#172B4D", flex: 1, fontSize: 19, fontWeight: "800" },
  practicumMeta: { color: "#52627B", fontSize: 15, marginTop: 8 },
  practicumSchedule: { color: "#173F7A", fontSize: 14, fontWeight: "600", marginTop: 12 },
  classActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  classListActions: { marginBottom: 18 },
  primaryButton: {
    backgroundColor: "#173F7A",
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  lightButton: {
    backgroundColor: "#E9EFFA",
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  lightText: { color: "#173F7A", fontWeight: "700" },
  archiveButton: { backgroundColor: "#FFF3D6" },
  archiveText: { color: "#8A4B08" },
  deleteButton: {
    backgroundColor: "#FCEBEC",
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#B42332", fontWeight: "700" },
  rowCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E1EE",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  empty: {
    backgroundColor: "#FFFFFF",
    color: "#52627B",
    textAlign: "center",
    padding: 22,
    borderRadius: 16,
    marginTop: 10,
  },
  error: { backgroundColor: "#FCEBEC", padding: 12, borderRadius: 12, marginBottom: 12 },
  errorText: { color: "#B42332", lineHeight: 20 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,23,42,0.4)" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: "85%",
  },
  modalTitle: { color: "#172B4D", fontSize: 21, fontWeight: "800", marginBottom: 14 },
  input: {
    borderColor: "#D8E1EE",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    color: "#172B4D",
    marginTop: 10,
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
