import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "@react-native-firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from "@react-native-firebase/firestore";

import type { Peran } from "@/types/siprak";

const auth = getAuth();
const db = getFirestore();

export type ProfilAkun = {
  uid: string;
  nama: string;
  nim: string;
  email: string;
  peran: Peran;
};

export async function daftarAkun(input: {
  nama: string;
  nim: string;
  email: string;
  password: string;
}): Promise<ProfilAkun> {
  const nama = input.nama.trim();
  const nim = input.nim.trim();
  const email = input.email.trim().toLowerCase();

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    input.password,
  );

  const profil: ProfilAkun = {
    uid: credential.user.uid,
    nama,
    nim,
    email,
    peran: "praktikan",
  };

  const referensiNim = doc(db, "nim_index", nim);
  const referensiProfil = doc(db, "users", credential.user.uid);

  try {
    await runTransaction(db, async (transaksi) => {
      const nimTerdaftar = await transaksi.get(referensiNim);

      if (nimTerdaftar.exists()) {
        throw new Error("NIM_SUDAH_TERDAFTAR");
      }

      transaksi.set(referensiNim, {
        uid: credential.user.uid,
      });

      transaksi.set(referensiProfil, {
        ...profil,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    // Hapus akun Auth yang baru dibuat jika penyimpanan profil gagal.
    await deleteUser(credential.user);
    const kodeError =
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (
      (error instanceof Error && error.message === "NIM_SUDAH_TERDAFTAR") ||
      kodeError.endsWith("permission-denied")
    ) {
      throw new Error(
        "NIM sudah terdaftar atau aturan pendaftaran belum aktif. Periksa kembali lalu coba lagi.",
      );
    }

    if (error instanceof Error && error.message === "NIM_SUDAH_TERDAFTAR") {
      throw new Error("NIM ini sudah terdaftar. Periksa kembali NIM kamu.");
    }

    throw error;
  }

  return profil;
}

export async function masukAkun(
  emailInput: string,
  password: string,
): Promise<ProfilAkun> {
  const email = emailInput.trim().toLowerCase();

  const credential = await signInWithEmailAndPassword(auth, email, password);

  return ambilProfil(credential.user.uid);
}

export async function ambilProfil(uid: string): Promise<ProfilAkun> {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    throw new Error("Profil akun tidak ditemukan di Firestore.");
  }

  const data = snapshot.data();

  if (
    typeof data.nama !== "string" ||
    typeof data.nim !== "string" ||
    typeof data.email !== "string" ||
    (data.peran !== "praktikan" && data.peran !== "asisten")
  ) {
    throw new Error("Data profil akun tidak lengkap atau tidak valid.");
  }

  return {
    uid,
    nama: data.nama,
    nim: data.nim,
    email: data.email,
    peran: data.peran,
  };
}

export async function keluarAkun(): Promise<void> {
  await signOut(auth);
}
