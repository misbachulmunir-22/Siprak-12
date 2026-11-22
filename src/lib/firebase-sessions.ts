import { ambilSemuaPraktikumAsisten } from "@/lib/firebase-practicums";
import { kirimPushKePraktikum } from "@/lib/push-notifications";
import {
  waktuMulaiMasihAkanDatang,
  waktuSelesaiMasihAkanDatang,
} from "@/lib/session-schedule-time";
import type {
  PosisiPresensi,
  Presensi,
  Sesi,
  StatusSesi,
} from "@/types/siprak";
import { getAuth } from "@react-native-firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} from "@react-native-firebase/firestore";
import * as Crypto from "expo-crypto";

const db = getFirestore();

function uid(): string {
  const value = getAuth().currentUser?.uid;
  if (!value) throw new Error("Silakan masuk terlebih dahulu.");
  return value;
}

export function sesiRef(sesi: Pick<Sesi, "kelasId" | "praktikumId" | "id">) {
  return doc(
    db,
    "kelas",
    sesi.kelasId,
    "praktikum",
    sesi.praktikumId,
    "sesi",
    sesi.id,
  );
}

export async function terbitkanKodeQrPresensi(sesi: Sesi) {
  uid();

  if (sesi.legacy) {
    throw new Error("QR presensi hanya tersedia untuk sesi baru.");
  }

  const sesiDokumen = sesiRef(sesi);
  const sesiSnapshot = await getDoc(sesiDokumen);

  if (!sesiSnapshot.exists() || sesiSnapshot.data().status !== "dibuka") {
    throw new Error("QR hanya dapat dibuat saat sesi sedang dibuka.");
  }

  const token = Crypto.randomUUID();
  const expiresAt = Timestamp.fromMillis(Date.now() + 45_000);

  await setDoc(
    doc(
      db,
      "kelas",
      sesi.kelasId,
      "praktikum",
      sesi.praktikumId,
      "sesi",
      sesi.id,
      "kodePresensi",
      "aktif",
    ),
    {
      token,
      expiresAt,
    },
  );

  return {
    token,
    expiresAt: expiresAt.toDate().toISOString(),
  };
}

export function anggotaRef(
  sesi: Pick<Sesi, "kelasId" | "praktikumId">,
  praktikanId: string,
) {
  return doc(
    db,
    "kelas",
    sesi.kelasId,
    "praktikum",
    sesi.praktikumId,
    "anggota",
    praktikanId,
  );
}

function bacaSesi(
  id: string,
  data: Record<string, unknown>,
  kelasId: string,
  praktikumId: string,
  legacy = false,
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
  )
    return null;
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
    ...(legacy || data.legacySumber === true ? { legacy: true } : {}),
    tanggal: data.tanggal,
    jamMulai: data.jamMulai,
    jamSelesai: data.jamSelesai,
    status: data.status as StatusSesi,
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

function validasiJadwal(
  input: Pick<Sesi, "pertemuan" | "tanggal" | "jamMulai" | "jamSelesai">,
) {
  if (!Number.isInteger(input.pertemuan) || input.pertemuan < 1)
    throw new Error("Nomor pertemuan harus berupa angka minimal 1.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamMulai) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamSelesai)
  )
    throw new Error("Gunakan tanggal YYYY-MM-DD dan waktu HH:MM.");
  if (input.jamMulai >= input.jamSelesai)
    throw new Error("Jam selesai harus setelah jam mulai.");
  if (!waktuMulaiMasihAkanDatang(input.tanggal, input.jamMulai))
    throw new Error(
      "Tanggal dan jam mulai harus setelah waktu saat ini (WIB).",
    );
  if (!waktuSelesaiMasihAkanDatang(input.tanggal, input.jamSelesai))
    throw new Error(
      "Tanggal dan jam selesai harus setelah waktu saat ini (WIB).",
    );
}

function reservationRef(ruanganId: string, tanggal: string) {
  return doc(db, "laboratorium", ruanganId, "jadwal", tanggal);
}

function bentrok(
  data: Record<string, unknown> | undefined,
  input: { jamMulai: string; jamSelesai: string },
  skipId?: string,
) {
  const map = data?.reservasi;
  if (!map || typeof map !== "object") return false;
  return Object.entries(map as Record<string, unknown>).some(([id, raw]) => {
    if (id === skipId || !raw || typeof raw !== "object") return false;
    const item = raw as Record<string, unknown>;
    return (
      item.status !== "diarsipkan" &&
      typeof item.jamMulai === "string" &&
      typeof item.jamSelesai === "string" &&
      item.jamMulai < input.jamSelesai &&
      input.jamMulai < item.jamSelesai
    );
  });
}

