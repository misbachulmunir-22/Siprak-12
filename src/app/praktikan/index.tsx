import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import type { Sesi } from "@/types/siprak";

type FilterJadwal = "terdekat" | "dibuka" | "ditutup";

function urutkanJadwal(a: Sesi, b: Sesi) {
  const aDitutup = a.status === "ditutup";
  const bDitutup = b.status === "ditutup";
  if (aDitutup !== bDitutup) return aDitutup ? 1 : -1;

  const waktuA = `${a.tanggal}T${a.jamMulai}`;
  const waktuB = `${b.tanggal}T${b.jamMulai}`;
  return aDitutup ? waktuB.localeCompare(waktuA) : waktuA.localeCompare(waktuB);
}

function formatTanggal(tanggal: string) {
  return new Date(`${tanggal}T12:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function JadwalCard({
  sesi,
  sudahPresensi,
  statusIzin,
  onPress,
}: {
  sesi: Sesi;
  sudahPresensi: boolean;
  statusIzin?: "menunggu" | "diterima" | "ditolak";
  onPress: () => void;
}) {
  let labelStatus = "Akan datang";
  let badgeStyle = styles.badgeBelumDibuka;
  let badgeTextStyle = styles.badgeTextBelumDibuka;

  if (sudahPresensi) {
    labelStatus = "Sudah presensi";
    badgeStyle = styles.badgeHadir;
    badgeTextStyle = styles.badgeTextHadir;
  } else if (statusIzin === "diterima") {
    labelStatus = "Izin diterima";
    badgeStyle = styles.badgeIzin;
    badgeTextStyle = styles.badgeTextIzin;
  } else if (statusIzin === "menunggu") {
    labelStatus = "Izin menunggu";
    badgeStyle = styles.badgeMenunggu;
    badgeTextStyle = styles.badgeTextMenunggu;
  } else if (statusIzin === "ditolak") {
    labelStatus = sesi.status === "ditutup" ? "Alpha · izin ditolak" : "Izin ditolak";
    badgeStyle = styles.badgeDitolak;
    badgeTextStyle = styles.badgeTextDitolak;
  } else if (sesi.status === "dibuka") {
    labelStatus = "Presensi dibuka";
    badgeStyle = styles.badgeDibuka;
    badgeTextStyle = styles.badgeTextDibuka;
  } else if (sesi.status === "ditutup") {
    labelStatus = "Sesi selesai";
    badgeStyle = styles.badgeDitutup;
    badgeTextStyle = styles.badgeTextDitutup;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sessionCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.meetingLabel}>PERTEMUAN {sesi.pertemuan}</Text>

        <View style={[styles.statusBadge, badgeStyle]}>
          <Text style={[styles.statusText, badgeTextStyle]}>{labelStatus}</Text>
        </View>
      </View>

      <Text style={styles.sessionTitle}>{sesi.praktikum}</Text>
      <Text style={styles.sessionMeta}>
        Kelas {sesi.kelas} · {sesi.lab}
      </Text>

      <View style={styles.cardDivider} />

      <View style={styles.cardBottomRow}>
        <View>
          <Text style={styles.dateText}>{formatTanggal(sesi.tanggal)}</Text>
          <Text style={styles.timeText}>
            {sesi.jamMulai}–{sesi.jamSelesai}
          </Text>
        </View>

        <Text style={styles.detailLink}>Detail ›</Text>
      </View>
    </Pressable>
  );
}

export default function JadwalPraktikanScreen() {
  const router = useRouter();
  const { currentUser, sessions, leaveRequests, getUserAttendance, refreshSessions } =
    useSiprak();

  const [sesiSiap, setSesiSiap] = useState(false);
  const [pesanMuatSesi, setPesanMuatSesi] = useState("");
  const [filterJadwal, setFilterJadwal] = useState<FilterJadwal>("terdekat");

  const load = useCallback(async () => {
    setSesiSiap(false);
    setPesanMuatSesi("");
    try {
      await refreshSessions();
      setSesiSiap(true);
    } catch (error) {
      console.error("Gagal memuat jadwal praktikan:", error);
      setPesanMuatSesi("Jadwal gagal dimuat. Periksa koneksi lalu coba lagi.");
      setSesiSiap(true);
    }
  }, [refreshSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sesiKelas = sessions
    .filter((sesi) => sesi.status !== "diarsipkan" && (!currentUser?.kelas || sesi.kelas === currentUser.kelas) && (!currentUser?.praktikumId || sesi.praktikumId === currentUser.praktikumId))
    .sort(urutkanJadwal);

  const sesiTampil = filterJadwal === "dibuka"
    ? sesiKelas.filter((sesi) => sesi.status === "dibuka")
    : filterJadwal === "ditutup"
      ? sesiKelas.filter((sesi) => sesi.status === "ditutup")
      : sesiKelas;

  const presensiSaya = currentUser ? getUserAttendance(currentUser.id) : [];

  const jumlahHadir = sesiKelas.filter((sesi) =>
    presensiSaya.some((presensi) => presensi.sesiId === sesi.id),
  ).length;

  const jumlahBerlangsung = sesiKelas.filter(
    (sesi) => sesi.status === "dibuka",
  ).length;

  const namaDepan = currentUser?.nama.split(" ")[0] ?? "Praktikan";

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={sesiTampil}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>SIPRAK-12</Text>
            <Text style={styles.title}>Halo, {namaDepan}</Text>
            <Text style={styles.subtitle}>
              Ini jadwal praktikum dan informasi presensimu.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryMain}>
                <Text style={styles.summaryLabel}>Presensi tercatat</Text>
                <Text style={styles.summaryValue}>
                  {jumlahHadir}
                  <Text style={styles.summaryUnit}>
                    {" "}
                    dari {sesiKelas.length} sesi
                  </Text>
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summarySide}>
                <Text style={styles.summaryLabel}>Sedang dibuka</Text>
                <Text style={styles.summaryOpenValue}>{jumlahBerlangsung}</Text>
              </View>
            </View>

            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Jadwal praktikum</Text>
                <Text style={styles.sectionSubtitle}>
                  Kelas yang kamu ikuti
                </Text>
              </View>
              <Text style={styles.sessionCount}>{sesiTampil.length} sesi</Text>
            </View>
            <View style={styles.filterRow}>
              {([
                ["terdekat", `Terdekat (${sesiKelas.length})`],
                ["dibuka", `Dibuka (${jumlahBerlangsung})`],
                ["ditutup", `Ditutup (${sesiKelas.filter((sesi) => sesi.status === "ditutup").length})`],
              ] as const).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filterJadwal === key }}
                  style={[styles.filterChip, filterJadwal === key && styles.filterChipSelected]}
                  onPress={() => setFilterJadwal(key)}
                >
                  <Text style={[styles.filterText, filterJadwal === key && styles.filterTextSelected]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const sudahPresensi = presensiSaya.some(
            (presensi) => presensi.sesiId === item.id,
          );
          const statusIzin = leaveRequests.find(izin => izin.sesiId === item.id && izin.praktikanId === currentUser?.id)?.status;

          return (
            <JadwalCard
              sesi={item}
              sudahPresensi={sudahPresensi}
              statusIzin={statusIzin}
              onPress={() =>
                router.push({
                  pathname: "/sesi/[id]",
                  params: { id: item.id },
                })
              }
            />
          );
        }}
        ListEmptyComponent={
          !sesiSiap ? <SkeletonCards count={3} /> : pesanMuatSesi ? (
            <DataState kind="error" title="Jadwal belum bisa dimuat" message={pesanMuatSesi} actionLabel="Coba lagi" onAction={() => void load()} />
          ) : sesiKelas.length > 0 ? (
            <DataState kind="empty" compact title="Tidak ada sesi di filter ini" message="Pilih filter lain untuk melihat sesi praktikum." />
          ) : (
            <DataState kind="empty" title="Belum ada jadwal" message="Jadwal praktikum untuk kelas yang kamu ikuti akan muncul di sini." />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  eyebrow: {
    color: "#174A78",
    fontSize: 11,
    fontWeight: "800",
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
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: "#0B527E",
    borderRadius: 18,
    flexDirection: "row",
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  summaryMain: {
    flex: 1,
  },
  summaryLabel: {
    color: "#D6EAF6",
    fontSize: 11,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryUnit: {
    color: "#D6EAF6",
    fontSize: 12,
    fontWeight: "500",
  },
  summaryDivider: {
    backgroundColor: "rgba(255,255,255,0.24)",
    height: 40,
    marginHorizontal: 16,
    width: 1,
  },
  summarySide: {
    alignItems: "center",
    minWidth: 72,
  },
  summaryOpenValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitle: {
    color: "#172B3A",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#647789",
    fontSize: 12,
    marginTop: 3,
  },
  sessionCount: {
    color: "#647789",
    fontSize: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: "#E8F2FA",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  filterChipSelected: {
    backgroundColor: "#075985",
  },
  filterText: {
    color: "#075985",
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextSelected: {
    color: "#FFFFFF",
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.86,
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meetingLabel: {
    color: "#647789",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeHadir: {
    backgroundColor: "#E8F7EE",
  },
  badgeTextHadir: {
    color: "#16794A",
  },
  badgeDibuka: {
    backgroundColor: "#E8F7EE",
  },
  badgeTextDibuka: {
    color: "#16794A",
  },
  badgeDitutup: {
    backgroundColor: "#E9EEF3",
  },
  badgeTextDitutup: {
    color: "#475569",
  },
  badgeIzin: { backgroundColor: "#E8F2FA" },
  badgeTextIzin: { color: "#075985" },
  badgeMenunggu: { backgroundColor: "#FFF4DF" },
  badgeTextMenunggu: { color: "#9A5B00" },
  badgeDitolak: { backgroundColor: "#FEF0EF" },
  badgeTextDitolak: { color: "#B42318" },
  badgeBelumDibuka: {
    backgroundColor: "#F1F5F9",
  },
  badgeTextBelumDibuka: {
    color: "#526273",
  },
  sessionTitle: {
    color: "#172B3A",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 13,
  },
  sessionMeta: {
    color: "#647789",
    fontSize: 13,
    marginTop: 5,
  },
  cardDivider: {
    backgroundColor: "#EEF2F6",
    height: 1,
    marginVertical: 14,
  },
  cardBottomRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateText: {
    color: "#304658",
    fontSize: 12,
    fontWeight: "700",
  },
  timeText: {
    color: "#647789",
    fontSize: 12,
    marginTop: 4,
  },
  detailLink: {
    color: "#174A78",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
  },
  emptyIcon: {
    color: "#7890A3",
    fontSize: 34,
  },
  emptyTitle: {
    color: "#172B3A",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyText: {
    color: "#647789",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
});
