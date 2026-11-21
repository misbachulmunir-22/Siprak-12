import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import type { KelasPraktikum, Praktikum, Sesi } from "@/types/siprak";

type KelompokPraktikum = {
  praktikum: Praktikum;
  sessions: Sesi[];
};

type KelompokKelas = {
  kelas: KelasPraktikum;
  praktikum: KelompokPraktikum[];
};

export default function RekapAsistenScreen() {
  const router = useRouter();
  const { classes, practicums, sessions, attendances, praktikanList, refreshSessions } = useSiprak();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [kelasTerpilihId, setKelasTerpilihId] = useState<string | null>(null);
  const [praktikumTerpilihId, setPraktikumTerpilihId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try { await refreshSessions(); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Rekap gagal dimuat. Periksa koneksi lalu coba lagi."); }
    finally { setLoading(false); }
  }, [refreshSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const kelompokKelas = useMemo<KelompokKelas[]>(() => {
    return classes
      .map((kelas) => ({
        kelas,
        praktikum: practicums
          .filter((praktikum) => praktikum.kelasId === kelas.id)
          .map((praktikum) => ({
            praktikum,
            sessions: sessions
              .filter(
                (sesi) =>
                  sesi.kelasId === kelas.id &&
                  sesi.praktikumId === praktikum.id,
              )
              .sort((a, b) =>
                `${b.tanggal}T${b.jamMulai}`.localeCompare(
                  `${a.tanggal}T${a.jamMulai}`,
                ),
              ),
          }))
          .sort((a, b) => a.praktikum.nama.localeCompare(b.praktikum.nama)),
      }))
      .sort((a, b) => a.kelas.nama.localeCompare(b.kelas.nama));
  }, [classes, practicums, sessions]);

  const kelasTerpilih = kelompokKelas.find(
    (kelas) => kelas.kelas.id === kelasTerpilihId,
  );
  const praktikumTerpilih = kelasTerpilih?.praktikum.find(
    (praktikum) => praktikum.praktikum.id === praktikumTerpilihId,
  );

  function jumlahHadir(sesi: Sesi) {
    const peserta = praktikanList.filter(
      (praktikan) =>
        praktikan.kelasId === sesi.kelasId &&
        praktikan.praktikumId === sesi.praktikumId,
    );

    return peserta.filter((praktikan) =>
      attendances.some(
        (presensi) =>
          presensi.sesiId === sesi.id &&
          presensi.praktikanId === praktikan.id,
      ),
    ).length;
  }

  const langkah = praktikumTerpilih
    ? "sesi"
    : kelasTerpilih
      ? "praktikum"
      : "kelas";

  function kembali() {
    if (praktikumTerpilihId) {
      setPraktikumTerpilihId(null);
      return;
    }
    setKelasTerpilihId(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PANEL ASISTEN</Text>
        <Text style={styles.title}>Rekap kehadiran</Text>
        <Text style={styles.subtitle}>
          Pilih kelas, praktikum, lalu sesi untuk melihat rekap peserta dan
          perizinan.
        </Text>

        <View style={styles.steps}>
          {(["Kelas", "Praktikum", "Sesi"] as const).map((label, index) => {
            const aktif =
              (index === 0 && langkah === "kelas") ||
              (index === 1 && langkah === "praktikum") ||
              (index === 2 && langkah === "sesi");

            return (
              <View key={label} style={styles.stepItem}>
                <View style={[styles.stepDot, aktif && styles.stepDotActive]}>
                  <Text style={[styles.stepNumber, aktif && styles.stepNumberActive]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, aktif && styles.stepLabelActive]}>
                  {label}
                </Text>
                {index < 2 ? <View style={styles.stepLine} /> : null}
              </View>
            );
          })}
        </View>

        {langkah !== "kelas" ? (
          <Pressable onPress={kembali} style={styles.backButton}>
            <Text style={styles.backText}>‹ Kembali</Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>
          {langkah === "kelas"
            ? "Pilih kelas"
            : langkah === "praktikum"
              ? `Praktikum · Kelas ${kelasTerpilih?.kelas.nama ?? ""}`
              : `Pilih sesi · ${praktikumTerpilih?.praktikum.nama ?? ""}`}
        </Text>

        {loading ? <SkeletonCards count={3} /> : loadError ? (
          <DataState kind="error" title="Rekap belum bisa dimuat" message={loadError} actionLabel="Coba lagi" onAction={() => void load()} />
        ) : null}

        {!loading && !loadError && langkah === "kelas"
          ? kelompokKelas.map((kelas) => (
              <Pressable
                key={kelas.kelas.id}
                accessibilityRole="button"
                onPress={() => setKelasTerpilihId(kelas.kelas.id)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>
                    {kelas.kelas.nama.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>Kelas {kelas.kelas.nama}</Text>
                  <Text style={styles.cardMeta}>
                    {kelas.praktikum.length} praktikum
                    {kelas.kelas.status === "diarsipkan" ? " · Diarsipkan" : ""}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          : null}

        {!loading && !loadError && langkah === "praktikum"
          ? (kelasTerpilih?.praktikum ?? []).map((praktikum) => (
              <Pressable
                key={praktikum.praktikum.id}
                accessibilityRole="button"
                onPress={() => setPraktikumTerpilihId(praktikum.praktikum.id)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>
                    {praktikum.praktikum.nama.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{praktikum.praktikum.nama}</Text>
                  <Text style={styles.cardMeta}>
                    {praktikum.sessions.length} sesi
                    {praktikum.praktikum.status === "diarsipkan" ? " · Diarsipkan" : ""}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          : null}

        {!loading && !loadError && langkah === "sesi"
          ? (praktikumTerpilih?.sessions ?? []).map((sesi) => (
              <Pressable
                key={`${sesi.kelasId}-${sesi.praktikumId}-${sesi.id}`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/rekap/[id]",
                    params: { id: sesi.id },
                  })
                }
                style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
              >
                <View style={styles.sessionTop}>
                  <Text style={styles.cardTitle}>Pertemuan {sesi.pertemuan}</Text>
                  <Text
                    style={[
                      styles.badge,
                      sesi.status === "dibuka" ? styles.openBadge : null,
                      sesi.status === "ditutup" ? styles.closedBadge : null,
                      sesi.status === "diarsipkan" ? styles.archivedBadge : null,
                    ]}
                  >
                    {sesi.status === "dibuka"
                      ? "Dibuka"
                      : sesi.status === "ditutup"
                        ? "Ditutup"
                        : sesi.status === "diarsipkan"
                          ? "Diarsipkan"
                          : "Belum dibuka"}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>
                  {sesi.tanggal} · {sesi.jamMulai}–{sesi.jamSelesai}
                </Text>
                <View style={styles.sessionBottom}>
                  <Text style={styles.cardMeta}>Ruangan · {sesi.lab}</Text>
                  <Text style={styles.attendanceCount}>
                    {jumlahHadir(sesi)} hadir
                  </Text>
                </View>
                <Text style={styles.openRecap}>Lihat rekap ›</Text>
              </Pressable>
            ))
          : null}

        {!loading && !loadError && langkah === "kelas" && kelompokKelas.length === 0 ? (
          <DataState kind="empty" title="Belum ada rekap" message="Rekap akan muncul setelah kelas memiliki sesi." />
        ) : null}

        {!loading && !loadError && langkah === "praktikum" && !kelasTerpilih?.praktikum.length ? (
          <DataState kind="empty" compact title="Belum ada praktikum" message="Belum ada praktikum di kelas ini." />
        ) : null}

        {!loading && !loadError && langkah === "sesi" && !praktikumTerpilih?.sessions.length ? (
          <DataState kind="empty" compact title="Belum ada sesi" message="Sesi untuk praktikum ini belum tersedia." />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  content: { padding: 20, paddingBottom: 32 },
  eyebrow: { color: "#174A78", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: "#172B3A", fontSize: 25, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#647789", fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 18 },
  steps: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  stepItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E4ECF3", alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: "#075985" },
  stepNumber: { color: "#647789", fontSize: 12, fontWeight: "800" },
  stepNumberActive: { color: "#FFFFFF" },
  stepLabel: { color: "#647789", fontSize: 11, fontWeight: "700", marginLeft: 6 },
  stepLabelActive: { color: "#075985" },
  stepLine: { flex: 1, height: 1, backgroundColor: "#D8E2EC", marginHorizontal: 8 },
  backButton: { minHeight: 42, justifyContent: "center", alignSelf: "flex-start", paddingRight: 14, marginBottom: 8 },
  backText: { color: "#075985", fontSize: 14, fontWeight: "800" },
  sectionTitle: { color: "#172B3A", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE7F0", borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 11 },
  cardIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E7F3FA", alignItems: "center", justifyContent: "center" },
  cardIconText: { color: "#075985", fontSize: 19, fontWeight: "800" },
  cardBody: { flex: 1, marginLeft: 13 },
  cardTitle: { color: "#172B3A", fontSize: 15, fontWeight: "800" },
  cardMeta: { color: "#647789", fontSize: 12, marginTop: 5 },
  chevron: { color: "#075985", fontSize: 25, fontWeight: "700", marginLeft: 8 },
  sessionCard: { backgroundColor: "#FFFFFF", borderColor: "#DDE7F0", borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 11 },
  sessionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { overflow: "hidden", color: "#526273", backgroundColor: "#EDF2F7", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: "700" },
  openBadge: { color: "#16794A", backgroundColor: "#E8F7EE" },
  closedBadge: { color: "#526273", backgroundColor: "#EDF2F7" },
  archivedBadge: { color: "#8A4B08", backgroundColor: "#FFF3D6" },
  sessionBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  attendanceCount: { color: "#075985", fontSize: 12, fontWeight: "800" },
  openRecap: { color: "#075985", fontSize: 13, fontWeight: "800", marginTop: 12, alignSelf: "flex-end" },
  emptyCard: { backgroundColor: "#FFFFFF", borderColor: "#DDE7F0", borderWidth: 1, borderRadius: 17, padding: 20 },
  pressed: { opacity: 0.75 },
});