export async function buatSesiKelas(
  kelasId: string,
  praktikumId: string,
  input: {
    pertemuan: number;
    ruanganId: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
  },
): Promise<Sesi> {
  const asistenUid = uid();
  validasiJadwal(input);
  const kelasRef = doc(db, "kelas", kelasId);
  const courseRef = doc(db, "kelas", kelasId, "praktikum", praktikumId);
  const roomRef = doc(db, "laboratorium", input.ruanganId);
  const [kelasSnap, courseSnap, roomSnap] = await Promise.all([
    getDoc(kelasRef),
    getDoc(courseRef),
    getDoc(roomRef),
  ]);
  if (!kelasSnap.exists() || !courseSnap.exists() || !roomSnap.exists())
    throw new Error("Kelas, praktikum, atau ruangan tidak ditemukan.");
  const kelas = kelasSnap.data();
  const course = courseSnap.data();
  const room = roomSnap.data();
  if (kelas.asistenUid !== asistenUid || course.asistenUid !== asistenUid)
    throw new Error("Kamu tidak memiliki akses ke praktikum ini.");
  if (kelas.status !== "aktif" || course.status !== "aktif")
    throw new Error("Sesi hanya bisa dibuat pada kelas dan praktikum aktif.");
  if (room.asistenUid !== asistenUid || room.status !== "aktif")
    throw new Error("Pilih ruangan aktif yang kamu kelola.");
  const ref = doc(
    collection(db, "kelas", kelasId, "praktikum", praktikumId, "sesi"),
  );
  const reserveRef = reservationRef(input.ruanganId, input.tanggal);
  const now = new Date().toISOString();
  await runTransaction(db, async (tx) => {
    const reserve = await tx.get(reserveRef);
    if (bentrok(reserve.exists() ? reserve.data() : undefined, input))
      throw new Error("Jadwal bentrok dengan sesi lain di ruangan ini.");
    const reservations = (
      reserve.exists() &&
      reserve.data().reservasi &&
      typeof reserve.data().reservasi === "object"
        ? reserve.data().reservasi
        : {}
    ) as Record<string, unknown>;
    tx.set(ref, {
      kelasId,
      praktikumId,
      praktikum: course.nama,
      pertemuan: input.pertemuan,
      kelas: kelas.nama,
      lab: room.nama,
      ruanganId: input.ruanganId,
      reservasiId: ref.id,
      tanggal: input.tanggal,
      jamMulai: input.jamMulai,
      jamSelesai: input.jamSelesai,
      status: "belum_dibuka",
      createdAt: now,
      updatedAt: now,
    });
    tx.set(reserveRef, {
      tanggal: input.tanggal,
      reservasi: {
        ...reservations,
        [ref.id]: {
          sesiId: ref.id,
          kelasId,
          praktikumId,
          jamMulai: input.jamMulai,
          jamSelesai: input.jamSelesai,
          status: "belum_dibuka",
        },
      },
    });
  });
  return {
    id: ref.id,
    kelasId,
    praktikumId,
    praktikum: course.nama,
    pertemuan: input.pertemuan,
    kelas: kelas.nama,
    lab: room.nama,
    ruanganId: input.ruanganId,
    reservasiId: ref.id,
    tanggal: input.tanggal,
    jamMulai: input.jamMulai,
    jamSelesai: input.jamSelesai,
    status: "belum_dibuka",
  };
}

