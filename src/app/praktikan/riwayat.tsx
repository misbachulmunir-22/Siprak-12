import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import type { StatusRiwayat } from "@/types/siprak";

type RiwayatSesi = {
  id: string;
  pertemuan: number;
  praktikum: string;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: StatusRiwayat;
  waktuHadir?: string;
  waktuAktivitas: number;
};

type FilterRiwayat = "semua" | "hadir" | "izin" | "alpha";

const STATUS_LABEL: Record<StatusRiwayat, string> = {
  hadir: "Hadir",
  izin: "Izin diterima",
  izin_menunggu: "Izin menunggu",
  izin_ditolak: "Izin ditolak",
  alpha: "Alpha",
  belum_hadir: "Belum hadir",
  belum_dimulai: "Belum dimulai",
};

function formatTanggal(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);

  return new Date(tahun, bulan - 1, hari).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatJam(waktu: string) {
  return waktu.slice(0, 5);
}

function RiwayatCard({
  item,
  onPress,
}: {
  item: RiwayatSesi;
  onPress: () => void;
}) {
  const statusStyle =
    item.status === "hadir"
      ? styles.statusHadir
      : item.status === "izin"
        ? styles.statusIzin
        : item.status === "izin_menunggu"
          ? styles.statusMenunggu
          : item.status === "izin_ditolak" || item.status === "alpha"
            ? styles.statusDitolak
      : item.status === "belum_hadir"
        ? styles.statusBelumHadir
        : styles.statusBelumDimulai;

  const statusTextStyle =
    item.status === "hadir"
      ? styles.statusTextHadir
      : item.status === "izin"
        ? styles.statusTextIzin
        : item.status === "izin_menunggu"
          ? styles.statusTextMenunggu
          : item.status === "izin_ditolak" || item.status === "alpha"
            ? styles.statusTextDitolak
      : item.status === "belum_hadir"
        ? styles.statusTextBelumHadir
        : styles.statusTextBelumDimulai;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sessionCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.sessionTopRow}>
        <Text style={styles.meetingLabel}>PERTEMUAN {item.pertemuan}</Text>

        <View style={[styles.statusBadge, statusStyle]}>
          <Text style={[styles.statusText, statusTextStyle]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.sessionTitle}>{item.praktikum}</Text>

      <Text style={styles.sessionMeta}>
        Kelas {item.kelas} · {item.lab}
      </Text>

      <View style={styles.divider} />

      <View style={styles.sessionBottomRow}>
        <View>
          <Text style={styles.detailLabel}>Jadwal</Text>
          <Text style={styles.detailValue}>{formatTanggal(item.tanggal)}</Text>
          <Text style={styles.detailMuted}>
            {formatJam(item.jamMulai)}–{formatJam(item.jamSelesai)}
          </Text>
        </View>

        {item.waktuHadir ? (
          <View style={styles.attendanceInfo}>
            <Text style={styles.detailLabel}>Waktu hadir</Text>
            <Text style={styles.attendanceTime}>
              {new Date(item.waktuHadir).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function RiwayatPraktikanScreen() {
  const router = useRouter();
  const { currentUser, sessions, attendances, leaveRequests, refreshSessions } = useSiprak();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterRiwayat>("semua");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      await refreshSessions();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Riwayat gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [refreshSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const riwayat: RiwayatSesi[] = useMemo(() => {
    const presensiSaya = currentUser
      ? attendances.filter((item) => item.praktikanId === currentUser.id)
      : [];

    return [...sessions]
    .map((sesi) => {
      const presensi = presensiSaya.find((item) => item.sesiId === sesi.id);
      const izin = leaveRequests.find(item => item.sesiId === sesi.id && item.praktikanId === currentUser?.id);

      let status: StatusRiwayat;

      if (presensi) {
        status = "hadir";
      } else if (izin?.status === "diterima") {
        status = "izin";
      } else if (izin?.status === "menunggu") {
        status = "izin_menunggu";
      } else if (izin?.status === "ditolak") {
        status = "izin_ditolak";
      } else if (sesi.status === "ditutup") {
        status = "alpha";
      } else if (sesi.status === "belum_dibuka") {
        status = "belum_dimulai";
      } else {
        status = "belum_hadir";
      }

      const waktuJadwal = new Date(`${sesi.tanggal}T${sesi.jamSelesai}:00`).getTime();
      const waktuCatatan = presensi?.waktuHadir ?? izin?.updatedAt ?? izin?.createdAt;
      const waktuCatatanMs = waktuCatatan ? new Date(waktuCatatan).getTime() : Number.NaN;

      return {
        id: sesi.id,
        pertemuan: sesi.pertemuan,
        praktikum: sesi.praktikum,
        kelas: sesi.kelas,
        lab: sesi.lab,
        tanggal: sesi.tanggal,
        jamMulai: sesi.jamMulai,
        jamSelesai: sesi.jamSelesai,
        status,
        waktuHadir: presensi?.waktuHadir,
        waktuAktivitas: Number.isFinite(waktuCatatanMs) ? waktuCatatanMs : waktuJadwal,
      };
    })
    .sort((a, b) => b.waktuAktivitas - a.waktuAktivitas);
  }, [sessions, attendances, leaveRequests, currentUser]);

  const riwayatTampil = useMemo(() => {
    const kataKunci = search.trim().toLocaleLowerCase();
    return riwayat.filter((item) => {
      const cocokCari = !kataKunci || item.praktikum.toLocaleLowerCase().includes(kataKunci);
      const cocokFilter = filter === "semua"
        || item.status === filter
        || (filter === "izin" && ["izin", "izin_menunggu", "izin_ditolak"].includes(item.status));
      return cocokCari && cocokFilter;
    });
  }, [filter, riwayat, search]);

  const jumlahIzin = riwayat.filter((item) => ["izin", "izin_menunggu", "izin_ditolak"].includes(item.status)).length;

  const jumlahHadir = riwayat.filter((item) => item.status === "hadir").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={loading || loadError ? [] : riwayatTampil}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>AREA PRAKTIKAN</Text>
            <Text style={styles.title}>Riwayat presensi</Text>
            <Text style={styles.subtitle}>
              Lihat catatan kehadiran dan jadwal praktikum kamu.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>✓</Text>
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Total sesi diikuti</Text>
                <Text style={styles.summaryValue}>
                  {jumlahHadir}{" "}
                  <Text style={styles.summaryUnit}>
                    dari {riwayat.length} sesi
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>{filter === "semua" ? "Semua sesi" : filter === "hadir" ? "Hadir" : filter === "izin" ? "Izin" : "Alpha"}</Text>
              <Text style={styles.listCount}>{riwayatTampil.length} sesi</Text>
            </View>
            <TextInput
              accessibilityLabel="Cari berdasarkan nama praktikum"
              value={search}
              onChangeText={setSearch}
              placeholder="Cari nama praktikum"
              style={styles.searchInput}
              returnKeyType="search"
            />
            <View style={styles.filterRow}>
              {([
                ["semua", `Semua (${riwayat.length})`],
                ["hadir", `Hadir (${jumlahHadir})`],
                ["izin", `Izin (${jumlahIzin})`],
                ["alpha", `Alpha (${riwayat.filter((item) => item.status === "alpha").length})`],
              ] as const).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === key }}
                  style={[styles.filterChip, filter === key && styles.filterChipSelected]}
                  onPress={() => setFilter(key)}
                >
                  <Text style={[styles.filterText, filter === key && styles.filterTextSelected]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <RiwayatCard
            item={item}
            onPress={() =>
              router.push({
                pathname: "/sesi/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={loading ? <SkeletonCards count={3} /> : loadError ? (
          <DataState kind="error" title="Riwayat belum bisa dimuat" message={loadError} actionLabel="Coba lagi" onAction={() => void load()} />
        ) : (
          <DataState kind="empty" title={riwayat.length ? "Tidak ada sesi yang cocok" : "Belum ada riwayat"} message={riwayat.length ? "Coba ubah kata kunci atau pilih filter yang lain." : "Riwayat presensi akan muncul saat jadwal praktikum tersedia."} />
        )}
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
    padding: 18,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    marginRight: 14,
    width: 46,
  },
  summaryIconText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    color: "#D6EAF6",
    fontSize: 12,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 3,
  },
  summaryUnit: {
    color: "#D6EAF6",
    fontSize: 13,
    fontWeight: "500",
  },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 24,
  },
  listTitle: {
    color: "#172B3A",
    fontSize: 17,
    fontWeight: "800",
  },
  listCount: {
    color: "#647789",
    fontSize: 12,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D6E2ED",
    borderRadius: 13,
    borderWidth: 1,
    color: "#172B3A",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
    marginTop: 12,
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
  sessionTopRow: {
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
  statusHadir: {
    backgroundColor: "#E8F7EE",
  },
  statusTextHadir: {
    color: "#16794A",
  },
  statusIzin: { backgroundColor: "#E8F2FA" },
  statusTextIzin: { color: "#075985" },
  statusMenunggu: { backgroundColor: "#FFF4DF" },
  statusTextMenunggu: { color: "#9A5B00" },
  statusDitolak: { backgroundColor: "#FEF0EF" },
  statusTextDitolak: { color: "#B42318" },
  statusBelumHadir: {
    backgroundColor: "#FFF3E8",
  },
  statusTextBelumHadir: {
    color: "#B45D12",
  },
  statusBelumDimulai: {
    backgroundColor: "#F1F5F9",
  },
  statusTextBelumDimulai: {
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
  divider: {
    backgroundColor: "#EEF2F6",
    height: 1,
    marginVertical: 14,
  },
  sessionBottomRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    color: "#8795A3",
    fontSize: 11,
  },
  detailValue: {
    color: "#304658",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  detailMuted: {
    color: "#647789",
    fontSize: 12,
    marginTop: 3,
  },
  attendanceInfo: {
    alignItems: "flex-end",
  },
  attendanceTime: {
    color: "#16794A",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
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
