import { useSiprak } from "@/context/SiprakContext";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PayloadQr = {
  versi?: unknown;
  sesiId?: unknown;
  token?: unknown;
};

export default function ScanPresensiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, checkIn } = useSiprak();
  const [izinKamera, mintaIzinKamera] = useCameraPermissions();
  const [sedangMemproses, setSedangMemproses] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const [pesanBerhasil, setPesanBerhasil] = useState("");
  const scanTerkunci = useRef(false);

  const sesi = sessions.find((item) => item.id === id);

  async function prosesQr(data: string) {
    if (scanTerkunci.current || !sesi) return;

    scanTerkunci.current = true;
    setSedangMemproses(true);
    setPesanError("");

    try {
      let payload: PayloadQr;

      try {
        payload = JSON.parse(data) as PayloadQr;
      } catch {
        throw new Error("QR tidak dikenali. Pindai QR dari layar asisten.");
      }

      if (
        payload.versi !== 1 ||
        payload.sesiId !== sesi.id ||
        typeof payload.token !== "string" ||
        payload.token.length < 32
      ) {
        throw new Error(
          "QR tidak cocok dengan sesi ini. Pindai QR yang benar.",
        );
      }

      if (sesi.status !== "dibuka") {
        throw new Error("Sesi ini tidak sedang dibuka.");
      }

      const layananLokasiAktif = await Location.hasServicesEnabledAsync();
      if (!layananLokasiAktif) {
        throw new Error("Aktifkan layanan lokasi perangkat lalu coba lagi.");
      }

      const izinLokasi = await Location.requestForegroundPermissionsAsync();
      if (!izinLokasi.granted) {
        throw new Error(
          izinLokasi.canAskAgain
            ? "Izin lokasi diperlukan untuk melakukan presensi."
            : "Izin lokasi ditolak. Aktifkan izin lokasi SIPRAK melalui Pengaturan perangkat.",
        );
      }

      const lokasi = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      const hasil = await checkIn(
        sesi,
        {
          latitude: lokasi.coords.latitude,
          longitude: lokasi.coords.longitude,
          akurasiMeter: lokasi.coords.accuracy ?? 99999,
        },
        payload.token,
      );

      const waktu = new Date(hasil.waktuHadir).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setPesanBerhasil(`Presensimu tercatat pukul ${waktu}.`);
    } catch (error) {
      setPesanError(
        error instanceof Error ? error.message : "Presensi gagal. Coba lagi.",
      );
    } finally {
      setSedangMemproses(false);
    }
  }

  function cobaScanLagi() {
    scanTerkunci.current = false;
    setPesanError("");
  }

  if (!sesi) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>Sesi tidak ditemukan</Text>
          <Pressable onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali ke presensi</Text>
        </Pressable>

        <Text style={styles.title}>Pindai QR presensi</Text>
        <Text style={styles.description}>
          Arahkan kamera ke QR yang ditampilkan asisten untuk Pertemuan{" "}
          {sesi.pertemuan}.
        </Text>

        {pesanBerhasil ? (
          <View style={styles.resultCard}>
            <Text style={styles.successTitle}>Presensi berhasil</Text>
            <Text style={styles.description}>{pesanBerhasil}</Text>
            <Pressable onPress={() => router.back()} style={styles.button}>
              <Text style={styles.buttonText}>Selesai</Text>
            </Pressable>
          </View>
        ) : !izinKamera ? (
          <ActivityIndicator color="#174A78" style={styles.loader} />
        ) : !izinKamera.granted ? (
          <View style={styles.resultCard}>
            <Text style={styles.description}>
              Kamera diperlukan untuk memindai QR presensi.
            </Text>
            <Pressable
              onPress={() => void mintaIzinKamera()}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Izinkan kamera</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.cameraFrame}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={
                  sedangMemproses || pesanError
                    ? undefined
                    : (hasil) => void prosesQr(hasil.data)
                }
              />

              {sedangMemproses ? (
                <View style={styles.overlay}>
                  <ActivityIndicator color="#FFFFFF" size="large" />
                  <Text style={styles.overlayText}>Mencatat presensi…</Text>
                </View>
              ) : null}
            </View>

            {pesanError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{pesanError}</Text>
                <Pressable onPress={cobaScanLagi} style={styles.button}>
                  <Text style={styles.buttonText}>Pindai lagi</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.hint}>
                Pastikan kamu berada di area laboratorium saat memindai.
              </Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingRight: 12,
  },
  backText: {
    color: "#174A78",
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    color: "#172B3A",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 18,
  },
  description: {
    color: "#647789",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  cameraFrame: {
    height: 420,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#172B3A",
    marginTop: 22,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#172B3A99",
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
  hint: {
    color: "#647789",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    textAlign: "center",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginTop: 20,
    padding: 18,
  },
  successTitle: {
    color: "#16794A",
    fontSize: 18,
    fontWeight: "800",
  },
  errorCard: {
    backgroundColor: "#FFF1F0",
    borderRadius: 16,
    marginTop: 14,
    padding: 16,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#174A78",
    borderRadius: 14,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  loader: {
    marginTop: 40,
  },
});
