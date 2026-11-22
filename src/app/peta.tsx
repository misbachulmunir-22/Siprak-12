import { useSiprak } from "@/context/SiprakContext";
import type { Sesi } from "@/types/siprak";
import {
  Camera,
  Map as MapView,
  Marker,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import {
  collection,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LabPeta = {
  id: string;
  nama: string;
  latitude?: number;
  longitude?: number;
  radiusPresensiMeter?: number;
};

type LabBerkoordinat = LabPeta & {
  latitude: number;
  longitude: number;
};

const db = getFirestore();
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function punyaKoordinat(lab: LabPeta): lab is LabBerkoordinat {
  return (
    typeof lab.latitude === "number" &&
    Number.isFinite(lab.latitude) &&
    typeof lab.longitude === "number" &&
    Number.isFinite(lab.longitude) &&
    lab.latitude >= -90 &&
    lab.latitude <= 90 &&
    lab.longitude >= -180 &&
    lab.longitude <= 180
  );
}

function bacaSesiRealtime(
  id: string,
  data: Record<string, unknown>,
  kelasId: string,
  praktikumId: string,
): Sesi | null {
  if (
    typeof data.praktikum !== "string" ||
    typeof data.pertemuan !== "number" ||
    typeof data.kelas !== "string" ||
    typeof data.lab !== "string" ||
    typeof data.tanggal !== "string" ||
    typeof data.jamMulai !== "string" ||
    typeof data.jamSelesai !== "string" ||
    !["belum_dibuka", "dibuka", "ditutup", "diarsipkan"].includes(
      String(data.status),
    )
  ) {
    return null;
  }

  return {
    id,
    kelasId,
    praktikumId,
    praktikum: data.praktikum,
    pertemuan: data.pertemuan,
    kelas: data.kelas,
    lab: data.lab,
    ...(typeof data.ruanganId === "string"
      ? { ruanganId: data.ruanganId }
      : {}),
    ...(typeof data.reservasiId === "string"
      ? { reservasiId: data.reservasiId }
      : {}),
    tanggal: data.tanggal,
    jamMulai: data.jamMulai,
    jamSelesai: data.jamSelesai,
    status: data.status as Sesi["status"],
    ...(typeof data.dibukaPada === "string"
      ? { dibukaPada: data.dibukaPada }
      : {}),
    ...(typeof data.ditutupPada === "string"
      ? { ditutupPada: data.ditutupPada }
      : {}),
    ...(typeof data.catatanPenutup === "string"
      ? { catatanPenutup: data.catatanPenutup }
      : {}),
  };
}

export default function PetaLaboratoriumScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const [mencariLokasi, setMencariLokasi] = useState(false);
  const [labs, setLabs] = useState<LabPeta[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const { sessions, refreshSessions } = useSiprak();
  const [sesiLive, setSesiLive] = useState<Sesi[]>([]);

  const loadLabs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const snapshot = await getDocs(
        query(collection(db, "laboratorium"), where("status", "==", "aktif")),
      );

      const rows = snapshot.docs
        .map((item): LabPeta | null => {
          const data = item.data();

          if (typeof data.nama !== "string") {
            return null;
          }

          return {
            id: item.id,
            nama: data.nama,
            latitude:
              typeof data.latitude === "number" ? data.latitude : undefined,
            longitude:
              typeof data.longitude === "number" ? data.longitude : undefined,
            radiusPresensiMeter:
              typeof data.radiusPresensiMeter === "number"
                ? data.radiusPresensiMeter
                : undefined,
          };
        })
        .filter((item): item is LabPeta => item !== null)
        .sort((a, b) => a.nama.localeCompare(b.nama));

      setLabs(rows);
      setSelectedLabId((currentId) => {
        if (currentId && rows.some((lab) => lab.id === currentId)) {
          return currentId;
        }

        return rows.find(punyaKoordinat)?.id ?? rows[0]?.id ?? null;
      });
    } catch (loadError) {
      console.error("Gagal memuat laboratorium untuk peta:", loadError);
      setError(
        "Peta laboratorium gagal dimuat. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLabs();
    }, [loadLabs]),
  );

  useFocusEffect(
    useCallback(() => {
      void refreshSessions().catch((refreshError) => {
        console.warn(
          "Gagal memuat sesi untuk aktivitas laboratorium:",
          refreshError,
        );
      });
    }, [refreshSessions]),
  );

  useEffect(() => {
    const praktikumUnik = [
      ...new Map(
        sessions
          .filter((sesi) => !sesi.legacy)
          .map((sesi) => [
            `${sesi.kelasId}/${sesi.praktikumId}`,
            {
              kelasId: sesi.kelasId,
              praktikumId: sesi.praktikumId,
            },
          ]),
      ).values(),
    ];

    const berhentiMendengar = praktikumUnik.map(({ kelasId, praktikumId }) =>
      onSnapshot(
        collection(db, "kelas", kelasId, "praktikum", praktikumId, "sesi"),
        (snapshot) => {
          const sesiTerbaru = snapshot.docs
            .map((item) =>
              bacaSesiRealtime(item.id, item.data(), kelasId, praktikumId),
            )
            .filter((sesi): sesi is Sesi => sesi !== null);

          setSesiLive((sebelumnya) => [
            ...sebelumnya.filter(
              (sesi) =>
                sesi.legacy ||
                sesi.kelasId !== kelasId ||
                sesi.praktikumId !== praktikumId,
            ),
            ...sesiTerbaru,
          ]);
        },
        (listenerError) => {
          console.warn(
            `Gagal memantau sesi praktikum ${praktikumId}:`,
            listenerError,
          );
        },
      ),
    );

    return () => {
      berhentiMendengar.forEach((berhenti) => berhenti());
    };
  }, [sessions]);

  useFocusEffect(
    useCallback(() => {
      let screenIsActive = true;

      async function requestLocationPermission() {
        try {
          const permission = await Location.requestForegroundPermissionsAsync();

          if (screenIsActive) {
            setLocationGranted(permission.granted);
          }
        } catch (permissionError) {
          console.warn(
            "Gagal meminta izin lokasi untuk peta:",
            permissionError,
          );

          if (screenIsActive) {
            setLocationGranted(false);
          }
        }
      }

      void requestLocationPermission();

      return () => {
        screenIsActive = false;
      };
    }, []),
  );

  const labsBerkoordinat = labs.filter(punyaKoordinat);
  const selectedLab = labs.find((lab) => lab.id === selectedLabId) ?? null;
  const sekarang = new Date();
  const tanggalHariIni = [
    sekarang.getFullYear(),
    String(sekarang.getMonth() + 1).padStart(2, "0"),
    String(sekarang.getDate()).padStart(2, "0"),
  ].join("-");
  const jamSekarang = `${String(sekarang.getHours()).padStart(2, "0")}:${String(
    sekarang.getMinutes(),
  ).padStart(2, "0")}`;
  const waktuSekarang = `${tanggalHariIni}T${jamSekarang}`;

  const sesiUntukPeta = [
    ...new Map(
      [...sessions, ...sesiLive].map((sesi) => [
        `${sesi.kelasId}/${sesi.praktikumId}/${sesi.id}`,
        sesi,
      ]),
    ).values(),
  ];
  const sesiLaboratorium = selectedLab
    ? sesiUntukPeta
        .filter(
          (sesi) =>
            sesi.status !== "diarsipkan" &&
            (sesi.ruanganId
              ? sesi.ruanganId === selectedLab.id
              : sesi.lab.trim().toLocaleLowerCase() ===
                selectedLab.nama.trim().toLocaleLowerCase()),
        )
        .sort((a, b) =>
          `${a.tanggal}T${a.jamMulai}`.localeCompare(
            `${b.tanggal}T${b.jamMulai}`,
          ),
        )
    : [];

  const sesiBerlangsung = sesiLaboratorium.find(
    (sesi) => sesi.status === "dibuka",
  );

  const sesiBerikutnya = sesiLaboratorium.find(
    (sesi) =>
      sesi.status === "belum_dibuka" &&
      `${sesi.tanggal}T${sesi.jamMulai}` >= waktuSekarang,
  );
  const selectedLabBerkoordinat =
    selectedLab && punyaKoordinat(selectedLab) ? selectedLab : null;

  const labAwal = selectedLabBerkoordinat ?? labsBerkoordinat[0] ?? null;

  const initialViewState = labAwal
    ? {
        center: [labAwal.longitude, labAwal.latitude] as [number, number],
        zoom: 15,
      }
    : null;

  function pilihLaboratorium(lab: LabPeta) {
    setSelectedLabId(lab.id);

    if (punyaKoordinat(lab)) {
      cameraRef.current?.easeTo({
        center: [lab.longitude, lab.latitude],
        zoom: 15,
        duration: 450,
      });
    }
  }

  async function kembaliKeLokasiSaya() {
    if (mencariLokasi) return;

    setMencariLokasi(true);

    try {
      let { granted } = await Location.getForegroundPermissionsAsync();

      if (!granted) {
        ({ granted } = await Location.requestForegroundPermissionsAsync());
      }

      if (!granted) {
        setLocationGranted(false);
        return;
      }

      setLocationGranted(true);

      const pusatkan = (latitude: number, longitude: number) => {
        cameraRef.current?.easeTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 500,
        });
      };

      const lokasiTerakhir = await Location.getLastKnownPositionAsync({
        maxAge: 60_000,
        requiredAccuracy: 200,
      });

      if (lokasiTerakhir) {
        pusatkan(
          lokasiTerakhir.coords.latitude,
          lokasiTerakhir.coords.longitude,
        );
      }

      const lokasiTerbaru = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      pusatkan(lokasiTerbaru.coords.latitude, lokasiTerbaru.coords.longitude);
    } catch (error) {
      console.warn("Gagal menuju lokasi perangkat:", error);
    } finally {
      setMencariLokasi(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <Text style={styles.eyebrow}>SIPRAK · LOKASI</Text>
        <Text style={styles.title}>Peta laboratorium</Text>
        <Text style={styles.subtitle}>
          Pilih penanda atau nama ruangan untuk melihat lokasinya.
        </Text>

        {loading ? (
          <View style={styles.messageCard}>
            <ActivityIndicator size="large" color="#173F7A" />
            <Text style={styles.messageText}>Memuat lokasi laboratorium…</Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Peta belum bisa dimuat</Text>
            <Text style={styles.messageText}>{error}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadLabs()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Coba lagi</Text>
            </Pressable>
          </View>
        ) : labs.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>
              Belum ada laboratorium aktif
            </Text>
            <Text style={styles.messageText}>
              Laboratorium aktif akan muncul di halaman ini.
            </Text>
          </View>
        ) : initialViewState ? (
          <>
            <View
              style={styles.mapFrame}
              onTouchStart={() => setScrollEnabled(false)}
              onTouchEnd={() => setScrollEnabled(true)}
              onTouchCancel={() => setScrollEnabled(true)}
            >
              <MapView mapStyle={MAP_STYLE} style={styles.map}>
                <Camera ref={cameraRef} initialViewState={initialViewState} />

                {locationGranted && <UserLocation animated accuracy />}

                {labsBerkoordinat.map((lab) => (
                  <Marker
                    key={lab.id}
                    id={lab.id}
                    lngLat={[lab.longitude, lab.latitude]}
                    anchor="bottom"
                    onPress={() => setSelectedLabId(lab.id)}
                  >
                    <View
                      style={[
                        styles.marker,
                        lab.id === selectedLabId && styles.markerSelected,
                      ]}
                    />
                  </Marker>
                ))}
              </MapView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kembali ke lokasi saya"
                disabled={mencariLokasi}
                onPress={() => void kembaliKeLokasiSaya()}
                style={styles.locationButton}
              >
                {mencariLokasi ? (
                  <ActivityIndicator size="small" color="#173F7A" />
                ) : (
                  <Text style={styles.locationButtonText}>Lokasiku</Text>
                )}
              </Pressable>
            </View>

            {!locationGranted && (
              <View style={styles.permissionNote}>
                <Text style={styles.permissionText}>
                  Izin lokasi belum diberikan. Daftar lab tetap bisa dilihat,
                  tetapi posisi perangkat tidak akan muncul di peta.
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Daftar laboratorium</Text>

            {labs.map((lab) => {
              const selected = lab.id === selectedLabId;
              const hasCoordinates = punyaKoordinat(lab);

              return (
                <Pressable
                  key={lab.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => pilihLaboratorium(lab)}
                  style={[styles.labCard, selected && styles.labCardSelected]}
                >
                  <View style={styles.labText}>
                    <Text style={styles.labName}>{lab.nama}</Text>
                    <Text style={styles.labMeta}>
                      {hasCoordinates
                        ? `Radius presensi ${
                            lab.radiusPresensiMeter ?? "belum diatur"
                          } m`
                        : "Koordinat belum diatur"}
                    </Text>
                  </View>

                  {selected && <Text style={styles.selectedMark}>✓</Text>}
                </Pressable>
              );
            })}

            {selectedLab && (
              <View style={styles.detailCard}>
                <Text style={styles.detailEyebrow}>LABORATORIUM DIPILIH</Text>
                <Text style={styles.detailName}>{selectedLab.nama}</Text>
                <Text style={styles.detailMeta}>
                  {selectedLabBerkoordinat
                    ? `${selectedLabBerkoordinat.latitude.toFixed(
                        6,
                      )}, ${selectedLabBerkoordinat.longitude.toFixed(6)}`
                    : "Lokasi ini belum memiliki koordinat"}
                </Text>
                <Text style={styles.activityHeading}>
                  Aktivitas laboratorium
                </Text>

                {sesiBerlangsung ? (
                  <View style={styles.activityItem}>
                    <Text style={styles.activityBadgeOpen}>Berlangsung</Text>
                    <Text style={styles.activityName}>
                      {sesiBerlangsung.praktikum}
                    </Text>
                    <Text style={styles.activityMeta}>
                      Kelas {sesiBerlangsung.kelas} · Pertemuan{" "}
                      {sesiBerlangsung.pertemuan}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {sesiBerlangsung.tanggal} · {sesiBerlangsung.jamMulai}–
                      {sesiBerlangsung.jamSelesai}
                    </Text>
                  </View>
                ) : null}

                {sesiBerikutnya ? (
                  <View style={styles.activityItem}>
                    <Text style={styles.activityBadgeNext}>Berikutnya</Text>
                    <Text style={styles.activityName}>
                      {sesiBerikutnya.praktikum}
                    </Text>
                    <Text style={styles.activityMeta}>
                      Kelas {sesiBerikutnya.kelas} · Pertemuan{" "}
                      {sesiBerikutnya.pertemuan}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {sesiBerikutnya.tanggal} · {sesiBerikutnya.jamMulai}–
                      {sesiBerikutnya.jamSelesai}
                    </Text>
                  </View>
                ) : null}

                {!sesiBerlangsung && !sesiBerikutnya ? (
                  <Text style={styles.activityEmpty}>
                    Tidak ada sesi yang sedang berlangsung atau akan datang di
                    laboratorium ini.
                  </Text>
                ) : null}
              </View>
            )}
          </>
        ) : (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>
              Koordinat laboratorium belum tersedia
            </Text>
            <Text style={styles.messageText}>
              Atur latitude dan longitude laboratorium dari menu Ruangan agar
              peta dapat menampilkan lokasinya.
            </Text>

            <Text style={styles.sectionTitle}>Daftar laboratorium</Text>

            {labs.map((lab) => (
              <Pressable
                key={lab.id}
                accessibilityRole="button"
                onPress={() => setSelectedLabId(lab.id)}
                style={styles.labCard}
              >
                <Text style={styles.labName}>{lab.nama}</Text>
                <Text style={styles.labMeta}>Koordinat belum diatur</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activityHeading: {
    color: "#172B4D",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 10,
  },
  activityItem: {
    backgroundColor: "#F4F7FC",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  activityBadgeOpen: {
    color: "#16794A",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  activityBadgeNext: {
    color: "#173F7A",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  activityName: {
    color: "#172B4D",
    fontSize: 15,
    fontWeight: "700",
  },
  activityMeta: {
    color: "#52627B",
    fontSize: 13,
    marginTop: 5,
  },
  activityEmpty: {
    color: "#52627B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#52627B",
  },
  markerSelected: {
    backgroundColor: "#173F7A",
    transform: [{ scale: 1.2 }],
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  eyebrow: {
    color: "#52627B",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 8,
  },
  title: {
    color: "#172B4D",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    color: "#52627B",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
  },
  mapFrame: {
    position: "relative",
    height: 380,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#E4EAF3",
    marginBottom: 16,
  },
  locationButton: {
    position: "absolute",
    zIndex: 10,
    elevation: 10,
    top: 12,
    right: 12,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  locationButtonText: {
    color: "#173F7A",
    fontSize: 14,
    fontWeight: "700",
  },
  map: {
    flex: 1,
  },
  messageCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 170,
    backgroundColor: "#FFFFFF",
    borderColor: "#D9E2EF",
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  messageTitle: {
    color: "#172B4D",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  messageText: {
    color: "#52627B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    backgroundColor: "#173F7A",
    borderRadius: 14,
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  permissionNote: {
    backgroundColor: "#EAF0FB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
  },
  permissionText: {
    color: "#173F7A",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: "#172B4D",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 12,
  },
  labCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D9E2EF",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  labCardSelected: {
    backgroundColor: "#EAF0FB",
    borderColor: "#173F7A",
  },
  labText: {
    flex: 1,
  },
  labName: {
    color: "#172B4D",
    fontSize: 16,
    fontWeight: "700",
  },
  labMeta: {
    color: "#52627B",
    fontSize: 13,
    marginTop: 5,
  },
  selectedMark: {
    color: "#173F7A",
    fontSize: 22,
    fontWeight: "800",
    marginLeft: 12,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
  },
  detailEyebrow: {
    color: "#52627B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  detailName: {
    color: "#172B4D",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 7,
  },
  detailMeta: {
    color: "#52627B",
    fontSize: 14,
    marginTop: 7,
  },
});
