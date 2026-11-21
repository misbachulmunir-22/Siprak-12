import { AsistenIzinList } from "@/components/AsistenIzinList";
import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import type { PengajuanIzin, Pengguna, Presensi, Sesi } from "@/types/siprak";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatWaktu(waktu: string) {
  return new Date(waktu).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PraktikanRow({
  praktikan,
  presensi,
  izin,
  sesi,
}: {
  praktikan: Pengguna;
  presensi?: Presensi;
  izin?: PengajuanIzin;
  sesi: Sesi;
}) {
  const labelStatus = presensi ? "Hadir" : izin?.status === "diterima" ? "Izin" : izin?.status === "menunggu" ? "Izin · Menunggu" : sesi.status === "ditutup" ? "Alpha" : "Belum Absen";
  const statusStyle = presensi ? styles.presentBadge : izin?.status === "diterima" ? styles.leaveBadge : izin?.status === "menunggu" ? styles.pendingBadge : sesi.status === "ditutup" ? styles.alphaBadge : styles.absentBadge;
  return (
    <View style={styles.rowCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {praktikan.nama.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.personInfo}>
        <Text style={styles.personName}>{praktikan.nama}</Text>
        <Text style={styles.personMeta}>
          {praktikan.nim} · {praktikan.kelas}
        </Text>
        {presensi ? (
          <Text style={styles.timeText}>
            Hadir pukul {formatWaktu(presensi.waktuHadir)}
          </Text>
        ) : null}
        {izin ? <Text style={[styles.timeText, styles.reasonText]}>Alasan: {izin.alasan}</Text> : null}
      </View>

      <View
        style={[
          styles.statusBadge,
          statusStyle,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            presensi ? styles.presentText : izin?.status === "diterima" ? styles.leaveText : izin?.status === "menunggu" ? styles.pendingText : sesi.status === "ditutup" ? styles.alphaText : styles.absentText,
          ]}
        >
          {labelStatus}
        </Text>
      </View>
    </View>
  );
}

export default function RekapSesiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, attendances, praktikanList, leaveRequests, refreshSessions } = useSiprak();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try { await refreshSessions(); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Rekap sesi gagal dimuat. Periksa koneksi lalu coba lagi."); }
    finally { setLoading(false); }
  }, [refreshSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sesi = sessions.find((item) => item.id === id);

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Kembali</Text></Pressable><SkeletonCards count={3} /></ScrollView></SafeAreaView>;
  }

  if (loadError) {
    return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Kembali</Text></Pressable><DataState kind="error" title="Rekap sesi belum bisa dimuat" message={loadError} actionLabel="Coba lagi" onAction={() => void load()} /></ScrollView></SafeAreaView>;
  }

  if (!sesi) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>
        <DataState kind="empty" title="Sesi tidak ditemukan" message="Kembali ke daftar sesi dan pilih sesi yang tersedia." actionLabel="Kembali" onAction={() => router.back()} />
      </SafeAreaView>
    );
  }

  const praktikanKelas = praktikanList.filter(
    (praktikan) => praktikan.kelasId === sesi.kelasId && praktikan.praktikumId === sesi.praktikumId,
  );

  const presensiSesi = attendances.filter(
    (presensi) => presensi.sesiId === sesi.id,
  );

  const jumlahHadir = praktikanKelas.filter((praktikan) =>
    presensiSesi.some((presensi) => presensi.praktikanId === praktikan.id),
  ).length;

  const presensiUntuk = (praktikanId: string) =>
    presensiSesi.find((presensi) => presensi.praktikanId === praktikanId);
  const izinUntuk = (praktikanId: string) => leaveRequests.find(item => item.sesiId === sesi.id && item.praktikanId === praktikanId);
  const jumlahIzin = praktikanKelas.filter(p => izinUntuk(p.id)?.status === "diterima").length;
  const jumlahAlpha = sesi.status === "ditutup" ? praktikanKelas.filter(p => !presensiUntuk(p.id) && izinUntuk(p.id)?.status !== "diterima" && izinUntuk(p.id)?.status !== "menunggu").length : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={praktikanKelas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>‹ Kembali</Text>
            </Pressable>

            <Text style={styles.eyebrow}>REKAP PER SESI</Text>
            <Text style={styles.title}>Pertemuan {sesi.pertemuan}</Text>
            <Text style={styles.subtitle}>{sesi.praktikum}</Text>
            <Text style={styles.meta}>
              Kelas {sesi.kelas} · {sesi.lab}
            </Text>

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>Praktikan hadir</Text>
                <Text style={styles.summaryValue}>
                  {jumlahHadir} hadir · {jumlahIzin} izin · {jumlahAlpha} alpha
                </Text>
              </View>
              <Text style={styles.summaryUnit}>orang</Text>
            </View>

            {sesi.status === "belum_dibuka" ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>Sesi belum dibuka.</Text>
              </View>
            ) : jumlahHadir === 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Belum ada praktikan yang hadir.
                </Text>
              </View>
            ) : null}
            <AsistenIzinList sesi={sesi} />
            <Text style={styles.sectionTitle}>Daftar praktikan</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PraktikanRow praktikan={item} sesi={sesi} presensi={presensiUntuk(item.id)} izin={izinUntuk(item.id)} />
        )}
        ListEmptyComponent={<DataState kind="empty" compact title="Belum ada peserta" message="Belum ada praktikan aktif di praktikum ini." />}
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 12,
    marginBottom: 12,
  },
  backText: {
    color: "#174A78",
    fontSize: 14,
    fontWeight: "700",
  },
  eyebrow: {
    color: "#174A78",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    color: "#172B3A",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: "#263B4B",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 5,
  },
  meta: {
    color: "#647789",
    fontSize: 13,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  summaryLabel: {
    color: "#647789",
    fontSize: 12,
  },
  summaryValue: {
    color: "#172B3A",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryUnit: {
    color: "#647789",
    fontSize: 13,
  },
  notice: {
    backgroundColor: "#FFF8E7",
    borderRadius: 12,
    marginTop: 12,
    padding: 13,
  },
  noticeText: {
    color: "#765414",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#172B3A",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 12,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 9,
    padding: 13,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2F9",
    borderRadius: 21,
    marginRight: 11,
  },
  avatarText: {
    color: "#174A78",
    fontSize: 16,
    fontWeight: "800",
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    color: "#172B3A",
    fontSize: 13,
    fontWeight: "800",
  },
  personMeta: {
    color: "#647789",
    fontSize: 11,
    marginTop: 3,
  },
  timeText: {
    color: "#16794A",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 6,
  },
  presentBadge: {
    backgroundColor: "#E8F7EE",
  },
  absentBadge: {
    backgroundColor: "#F1F5F9",
  },
  leaveBadge: { backgroundColor: "#E8F2FA" },
  pendingBadge: { backgroundColor: "#FFF4DF" },
  alphaBadge: { backgroundColor: "#FEF0EF" },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  presentText: {
    color: "#16794A",
  },
  absentText: {
    color: "#526273",
  },
  leaveText: { color: "#075985" },
  pendingText: { color: "#9A5B00" },
  alphaText: { color: "#B42318" },
  reasonText: { color: "#647789", marginTop: 5 },
  notFound: {
    color: "#647789",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
});
