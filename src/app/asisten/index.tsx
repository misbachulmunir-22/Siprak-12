import { useSiprak } from "@/context/SiprakContext";
import { SymbolView } from "expo-symbols";
import type { Sesi, StatusSesi } from "@/types/siprak";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterStatus = StatusSesi | "semua";

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "Semua", value: "semua" },
  { label: "Belum dibuka", value: "belum_dibuka" },
  { label: "Dibuka", value: "dibuka" },
  { label: "Ditutup", value: "ditutup" },
];

const STATUS_LABEL: Record<StatusSesi, string> = {
  belum_dibuka: "Belum dibuka",
  dibuka: "Dibuka",
  ditutup: "Ditutup",
  diarsipkan: "Diarsipkan",
};

const STATUS_COLORS: Record<StatusSesi, { background: string; text: string }> =
  {
    belum_dibuka: { background: "#F1F5F9", text: "#526273" },
    dibuka: { background: "#E8F7EE", text: "#16794A" },
    ditutup: { background: "#FCEBEC", text: "#B42332" },
    diarsipkan: { background: "#FFF4DF", text: "#9A5B00" },
  };

function formatTanggal(tanggal: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${tanggal}T12:00:00`));
}

function buatKunciTanggal(date: Date) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, "0");
  const hari = String(date.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

function awalMinggu(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hari = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - hari);
  return start;
}

function buatTanggalMinggu(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatTanggalPanjang(tanggal: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${tanggal}T12:00:00`));
}