export async function ubahSesiKelas(
  sesi: Sesi,
  input: Pick<Sesi, "pertemuan" | "tanggal" | "jamMulai" | "jamSelesai"> & {
    ruanganId: string;
  },
) {
  const asistenUid = uid();
  validasiJadwal(input);
  const targetRoom = doc(db, "laboratorium", input.ruanganId);
  const currentRef = sesiRef(sesi);
  const nextReservation = reservationRef(input.ruanganId, input.tanggal);
  const oldReservation = sesi.ruanganId
    ? reservationRef(sesi.ruanganId, sesi.tanggal)
    : null;
  const [roomSnap, classSnap] = await Promise.all([
    getDoc(targetRoom),
    getDoc(doc(db, "kelas", sesi.kelasId)),
  ]);
  if (
    !roomSnap.exists() ||
    roomSnap.data().asistenUid !== asistenUid ||
    roomSnap.data().status !== "aktif"
  )
    throw new Error("Pilih ruangan aktif yang kamu kelola.");
  if (!classSnap.exists() || classSnap.data().asistenUid !== asistenUid)
    throw new Error("Kamu tidak memiliki akses untuk mengubah sesi ini.");
  const jadwalBerubah =
    sesi.pertemuan !== input.pertemuan ||
    sesi.tanggal !== input.tanggal ||
    sesi.jamMulai !== input.jamMulai ||
    sesi.jamSelesai !== input.jamSelesai ||
    sesi.ruanganId !== input.ruanganId;
  await runTransaction(db, async (tx) => {
    const refs =
      oldReservation && oldReservation.path !== nextReservation.path
        ? [oldReservation, nextReservation]
        : [nextReservation];
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const nextIndex = refs.findIndex(
      (ref) => ref.path === nextReservation.path,
    );
    const nextSnap = snaps[nextIndex];
    if (!nextSnap) throw new Error("Data jadwal ruangan tidak dapat dibaca.");
    if (
      bentrok(
        nextSnap.exists() ? nextSnap.data() : undefined,
        input,
        sesi.reservasiId ?? sesi.id,
      )
    )
      throw new Error("Jadwal bentrok dengan sesi lain di ruangan ini.");
    const sesiSnap = await tx.get(currentRef);
    if (!sesiSnap.exists() || sesiSnap.data().status !== "belum_dibuka")
      throw new Error("Sesi hanya dapat diubah sebelum dibuka.");
    const roomData = roomSnap.data();
    const now = new Date().toISOString();
    tx.update(currentRef, {
      pertemuan: input.pertemuan,
      tanggal: input.tanggal,
      jamMulai: input.jamMulai,
      jamSelesai: input.jamSelesai,
      ruanganId: input.ruanganId,
      lab: roomData.nama,
      updatedAt: now,
    });
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const snapshot = snaps[i];
      if (!ref || !snapshot) continue;
      const map = (
        snapshot.exists() &&
        snapshot.data().reservasi &&
        typeof snapshot.data().reservasi === "object"
          ? snapshot.data().reservasi
          : {}
      ) as Record<string, any>;
      if (oldReservation && ref.path === oldReservation.path) {
        const next = { ...map };
        delete next[sesi.reservasiId ?? sesi.id];
        tx.set(ref, { tanggal: sesi.tanggal, reservasi: next });
      }
      if (ref.path === nextReservation.path)
        tx.set(ref, {
          tanggal: input.tanggal,
          reservasi: {
            ...map,
            [sesi.reservasiId ?? sesi.id]: {
              sesiId: sesi.id,
              kelasId: sesi.kelasId,
              praktikumId: sesi.praktikumId,
              jamMulai: input.jamMulai,
              jamSelesai: input.jamSelesai,
              status: "belum_dibuka",
            },
          },
        });
    }
  });
  if (jadwalBerubah) {
    await kirimPushKePraktikum(
      sesi.kelasId,
      sesi.praktikumId,
      sesi.id,
      "Jadwal praktikum berubah",
      `${sesi.praktikum} · Pertemuan ${input.pertemuan}: ${input.tanggal}, ${input.jamMulai}–${input.jamSelesai} di ${roomSnap.data().nama}.`,
      "jadwal_diubah",
    );
  }
}

