import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import type { KelasPraktikum } from "@/types/siprak";

const db = getFirestore();

function ambilUidAsisten(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Silakan masuk terlebih dahulu.");
  return uid;
}

function bacaKelas(id: string, data: Record<string, unknown>): KelasPraktikum | null {
  if (
    typeof data.nama !== "string" ||
    typeof data.asistenUid !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.updatedAt !== "string" ||
    (data.status !== "aktif" && data.status !== "diarsipkan")
  ) {
    return null;
  }

  return {
    id,
    nama: data.nama,
    asistenUid: data.asistenUid,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    ...(typeof data.praktikum === "string" ? { praktikum: data.praktikum } : {}),
  };
}

export async function buatKelas(input: { nama: string }): Promise<KelasPraktikum> {
  const nama = input.nama.trim();
  if (!nama) throw new Error("Nama kelas wajib diisi.");

  const asistenUid = ambilUidAsisten();
  const waktu = new Date().toISOString();
  const data = {
    nama,
    asistenUid,
    status: "aktif" as const,
    createdAt: waktu,
    updatedAt: waktu,
  };
  const ref = await addDoc(collection(db, "kelas"), data);
  return { id: ref.id, ...data };
}

export async function ambilKelasAsisten(): Promise<KelasPraktikum[]> {
  const uid = ambilUidAsisten();
  const hasil = await getDocs(
    query(collection(db, "kelas"), where("asistenUid", "==", uid)),
  );

  return hasil.docs
    .map((snapshot) => bacaKelas(snapshot.id, snapshot.data()))
    .filter((kelas): kelas is KelasPraktikum => kelas !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function ubahKelas(
  kelasId: string,
  input: { nama: string },
): Promise<void> {
  const nama = input.nama.trim();
  if (!nama) throw new Error("Nama kelas wajib diisi.");
  const uid = ambilUidAsisten();

  await updateDoc(doc(db, "kelas", kelasId), {
    nama,
    asistenUid: uid,
    updatedAt: new Date().toISOString(),
  });
}

export async function ubahStatusKelas(
  kelasId: string,
  status: "aktif" | "diarsipkan",
): Promise<void> {
  ambilUidAsisten();
  await updateDoc(doc(db, "kelas", kelasId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function arsipkanKelas(kelasId: string): Promise<void> {
  return ubahStatusKelas(kelasId, "diarsipkan");
}

export async function aktifkanKelas(kelasId: string): Promise<void> {
  return ubahStatusKelas(kelasId, "aktif");
}

export async function hapusKelas(kelasId: string): Promise<void> {
  ambilUidAsisten();
  const kelasRef = doc(db, "kelas", kelasId);
  const [kelasSnapshot, praktikumBaru, sesiLama, anggotaLama] =
    await Promise.all([
      getDoc(kelasRef),
      getDocs(collection(db, "kelas", kelasId, "praktikum")),
      getDocs(collection(db, "kelas", kelasId, "sesi")),
      getDocs(collection(db, "kelas", kelasId, "anggota")),
    ]);

  if (!kelasSnapshot.exists()) throw new Error("Kelas tidak ditemukan.");
  if (
    praktikumBaru.size > 0 ||
    sesiLama.size > 0 ||
    anggotaLama.size > 0 ||
    (typeof kelasSnapshot.data().praktikum === "string" &&
      kelasSnapshot.data().praktikum.trim().length > 0)
  ) {
    throw new Error(
      "Kelas masih memiliki praktikum atau riwayat. Arsipkan kelas agar datanya tetap aman.",
    );
  }

  await deleteDoc(kelasRef);
}
