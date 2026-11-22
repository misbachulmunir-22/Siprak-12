import { DataState, SkeletonCards } from "@/components/DataStates";
import { PraktikanIzinAction } from "@/components/PraktikanIzinAction";
import { PraktikanPresensiAction } from "@/components/PraktikanPresensiAction";
import { useSiprak } from "@/context/SiprakContext";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PresensiSesiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, refreshSessions } = useSiprak();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const muatSesi = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      await refreshSessions();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Informasi presensi gagal dimuat. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [refreshSessions]);

  useFocusEffect(
    useCallback(() => {
      void muatSesi();
    }, [muatSesi]),
  );

  const sesi = sessions.find((item) => item.id === id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali ke detail sesi</Text>
        </Pressable>

        {loading ? (
          <SkeletonCards count={2} />
        ) : loadError ? (
          <DataState
            kind="error"
            title="Presensi belum bisa dimuat"
            message={loadError}
            actionLabel="Coba lagi"
            onAction={() => void muatSesi()}
          />
        ) : !sesi ? (
          <DataState
            kind="empty"
            title="Sesi tidak ditemukan"
            message="Kembali ke jadwal dan pilih sesi yang tersedia."
            actionLabel="Kembali"
            onAction={() => router.back()}
          />
        ) : (
          <>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>SIPRAK · PRESENSI</Text>
              <Text style={styles.title}>{sesi.praktikum}</Text>
              <Text style={styles.subtitle}>
                Kelas {sesi.kelas} · Pertemuan {sesi.pertemuan}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Informasi sesi</Text>
              <Text style={styles.infoText}>
                {sesi.tanggal} · {sesi.jamMulai}–{sesi.jamSelesai}
              </Text>
              <Text style={styles.infoText}>Laboratorium: {sesi.lab}</Text>
            </View>

            <PraktikanPresensiAction sesi={sesi} />
            <PraktikanIzinAction sesi={sesi} />
          </>
        )}
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
    marginTop: 16,
    marginBottom: 20,
  },
  eyebrow: {
    color: "#647789",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: "#172B3A",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    color: "#647789",
    fontSize: 15,
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  infoTitle: {
    color: "#172B3A",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  infoText: {
    color: "#647789",
    fontSize: 14,
    lineHeight: 22,
  },
});