export async function ubahStatusArsipSesi(sesi: Sesi, arsip: boolean) {
  uid();
  const ref = sesiRef(sesi);
  const now = new Date().toISOString();
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Sesi tidak ditemukan.");
    if (arsip && snap.data().status !== "belum_dibuka")
      throw new Error("Hanya sesi yang belum dibuka yang dapat diarsipkan.");
    if (!arsip && snap.data().status !== "diarsipkan")
      throw new Error("Sesi ini tidak sedang diarsipkan.");
    let reserveRef: ReturnType<typeof reservationRef> | null = null;
    let reserveExists = false;
    let reserveData: Record<string, any> = {};
    if (sesi.ruanganId) {
      reserveRef = reservationRef(sesi.ruanganId, sesi.tanggal);
      const reserveSnap = await tx.get(reserveRef);
      reserveExists = reserveSnap.exists();
      reserveData = reserveExists ? (reserveSnap.data() ?? {}) : {};
      const map = (reserveData.reservasi ?? {}) as Record<string, any>;
      if (
        !arsip &&
        bentrok({ reservasi: map }, sesi, sesi.reservasiId ?? sesi.id)
      )
        throw new Error(
          "Ruangan sudah dijadwalkan sesi lain pada waktu tersebut.",
        );
    }
    tx.update(ref, {
      status: arsip ? "diarsipkan" : "belum_dibuka",
      updatedAt: now,
    });
    if (reserveRef && reserveExists) {
      const map = (reserveData.reservasi ?? {}) as Record<string, any>;
      const key = sesi.reservasiId ?? sesi.id;
      if (map[key])
        tx.set(reserveRef, {
          ...reserveData,
          reservasi: {
            ...map,
            [key]: {
              ...map[key],
              status: arsip ? "diarsipkan" : "belum_dibuka",
            },
          },
        });
    }
  });
}

export const arsipkanSesiKelas = (sesi: Sesi) =>
  ubahStatusArsipSesi(sesi, true);
export const pulihkanSesiKelas = (sesi: Sesi) =>
  ubahStatusArsipSesi(sesi, false);

export async function hapusSesiKelas(sesi: Sesi) {
  uid();
  if (sesi.status !== "diarsipkan")
    throw new Error("Arsipkan sesi sebelum menghapusnya.");
  const ref = sesiRef(sesi);
  const [attendance, leaves] = await Promise.all([
    getDocs(collection(ref, "presensi")),
    getDocs(collection(ref, "izin")),
  ]);
  if (attendance.size || leaves.size)
    throw new Error(
      "Sesi memiliki presensi atau perizinan. Data riwayat tidak dihapus; sesi tetap diarsipkan.",
    );
  await runTransaction(db, async (tx) => {
    const sessionSnap = await tx.get(ref);
    const reserveRef = sesi.ruanganId
      ? reservationRef(sesi.ruanganId, sesi.tanggal)
      : null;
    const reserveSnap = reserveRef ? await tx.get(reserveRef) : null;
    if (!sessionSnap.exists() || sessionSnap.data().status !== "diarsipkan")
      throw new Error("Sesi berubah. Muat ulang sebelum menghapus.");
    if (reserveRef && reserveSnap?.exists()) {
      const map = (reserveSnap.data().reservasi ?? {}) as Record<string, any>;
      const next = { ...map };
      delete next[sesi.reservasiId ?? sesi.id];
      tx.set(reserveRef, { ...reserveSnap.data(), reservasi: next });
    }
    tx.delete(ref);
  });
}

async function ubahStatusSesi(
  sesi: Sesi,
  from: StatusSesi,
  to: StatusSesi,
  extra: Record<string, unknown> = {},
) {
  uid();
  const ref = sesiRef(sesi);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== from)
      throw new Error("Status sesi berubah. Muat ulang lalu coba lagi.");
    tx.update(ref, {
      ...extra,
      status: to,
      updatedAt: new Date().toISOString(),
    });
  });
}
export async function bukaSesiKelas(sesi: Sesi): Promise<void> {
  await ubahStatusSesi(sesi, "belum_dibuka", "dibuka", {
    dibukaPada: new Date().toISOString(),
  });

  await kirimPushKePraktikum(
    sesi.kelasId,
    sesi.praktikumId,
    sesi.id,
    "Sesi praktikum dibuka",
    `${sesi.praktikum} · Pertemuan ${sesi.pertemuan} sudah dapat dipresensi.`,
    "sesi_dibuka",
  );
}
export const tutupSesiKelas = (sesi: Sesi, catatan?: string) =>
  ubahStatusSesi(sesi, "dibuka", "ditutup", {
    ditutupPada: new Date().toISOString(),
    catatanPenutup: catatan?.trim() ?? "",
  });

export async function ambilSesiAsisten(): Promise<Sesi[]> {
  uid();
  const courses = await ambilSemuaPraktikumAsisten();
  const nested = await Promise.all(
    courses.map(async (course) => {
      const results = await getDocs(
        collection(db, "kelas", course.kelasId, "praktikum", course.id, "sesi"),
      );
      return results.docs
        .map((d) => bacaSesi(d.id, d.data(), course.kelasId, course.id))
        .filter((s): s is Sesi => !!s);
    }),
  );
  return nested
    .flat()
    .sort((a, b) =>
      `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`),
    );
}

