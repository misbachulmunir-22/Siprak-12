import { AsistenSesiActions } from "@/components/AsistenSesiActions";
import { DataState, SkeletonCards } from "@/components/DataStates";
import { useSiprak } from "@/context/SiprakContext";
import type { StatusSesi } from "@/types/siprak";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    ditutup: { background: "#E9EEF3", text: "#475569" },
    diarsipkan: { background: "#FFF4DF", text: "#9A5B00" },
  };

function formatTanggal(tanggal: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${tanggal}T12:00:00`));
}

function formatWaktu(waktu?: string) {
  if (!waktu) {
    return "—";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(waktu));
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function DetailSesiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, attendances, praktikanList, currentUser, refreshSessions } =
    useSiprak();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      await refreshSessions();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Detail sesi gagal dimuat. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [refreshSessions]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sesi = sessions.find((item) => item.id === id);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Kembali</Text>
          </Pressable>
          <SkeletonCards count={2} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Kembali</Text>
          </Pressable>
          <DataState
            kind="error"
            title="Detail sesi belum bisa dimuat"
            message={loadError}
            actionLabel="Coba lagi"
            onAction={() => void load()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!sesi) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>
        <DataState
          kind="empty"
          title="Sesi tidak ditemukan"
          message="Kembali ke jadwal dan pilih sesi yang tersedia."
          actionLabel="Kembali ke jadwal"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const jumlahHadir = attendances.filter(
    (item) => item.sesiId === sesi.id,
  ).length;
  const statusColor = STATUS_COLORS[sesi.status];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali ke jadwal</Text>
        </Pressable>

        <View style={styles.heading}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor.background },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABEL[sesi.status]}
            </Text>
          </View>

          <Text style={styles.title}>{sesi.praktikum}</Text>
          <Text style={styles.subtitle}>
            Pertemuan {sesi.pertemuan} · Kelas {sesi.kelas}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informasi sesi</Text>
          <InfoRow label="Tanggal" value={formatTanggal(sesi.tanggal)} />
          <InfoRow
            label="Waktu"
            value={`${sesi.jamMulai}–${sesi.jamSelesai}`}
          />
          <InfoRow label="Laboratorium" value={sesi.lab} />
          <InfoRow
            label="Kehadiran"
            value={`${jumlahHadir} dari ${praktikanList.length} hadir`}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Aktivitas sesi</Text>
          <InfoRow label="Dibuka" value={formatWaktu(sesi.dibukaPada)} />
          <InfoRow label="Ditutup" value={formatWaktu(sesi.ditutupPada)} />

          {sesi.catatanPenutup ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Catatan penutup</Text>
              <Text style={styles.noteText}>{sesi.catatanPenutup}</Text>
            </View>
          ) : null}
        </View>
        {currentUser?.peran === "asisten" ? (
          <AsistenSesiActions sesi={sesi} />
        ) : null}
        {currentUser?.peran === "praktikan" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/presensi/[id]",
                params: { id: sesi.id },
              })
            }
            style={{
              minHeight: 50,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#174A78",
              borderRadius: 14,
              marginTop: 14,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
              Buka halaman presensi
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  backButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 12,
  },
  backText: {
    color: "#174A78",
    fontSize: 14,
    fontWeight: "700",
  },
  heading: {
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 20,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#172B3A",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 31,
    marginTop: 14,
  },
  subtitle: {
    color: "#647789",
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  sectionTitle: {
    color: "#172B3A",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
  },
  infoLabel: {
    color: "#647789",
    fontSize: 13,
  },
  infoValue: {
    color: "#263B4B",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  noteBox: {
    backgroundColor: "#F4F7FB",
    borderRadius: 12,
    marginTop: 4,
    padding: 12,
  },
  noteLabel: {
    color: "#647789",
    fontSize: 12,
    fontWeight: "700",
  },
  noteText: {
    color: "#263B4B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  notFoundTitle: {
    color: "#172B3A",
    fontSize: 18,
    fontWeight: "800",
  },
  notFoundMessage: {
    color: "#647789",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
});
