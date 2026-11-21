import { getAuth } from "@react-native-firebase/auth";
import {
  collectionGroup,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import type { AnggotaKelas, Praktikum, Pengguna } from "@/types/siprak";

const db = getFirestore();

function uidAsisten(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Silakan masuk terlebih dahulu.");
  return uid;
}

export function praktikumRef(kelasId: string, praktikumId: string) {
  return doc(db, "kelas", kelasId, "praktikum", praktikumId);
}

export function anggotaPraktikumRef(
  kelasId: string,
  praktikumId: string,
  uid: string,
) {
  return doc(
    db,
    "kelas",
    kelasId,
    "praktikum",
    praktikumId,
    "anggota",
    uid,
  );
}

export async function ambilPraktikumKelas(
  kelasId: string,
): Promise<Praktikum[]> {
  uidAsisten();
  const hasil = await getDocs(collection(db, "kelas", kelasId, "praktikum"));

  return hasil.docs
    .flatMap((snapshot): Praktikum[] => {
      const data = snapshot.data();
      if (
        data.kelasId !== kelasId ||
        typeof data.nama !== "string" ||
        typeof data.asistenUid !== "string" ||
        typeof data.createdAt !== "string" ||
        typeof data.updatedAt !== "string" ||
        (data.status !== "aktif" && data.status !== "diarsipkan")
      ) {
        return [];
      }

      return [{
        id: snapshot.id,
        kelasId,
        nama: data.nama,
        asistenUid: data.asistenUid,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        ...(data.legacyMigrasiSelesai === true
          ? { legacyMigrasiSelesai: true }
          : {}),
      } satisfies Praktikum];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function ambilSemuaPraktikumAsisten(): Promise<Praktikum[]> {
  const uid = uidAsisten();
  const kelas = await getDocs(
    query(collection(db, "kelas"), where("asistenUid", "==", uid)),
  );
  const semua = await Promise.all(kelas.docs.map(async (kelasDoc) => {
    const courses = await ambilPraktikumKelas(kelasDoc.id);
    const oldName = kelasDoc.data().praktikum;
    const legacyId = `legacy-${kelasDoc.id}`;
    let legacy = courses.find(c => c.id === legacyId);
    if (typeof oldName === "string" && oldName.trim() && !legacy) {
      const now = new Date().toISOString();
      legacy = { id: legacyId, kelasId: kelasDoc.id, nama: oldName, asistenUid: uid, status: kelasDoc.data().status === "diarsipkan" ? "diarsipkan" : "aktif", createdAt: now, updatedAt: now, legacyMigrasiSelesai: false };
      await setDoc(praktikumRef(kelasDoc.id, legacyId), legacy);
      courses.push(legacy);
    }
    if (legacy && legacy.legacyMigrasiSelesai !== true) {
      const now = new Date().toISOString();
      const oldMembers = await getDocs(collection(db, "kelas", kelasDoc.id, "anggota"));
      const oldSessions = await getDocs(collection(db, "kelas", kelasDoc.id, "sesi"));
      const currentRooms = await getDocs(query(collection(db, "laboratorium"), where("asistenUid", "==", uid)));
      const roomByName = new Map(currentRooms.docs.flatMap(room => typeof room.data().nama === "string" ? [[room.data().nama.trim().toLocaleLowerCase(), room.id] as const] : []));
      await Promise.all(oldMembers.docs.map(async member => {
        const destination = anggotaPraktikumRef(kelasDoc.id, legacyId, member.id);
        if (!(await getDoc(destination)).exists()) await setDoc(destination, { ...member.data(), praktikumId: legacyId });
      }));
      await Promise.all(oldSessions.docs.map(async session => {
        const source = session.data();
        const roomName = typeof source.lab === "string" ? source.lab.trim() : "";
        let ruanganId: string | undefined;
        if (roomName) {
          ruanganId = roomByName.get(roomName.toLocaleLowerCase());
          if (!ruanganId) {
            ruanganId = `legacy-${uid.slice(0, 10)}-${roomName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "ruangan"}`;
            const roomRef = doc(db, "laboratorium", ruanganId);
            if (!(await getDoc(roomRef)).exists()) {
              const timestamp = new Date().toISOString();
              await setDoc(roomRef, { nama: roomName, asistenUid: uid, status: "aktif", createdAt: timestamp, updatedAt: timestamp });
            }
            roomByName.set(roomName.toLocaleLowerCase(), ruanganId);
          }
        }
        if (ruanganId && typeof source.tanggal === "string") {
          const scheduleRef = doc(db, "laboratorium", ruanganId, "jadwal", source.tanggal);
          await runTransaction(db, async transaction => {
            const schedule = await transaction.get(scheduleRef);
            const reservasi = (schedule.exists() && schedule.data().reservasi && typeof schedule.data().reservasi === "object" ? schedule.data().reservasi : {}) as Record<string, unknown>;
            transaction.set(scheduleRef, {
              tanggal: source.tanggal,
              reservasi: { ...reservasi, [session.id]: { sesiId: session.id, kelasId: kelasDoc.id, praktikumId: legacyId, jamMulai: source.jamMulai, jamSelesai: source.jamSelesai, status: source.status } },
            });
          });
        }
        const nestedSession = doc(db, "kelas", kelasDoc.id, "praktikum", legacyId, "sesi", session.id);
        const existingNested = await getDoc(nestedSession);
        if (!existingNested.exists()) await setDoc(nestedSession, {
          ...source,
          ...(ruanganId ? { ruanganId, reservasiId: session.id } : {}),
          kelasId: kelasDoc.id, praktikumId: legacyId, legacySumber: true,
        });
        else if (ruanganId && (typeof existingNested.data().ruanganId !== "string" || typeof existingNested.data().reservasiId !== "string")) {
          await updateDoc(nestedSession, { ruanganId, reservasiId: session.id, updatedAt: new Date().toISOString() });
        }
        for (const subcollectionName of ["presensi", "izin"] as const) {
          const children = await getDocs(collection(db, "kelas", kelasDoc.id, "sesi", session.id, subcollectionName));
          await Promise.all(children.docs.map(async child => {
            const destination = doc(db, "kelas", kelasDoc.id, "praktikum", legacyId, "sesi", session.id, subcollectionName, child.id);
            if (!(await getDoc(destination)).exists()) await setDoc(destination, child.data());
          }));
        }
      }));
      await updateDoc(praktikumRef(kelasDoc.id, legacyId), { legacyMigrasiSelesai: true, updatedAt: now });
      legacy.legacyMigrasiSelesai = true;
    }
    return courses;
  }));
  return semua.flat();
}

/** Membaca seluruh keanggotaan praktikum aktif untuk daftar peserta asisten. */
export async function ambilSemuaAnggotaAktifPraktikum(): Promise<AnggotaKelas[]> {
  uidAsisten();
  const hasil = await getDocs(query(collectionGroup(db, "anggota"), where("status", "==", "aktif")));
  return hasil.docs.flatMap(snapshot => {
    const parts = snapshot.ref.path.split("/");
    if (parts.length !== 6 || parts[0] !== "kelas" || parts[2] !== "praktikum") return [];
    const data = snapshot.data();
    if (typeof data.uid !== "string" || typeof data.nama !== "string" || typeof data.nim !== "string" || typeof data.joinedAt !== "string") return [];
    return [{ uid: data.uid, praktikumId: parts[3], nama: data.nama, nim: data.nim, status: "aktif" as const, joinedAt: data.joinedAt }];
  });
}

export async function buatPraktikum(
  kelasId: string,
  namaInput: string,
): Promise<Praktikum> {
  const nama = namaInput.trim();
  if (!nama) throw new Error("Nama praktikum wajib diisi.");
  const asistenUid = uidAsisten();
  const kelasSnapshot = await getDoc(doc(db, "kelas", kelasId));

  if (!kelasSnapshot.exists()) throw new Error("Kelas tidak ditemukan.");
  if (kelasSnapshot.data().asistenUid !== asistenUid) {
    throw new Error("Kamu bukan asisten pemilik kelas ini.");
  }
  if (kelasSnapshot.data().status !== "aktif") {
    throw new Error("Praktikum hanya dapat ditambahkan ke kelas aktif.");
  }

  const waktu = new Date().toISOString();
  const data = {
    kelasId,
    nama,
    asistenUid,
    status: "aktif" as const,
    createdAt: waktu,
    updatedAt: waktu,
  };
  const ref = await addDoc(collection(db, "kelas", kelasId, "praktikum"), data);
  return { id: ref.id, ...data };
}

export async function ubahPraktikum(
  kelasId: string,
  praktikumId: string,
  namaInput: string,
): Promise<void> {
  const nama = namaInput.trim();
  if (!nama) throw new Error("Nama praktikum wajib diisi.");
  uidAsisten();
  await updateDoc(praktikumRef(kelasId, praktikumId), {
    nama,
    updatedAt: new Date().toISOString(),
  });
}

export async function ubahStatusPraktikum(
  kelasId: string,
  praktikumId: string,
  status: "aktif" | "diarsipkan",
): Promise<void> {
  uidAsisten();
  await updateDoc(praktikumRef(kelasId, praktikumId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function hapusPraktikum(
  kelasId: string,
  praktikumId: string,
): Promise<void> {
  uidAsisten();
  const [anggota, sesi] = await Promise.all([
    getDocs(collection(db, "kelas", kelasId, "praktikum", praktikumId, "anggota")),
    getDocs(collection(db, "kelas", kelasId, "praktikum", praktikumId, "sesi")),
  ]);
  if (anggota.size > 0 || sesi.size > 0) {
    throw new Error(
      "Praktikum masih memiliki peserta atau sesi. Arsipkan agar riwayatnya tetap aman.",
    );
  }
  await deleteDoc(praktikumRef(kelasId, praktikumId));
}

export async function ambilAnggotaPraktikum(
  kelasId: string,
  praktikumId: string,
): Promise<AnggotaKelas[]> {
  uidAsisten();
  const hasil = await getDocs(
    collection(db, "kelas", kelasId, "praktikum", praktikumId, "anggota"),
  );
  return hasil.docs.flatMap((snapshot) => {
      const data = snapshot.data();
      if (
        typeof data.uid !== "string" ||
        typeof data.nama !== "string" ||
        typeof data.nim !== "string" ||
        typeof data.joinedAt !== "string" ||
        (data.status !== "aktif" && data.status !== "nonaktif")
      ) {
        return [];
      }
      return [{
        uid: data.uid,
        praktikumId,
        nama: data.nama,
        nim: data.nim,
        status: data.status,
        joinedAt: data.joinedAt,
      }];
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function tambahAnggotaPraktikum(
  kelasId: string,
  praktikumId: string,
  nimInput: string,
): Promise<void> {
  const asistenUid = uidAsisten();
  const nim = nimInput.trim();
  if (!nim) throw new Error("NIM wajib diisi.");

  const kelasRef = doc(db, "kelas", kelasId);
  const courseRef = praktikumRef(kelasId, praktikumId);
  const [kelasSnapshot, praktikumSnapshot, indeksNim] = await Promise.all([
    getDoc(kelasRef),
    getDoc(courseRef),
    getDoc(doc(db, "nim_index", nim)),
  ]);

  if (!kelasSnapshot.exists() || !praktikumSnapshot.exists()) {
    throw new Error("Kelas atau praktikum tidak ditemukan.");
  }
  if (
    kelasSnapshot.data().asistenUid !== asistenUid ||
    praktikumSnapshot.data().asistenUid !== asistenUid
  ) {
    throw new Error("Kamu tidak memiliki akses untuk mengelola praktikum ini.");
  }
  if (kelasSnapshot.data().status !== "aktif" || praktikumSnapshot.data().status !== "aktif") {
    throw new Error("Peserta hanya dapat ditambahkan ke kelas dan praktikum aktif.");
  }
  if (!indeksNim.exists() || typeof indeksNim.data().uid !== "string") {
    throw new Error("NIM tersebut belum memiliki akun SIPRAK.");
  }

  const praktikanUid = indeksNim.data().uid as string;
  if (praktikanUid === asistenUid) {
    throw new Error("Akun asisten tidak dapat ditambahkan sebagai praktikan.");
  }

  const profilSnapshot = await getDoc(doc(db, "users", praktikanUid));
  if (!profilSnapshot.exists()) throw new Error("Profil praktikan tidak ditemukan.");
  const profil = profilSnapshot.data();
  if (
    profil.peran !== "praktikan" ||
    typeof profil.nama !== "string" ||
    typeof profil.nim !== "string"
  ) {
    throw new Error("Akun tersebut bukan praktikan yang valid.");
  }

  const anggotaRef = anggotaPraktikumRef(kelasId, praktikumId, praktikanUid);
  const anggotaLama = await getDoc(anggotaRef);
  if (anggotaLama.exists()) {
    if (anggotaLama.data().status === "aktif") {
      throw new Error("Praktikan ini sudah aktif di praktikum.");
    }
    await updateDoc(anggotaRef, { status: "aktif" });
    return;
  }

  await setDoc(anggotaRef, {
    uid: praktikanUid,
    praktikumId,
    nama: profil.nama,
    nim: profil.nim,
    status: "aktif",
    joinedAt: new Date().toISOString(),
  });
}

export async function ubahStatusAnggotaPraktikum(
  kelasId: string,
  praktikumId: string,
  anggotaUid: string,
  status: "aktif" | "nonaktif",
): Promise<void> {
  uidAsisten();
  await updateDoc(anggotaPraktikumRef(kelasId, praktikumId, anggotaUid), {
    status,
  });
}

export async function hapusAnggotaPraktikum(
  kelasId: string,
  praktikumId: string,
  anggotaUid: string,
): Promise<void> {
  uidAsisten();
  await deleteDoc(anggotaPraktikumRef(kelasId, praktikumId, anggotaUid));
}

export async function ambilPraktikanPraktikum(
  kelasId: string,
  praktikumId: string,
  namaKelas: string,
  namaPraktikum: string,
): Promise<Pengguna[]> {
  const anggota = await ambilAnggotaPraktikum(kelasId, praktikumId);
  return anggota
    .filter((item) => item.status === "aktif")
    .map((item) => ({
      id: item.uid,
      nama: item.nama,
      nim: item.nim,
      peran: "praktikan" as const,
      kelas: namaKelas,
      kelasId,
      praktikumId,
      namaPraktikum,
    }));
}