export async function ambilSesiPraktikan(): Promise<Sesi[]> {
  const userId = uid();
  const memberships = await getDocs(
    query(
      collectionGroup(db, "anggota"),
      where("uid", "==", userId),
      where("status", "==", "aktif"),
    ),
  );
  const targets = memberships.docs
    .map((d) => {
      const parts = d.ref.path.split("/");
      return parts.length === 6
        ? { kelasId: parts[1], praktikumId: parts[3], legacy: false }
        : parts.length === 4
          ? {
              kelasId: parts[1],
              praktikumId: `legacy-${parts[1]}`,
              legacy: true,
            }
          : null;
    })
    .filter(
      (v): v is { kelasId: string; praktikumId: string; legacy: boolean } =>
        !!v,
    );
  const result = await Promise.all(
    targets.map(async (target) => {
      if (target.legacy) return [];
      const path = collection(
        db,
        "kelas",
        target.kelasId,
        "praktikum",
        target.praktikumId,
        "sesi",
      );
      const docs = await getDocs(path);
      return docs.docs
        .map((d) =>
          bacaSesi(
            d.id,
            d.data(),
            target.kelasId,
            target.praktikumId,
            target.legacy,
          ),
        )
        .filter((s): s is Sesi => !!s);
    }),
  );
  const unique = new Map<string, Sesi>();
  result
    .flat()
    .forEach((s) => unique.set(`${s.kelasId}/${s.praktikumId}/${s.id}`, s));
  return [...unique.values()]
    .filter((s) => s.status !== "diarsipkan")
    .sort((a, b) =>
      `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`),
    );
}

function hitungJarakMeter(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const radiusBumiMeter = 6_371_000;
  const radian = (derajat: number) => (derajat * Math.PI) / 180;

  const selisihLatitude = radian(latitude2 - latitude1);
  const selisihLongitude = radian(longitude2 - longitude1);

  const nilaiHaversine =
    Math.sin(selisihLatitude / 2) ** 2 +
    Math.cos(radian(latitude1)) *
      Math.cos(radian(latitude2)) *
      Math.sin(selisihLongitude / 2) ** 2;

  return (
    2 * radiusBumiMeter * Math.asin(Math.min(1, Math.sqrt(nilaiHaversine)))
  );
}

