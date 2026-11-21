import { getAuth } from "@react-native-firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import type { Laboratorium, StatusLaboratorium } from "@/types/siprak";

const db = getFirestore();

function uidAsisten(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Silakan masuk terlebih dahulu.");
  return uid;
}

export async function ambilLaboratorium(): Promise<Laboratorium[]> {
  const uid = uidAsisten();
  const hasil = await getDocs(query(collection(db, "laboratorium"), where("asistenUid", "==", uid)));
  return hasil.docs
    .map((snapshot) => {
      const data = snapshot.data();
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
        id: snapshot.id,
        nama: data.nama,
        asistenUid: data.asistenUid,
        status: data.status as StatusLaboratorium,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies Laboratorium;
    })
    .filter((lab): lab is Laboratorium => lab !== null)
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function buatLaboratorium(namaInput: string): Promise<Laboratorium> {
  const nama = namaInput.trim();
  if (!nama) throw new Error("Nama ruangan/laboratorium wajib diisi.");
  const asistenUid = uidAsisten();
  const waktu = new Date().toISOString();
  const data = {
    nama,
    asistenUid,
    status: "aktif" as const,
    createdAt: waktu,
    updatedAt: waktu,
  };
  const ref = await addDoc(collection(db, "laboratorium"), data);
  return { id: ref.id, ...data };
}

export async function ubahLaboratorium(
  laboratoriumId: string,
  namaInput: string,
): Promise<void> {
  const nama = namaInput.trim();
  if (!nama) throw new Error("Nama ruangan/laboratorium wajib diisi.");
  uidAsisten();
  await updateDoc(doc(db, "laboratorium", laboratoriumId), {
    nama,
    updatedAt: new Date().toISOString(),
  });
}

export async function ubahStatusLaboratorium(
  laboratoriumId: string,
  status: StatusLaboratorium,
): Promise<void> {
  uidAsisten();
  await updateDoc(doc(db, "laboratorium", laboratoriumId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function hapusLaboratorium(laboratoriumId: string): Promise<void> {
  uidAsisten();
  const jadwal = await getDocs(
    collection(db, "laboratorium", laboratoriumId, "jadwal"),
  );
  const dipakai = jadwal.docs.some((snapshot) => {
    const reservasi = snapshot.data().reservasi;
    return (
      reservasi !== null &&
      typeof reservasi === "object" &&
      Object.values(reservasi).some(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          "status" in item &&
          item.status !== "diarsipkan",
      )
    );
  });

  if (dipakai) {
    throw new Error(
      "Ruangan masih dipakai oleh sesi aktif. Arsipkan ruangan agar tidak dipilih untuk jadwal baru.",
    );
  }
  await Promise.all(jadwal.docs.map((snapshot) => deleteDoc(snapshot.ref)));
  await deleteDoc(doc(db, "laboratorium", laboratoriumId));
}