function StatusBadge({ status }: { status: StatusSesi }) {
  const colors = STATUS_COLORS[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.background }]}>
      <Text style={[styles.statusText, { color: colors.text }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function SessionCard({
  sesi,
  jumlahHadir,
  jumlahPraktikan,
  onPress,
}: {
  sesi: Sesi;
  jumlahHadir: number;
  jumlahPraktikan: number;
  onPress: () => void;
}) {
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
        <Text style={styles.timeLabel}>
          {sesi.jamMulai}–{sesi.jamSelesai}
        </Text>
        <StatusBadge status={sesi.status} />
      </View>

      <Text style={styles.sessionTitle}>{sesi.praktikum}</Text>
      <Text style={styles.sessionMeta}>
        Kelas {sesi.kelas} · Pertemuan {sesi.pertemuan} · {sesi.lab}
      </Text>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Jadwal</Text>
        <Text style={styles.detailValue}>{formatTanggal(sesi.tanggal)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Waktu</Text>
        <Text style={styles.detailValue}>
          {sesi.jamMulai}–{sesi.jamSelesai}
        </Text>
      </View>

      <View style={styles.attendanceSummary}>
        <Text style={styles.attendanceLabel}>Kehadiran</Text>
        <Text style={styles.attendanceValue}>
          {jumlahHadir} dari {jumlahPraktikan} hadir
        </Text>
      </View>
    </Pressable>
  );
}

function SkeletonSessionCard() {
  return (
    <View accessibilityLabel="Memuat sesi" style={styles.skeletonCard}>
      <View style={styles.skeletonShort} />
      <View style={styles.skeletonMedium} />
      <View style={styles.skeletonLong} />
    </View>
  );
}

export default function JadwalAsistenScreen() {
  const { sessions, attendances, praktikanList, refreshSessions } = useSiprak();
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const router = useRouter();
  const hariIni = buatKunciTanggal(new Date());
  const [tanggalDipilih, setTanggalDipilih] = useState(hariIni);
  const [mingguMulai, setMingguMulai] = useState(() => awalMinggu(new Date()));
  const [sesiSiap, setSesiSiap] = useState(false);
  const [pesanMuatSesi, setPesanMuatSesi] = useState("");
  const requestId = useRef(0);

  const muatJadwal = useCallback(async () => {
    const id = ++requestId.current;
    setSesiSiap(false);
    setPesanMuatSesi("");
    try {
      await refreshSessions();
      if (requestId.current === id) setSesiSiap(true);
    } catch {
      if (requestId.current === id) {
        setPesanMuatSesi("Periksa koneksi internet Anda, lalu coba lagi.");
        setSesiSiap(true);
      }
    }
  }, [refreshSessions]);

  useFocusEffect(
    useCallback(() => {
      void muatJadwal();
      return () => {
        requestId.current += 1;
      };
    }, [muatJadwal]),
  );

  const sesiDitampilkan = useMemo(
    () => (sesiSiap && !pesanMuatSesi ? sessions : []),
    [sesiSiap, pesanMuatSesi, sessions],
  );

  const daftarTanggal = useMemo(() => buatTanggalMinggu(mingguMulai), [mingguMulai]);

  const sesiPadaTanggal = useMemo(
    () => sesiDitampilkan.filter((sesi) => sesi.tanggal === tanggalDipilih),
    [sesiDitampilkan, tanggalDipilih],
  );

  const filteredSessions = useMemo(() => {
    return [...sesiPadaTanggal]
      .sort((a, b) =>
        `${a.tanggal}T${a.jamMulai}`.localeCompare(
          `${b.tanggal}T${b.jamMulai}`,
        ),
      )
      .filter((sesi) => filter === "semua" || sesi.status === filter);
  }, [sesiPadaTanggal, filter]);

  const openedCount = sesiDitampilkan.filter(
    (sesi) => sesi.status === "dibuka",
  ).length;

  function jumlahHadirUntukSesi(sesiId: string) {
    return attendances.filter(
      (item) => item.sesiId === sesiId && item.waktuHadir,
    ).length;
  }

  function jumlahPraktikanUntukSesi(sesi: Sesi) {
    return praktikanList.filter(
      (praktikan) =>
        praktikan.praktikumId === sesi.praktikumId &&
        praktikan.statusKeanggotaan !== "nonaktif",
    ).length;
  }

  function geserMinggu(arah: -1 | 1) {
    const baru = new Date(mingguMulai);
    baru.setDate(baru.getDate() + arah * 7);
    setMingguMulai(baru);
    setTanggalDipilih(buatKunciTanggal(baru));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>SIPRAK</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>ASISTEN</Text>
              </View>
            </View>

            <Text style={styles.title}>Jadwal sesi</Text>
            <Text style={styles.dateHeading}>
              {formatTanggalPanjang(tanggalDipilih)}
            </Text>

            {!sesiSiap ? <Text style={styles.loadingLabel}>Sedang memuat jadwal...</Text> : null}

            {sesiSiap && !pesanMuatSesi ? <>
            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>
                {tanggalDipilih === hariIni ? "Hari ini" : "Sesi pada tanggal"}
              </Text>
              <Text style={styles.todayCount}>
                {sesiPadaTanggal.length} sesi praktikum
              </Text>
              <Text style={styles.todayMeta}>
                {`${sesiDitampilkan.length} sesi total · ${openedCount} sedang dibuka`}
              </Text>
            </View>
            <View style={styles.weekHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Minggu sebelumnya"
                onPress={() => geserMinggu(-1)}
                style={styles.weekArrow}
              >
                <Text style={styles.weekArrowText}>‹</Text>
              </Pressable>
              <Text style={styles.weekLabel}>Pilih tanggal</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Minggu berikutnya"
                onPress={() => geserMinggu(1)}
                style={styles.weekArrow}
              >
                <Text style={styles.weekArrowText}>›</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStrip}
            >
              {daftarTanggal.map((date) => {
                const key = buatKunciTanggal(date);
                const selected = key === tanggalDipilih;
                const datePart = new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                }).format(date);
                const weekday = new Intl.DateTimeFormat("id-ID", {
                  weekday: "short",
                })
                  .format(date)
                  .replace(".", "");

                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={formatTanggalPanjang(key)}
                    accessibilityState={{ selected }}
                    onPress={() => setTanggalDipilih(key)}
                    style={[
                      styles.dateTile,
                      selected && styles.dateTileSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateWeekday,
                        selected && styles.dateTextSelected,
                      ]}
                    >
                      {weekday}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        selected && styles.dateTextSelected,
                      ]}
                    >
                      {datePart}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {tanggalDipilih === hariIni ? "Sesi hari ini" : "Daftar sesi"}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {filteredSessions.length} sesi
                </Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const selected = filter === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(item.value)}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected && styles.filterTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            </> : null}
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            sesi={item}
            jumlahHadir={jumlahHadirUntukSesi(item.id)}
            jumlahPraktikan={jumlahPraktikanUntukSesi(item)}
            onPress={() =>
              router.push({
                pathname: "/sesi/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          !sesiSiap ? (
            <View>
              <SkeletonSessionCard />
              <SkeletonSessionCard />
              <SkeletonSessionCard />
            </View>
          ) : pesanMuatSesi ? (
            <View style={styles.stateContainer}>
              <View style={styles.stateIconError}>
                <SymbolView name={{ android: "warning", ios: "exclamationmark.triangle", web: "warning" }} size={42} tintColor="#B42332" />
              </View>
              <Text style={styles.stateTitle}>Jadwal belum dapat dimuat</Text>
              <Text style={styles.stateMessage}>{pesanMuatSesi}</Text>
              <Pressable accessibilityRole="button" onPress={() => void muatJadwal()} style={styles.retryButton}>
                <Text style={styles.retryText}>Coba lagi</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateContainer}>
              <View style={styles.stateIcon}>
                <SymbolView name={{ android: "calendar_month", ios: "calendar", web: "calendar_month" }} size={42} tintColor="#173F7A" />
              </View>
              <Text style={styles.stateTitle}>
                {sesiDitampilkan.length ? "Tidak ada sesi yang cocok" : "Belum ada sesi"}
              </Text>
              <Text style={styles.stateMessage}>
                {sesiDitampilkan.length
                  ? "Tidak ada sesi pada tanggal atau filter status ini. Coba pilih tanggal atau filter lain."
                  : "Buat sesi dari tab Kelas untuk menampilkan jadwal di sini."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  cardPressed: {
    opacity: 0.86,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: "#173F7A",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  roleBadge: {
    alignItems: "center",
    backgroundColor: "#E9EFFA",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  roleBadgeText: {
    color: "#173F7A",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#172B4D",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 30,
  },
  dateHeading: {
    color: "#52627B",
    fontSize: 16,
    marginTop: 8,
  },
  loadingLabel: { color: "#52627B", fontSize: 16, marginTop: 48, marginBottom: 18 },
  todayCard: {
    backgroundColor: "#173F7A",
    borderRadius: 20,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  todayLabel: { color: "#E9EFFA", fontSize: 15, fontWeight: "600" },
  todayCount: { color: "#FFFFFF", fontSize: 25, fontWeight: "800", marginTop: 8 },
  todayMeta: { color: "#DCE7F6", fontSize: 12, marginTop: 8 },
  weekHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  weekArrow: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  weekArrowText: { color: "#173F7A", fontSize: 30, lineHeight: 34 },
  weekLabel: { color: "#52627B", fontSize: 13, fontWeight: "600" },
  dateStrip: { gap: 8, paddingBottom: 4, paddingTop: 4 },
  dateTile: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 66,
    minWidth: 58,
    paddingHorizontal: 8,
  },
  dateTileSelected: { backgroundColor: "#173F7A", borderColor: "#173F7A" },
  dateWeekday: { color: "#52627B", fontSize: 12, fontWeight: "600" },
  dateNumber: { color: "#172B4D", fontSize: 15, fontWeight: "700", marginTop: 3 },
  dateTextSelected: { color: "#FFFFFF" },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 20,
  },
  sectionTitle: {
    color: "#172B4D",
    fontSize: 20,
    fontWeight: "800",
  },
  countBadge: {
    backgroundColor: "#E9EFFA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  countBadgeText: { color: "#52627B", fontSize: 12, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8E1EE",
    backgroundColor: "#FFFFFF",
  },
  filterChipSelected: {
    borderColor: "#173F7A",
    backgroundColor: "#173F7A",
  },
  filterText: {
    color: "#52627B",
    fontSize: 13,
    fontWeight: "700",
  },
  filterTextSelected: {
    color: "#FFFFFF",
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeLabel: {
    color: "#173F7A",
    fontSize: 16,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: 12,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sessionTitle: {
    color: "#172B4D",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 14,
  },
  sessionMeta: {
    color: "#52627B",
    fontSize: 14,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E9EFF5",
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  detailLabel: {
    color: "#52627B",
    fontSize: 13,
  },
  detailValue: {
    color: "#172B4D",
    fontSize: 14,
    fontWeight: "600",
  },
  attendanceSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F4F7FC",
    borderRadius: 12,
    marginTop: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attendanceLabel: {
    color: "#52627B",
    fontSize: 13,
  },
  attendanceValue: {
    color: "#173F7A",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: "#172B4D",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyMessage: {
    color: "#52627B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  skeletonCard: { backgroundColor: "#FFFFFF", borderRadius: 22, gap: 20, marginBottom: 16, minHeight: 188, justifyContent: "center", paddingHorizontal: 24 },
  skeletonShort: { backgroundColor: "#E1E8F2", borderRadius: 8, height: 16, width: "38%" },
  skeletonMedium: { backgroundColor: "#E1E8F2", borderRadius: 8, height: 20, width: "78%" },
  skeletonLong: { backgroundColor: "#EDF1F6", borderRadius: 8, height: 16, width: "94%" },
  stateContainer: { alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingTop: 62, paddingBottom: 46 },
  stateIcon: { alignItems: "center", backgroundColor: "#E9EFFA", borderRadius: 24, height: 112, justifyContent: "center", width: 112 },
  stateIconError: { alignItems: "center", backgroundColor: "#FCEBEC", borderRadius: 24, height: 112, justifyContent: "center", width: 112 },
  stateTitle: { color: "#172B4D", fontSize: 22, fontWeight: "800", marginTop: 28, textAlign: "center" },
  stateMessage: { color: "#52627B", fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: "center" },
  retryButton: { alignItems: "center", backgroundColor: "#173F7A", borderRadius: 14, justifyContent: "center", marginTop: 34, minHeight: 56, width: "100%" },
  retryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
});