export async function catatPresensi(
  sesi: Sesi,
  posisi: PosisiPresensi,
  tokenQr?: string,
): Promise<Presensi> {
  const userId = uid();

  if (!sesi.ruanganId) {
    throw new Error(
      "Lokasi laboratorium belum terhubung ke sesi ini. Hubungi asisten.",
    );
  }

  const laboratoriumSnap = await getDoc(
    doc(db, "laboratorium", sesi.ruanganId),
  );

  if (!laboratoriumSnap.exists()) {
    throw new Error("Data laboratorium untuk sesi ini tidak ditemukan.");
  }

  const laboratorium = laboratoriumSnap.data();

  if (laboratorium.status !== "aktif") {
    throw new Error("Laboratorium untuk sesi ini sedang tidak aktif.");
  }

  if (
    typeof laboratorium.latitude !== "number" ||
    typeof laboratorium.longitude !== "number" ||
    typeof laboratorium.radiusPresensiMeter !== "number"
  ) {
    throw new Error(
      "Lokasi laboratorium belum diatur. Hubungi asisten praktikum.",
    );
  }

  if (
    !Number.isFinite(posisi.latitude) ||
    !Number.isFinite(posisi.longitude) ||
    !Number.isFinite(posisi.akurasiMeter)
  ) {
    throw new Error("Lokasi perangkat tidak valid. Coba ambil lokasi lagi.");
  }

  const jarakPresisi = hitungJarakMeter(
    posisi.latitude,
    posisi.longitude,
    laboratorium.latitude,
    laboratorium.longitude,
  );

  if (jarakPresisi > laboratorium.radiusPresensiMeter) {
    throw new Error(
      `Kamu berada sekitar ${Math.round(jarakPresisi)} meter dari laboratorium. Presensi hanya dapat dilakukan dalam radius ${laboratorium.radiusPresensiMeter} meter.`,
    );
  }

  const membership = anggotaRef(sesi, userId);
  const session = sesiRef(sesi);
  const attendance = doc(
    db,
    "kelas",
    sesi.kelasId,
    "praktikum",
    sesi.praktikumId,
    "sesi",
    sesi.id,
    "presensi",
    userId,
  );
  const leave = doc(
    db,
    "kelas",
    sesi.kelasId,
    "praktikum",
    sesi.praktikumId,
    "sesi",
    sesi.id,
    "izin",
    userId,
  );

  const waktuHadir = new Date().toISOString();
  const jarakMeter = Math.round(jarakPresisi);

  await runTransaction(db, async (tx) => {
    const [memberSnap, sessionSnap, attendanceSnap, leaveSnap] =
      await Promise.all([
        tx.get(membership),
        tx.get(session),
        tx.get(attendance),
        tx.get(leave),
      ]);

    if (!memberSnap.exists() || memberSnap.data().status !== "aktif") {
      throw new Error("Keanggotaan praktikum tidak aktif.");
    }

    if (!sessionSnap.exists() || sessionSnap.data().status !== "dibuka") {
      throw new Error("Presensi hanya dapat dilakukan saat sesi dibuka.");
    }

    if (leaveSnap.exists()) {
      throw new Error(
        "Kamu sudah mengajukan izin untuk sesi ini, jadi tidak dapat presensi.",
      );
    }

    if (attendanceSnap.exists()) {
      throw new Error("Kamu sudah presensi pada sesi ini.");
    }

    tx.set(attendance, {
      sesiId: sesi.id,
      praktikanId: userId,
      waktuHadir,
      latitude: posisi.latitude,
      longitude: posisi.longitude,
      jarakMeter,
      akurasiMeter: posisi.akurasiMeter,
      ...(tokenQr ? { tokenQr } : {}),
    });
  });

  return {
    id: userId,
    sesiId: sesi.id,
    praktikanId: userId,
    waktuHadir,
    latitude: posisi.latitude,
    longitude: posisi.longitude,
    jarakMeter,
    akurasiMeter: posisi.akurasiMeter,
  };
}

async function ambilPresensi(
  daftarSesi: Sesi[],
  mineOnly = false,
): Promise<Presensi[]> {
  const mine = mineOnly ? uid() : undefined;
  const results = await Promise.all(
    daftarSesi.map(async (sesi) => {
      const ref = collection(
        db,
        "kelas",
        sesi.kelasId,
        "praktikum",
        sesi.praktikumId,
        "sesi",
        sesi.id,
        "presensi",
      );
      let docs = mine
        ? [await getDoc(doc(ref, mine))].filter((d) => d.exists())
        : (await getDocs(ref)).docs;
      if (sesi.legacy) {
        const oldRef = collection(
          db,
          "kelas",
          sesi.kelasId,
          "sesi",
          sesi.id,
          "presensi",
        );
        const oldDocs = mine
          ? [await getDoc(doc(oldRef, mine))].filter((d) => d.exists())
          : (await getDocs(oldRef)).docs;
        const seen = new Set(docs.map((d) => d.id));
        docs = [...docs, ...oldDocs.filter((d) => !seen.has(d.id))];
      }
      return docs
        .map((d) => {
          const data = d.data();

          if (
            data.sesiId !== sesi.id ||
            typeof data.praktikanId !== "string" ||
            typeof data.waktuHadir !== "string"
          ) {
            return null;
          }

          return {
            id: `${sesi.id}-${d.id}`,
            sesiId: sesi.id,
            praktikanId: data.praktikanId,
            waktuHadir: data.waktuHadir,
            ...(typeof data.latitude === "number"
              ? { latitude: data.latitude }
              : {}),
            ...(typeof data.longitude === "number"
              ? { longitude: data.longitude }
              : {}),
            ...(typeof data.jarakMeter === "number"
              ? { jarakMeter: data.jarakMeter }
              : {}),
            ...(typeof data.akurasiMeter === "number"
              ? { akurasiMeter: data.akurasiMeter }
              : {}),
          };
        })
        .filter((item): item is Presensi => item !== null);
    }),
  );
  return results.flat();
}
export const ambilPresensiPraktikan = (sessions: Sesi[]) =>
  ambilPresensi(sessions, true);
export const ambilPresensiAsisten = (sessions: Sesi[]) => {
  uid();
  return ambilPresensi(sessions);
};
