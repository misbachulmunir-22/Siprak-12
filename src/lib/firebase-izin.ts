import { getAuth } from "@react-native-firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  runTransaction,
  updateDoc,
} from "@react-native-firebase/firestore";

import type {
  KodeErrorKlasifikasi,
  KategoriIzinAI,
  PengajuanIzin,
  Pengguna,
  Sesi,
} from "@/types/siprak";

const db = getFirestore();
const GROQ_MODEL = "openai/gpt-oss-20b";

const KATEGORI_IZIN: readonly KategoriIzinAI[] = ["Sakit", "Izin", "Alpha"];

class ErrorGroq extends Error {
  constructor(public readonly kode: KodeErrorKlasifikasi) {
    super(kode);
    this.name = "ErrorGroq";
  }
}

export function pesanErrorKlasifikasi(kode?: KodeErrorKlasifikasi): string {
  switch (kode) {
    case "api_key_tidak_ada":
    case "api_key_tidak_valid":
      return "Layanan klasifikasi belum dapat digunakan. Hubungi pengelola aplikasi.";
    case "batas_permintaan":
      return "Layanan AI sedang sibuk. Asisten dapat mencoba lagi beberapa saat.";
    case "jaringan":
      return "Koneksi ke layanan AI gagal. Periksa jaringan lalu coba lagi.";
    case "layanan_groq":
      return "Layanan AI sedang mengalami gangguan. Coba lagi beberapa saat.";
    case "respons_tidak_valid":
      return "Hasil AI tidak dapat dibaca. Asisten dapat mencoba klasifikasi ulang.";
    case "penyimpanan":
      return "Hasil AI belum tersimpan ke Firebase. Data sebelumnya tetap dipertahankan.";
    default:
      return "Klasifikasi belum berhasil. Asisten dapat mencoba lagi.";
  }
}

function kodeErrorGroq(error: unknown): KodeErrorKlasifikasi {
  if (error instanceof ErrorGroq) return error.kode;
  if (error instanceof TypeError) return "jaringan";
  return "respons_tidak_valid";
}

function isKategoriIzinAI(value: unknown): value is KategoriIzinAI {
  return value === "Sakit" || value === "Izin" || value === "Alpha";
}

function ubahDokumenKePengajuan(
  id: string,
  data: Record<string, unknown>,
): PengajuanIzin | null {
  if (
    typeof data.kelasId !== "string" ||
    typeof data.sesiId !== "string" ||
    typeof data.praktikanId !== "string" ||
    typeof data.namaPraktikan !== "string" ||
    typeof data.nim !== "string" ||
    typeof data.alasan !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.updatedAt !== "string" ||
    (data.status !== "menunggu" &&
      data.status !== "diterima" &&
      data.status !== "ditolak") ||
    (data.klasifikasiStatus !== "menunggu" &&
      data.klasifikasiStatus !== "berhasil" &&
      data.klasifikasiStatus !== "gagal")
  ) {
    return null;
  }

  return {
    id,
    kelasId: data.kelasId,
    sesiId: data.sesiId,
    praktikanId: data.praktikanId,
    namaPraktikan: data.namaPraktikan,
    nim: data.nim,
    alasan: data.alasan,
    status: data.status,
    klasifikasiStatus: data.klasifikasiStatus,
    ...(isKategoriIzinAI(data.kategoriAI)
      ? { kategoriAI: data.kategoriAI }
      : {}),
    ...(typeof data.klasifikasiError === "string" &&
    [
      "api_key_tidak_ada",
      "api_key_tidak_valid",
      "batas_permintaan",
      "jaringan",
      "layanan_groq",
      "respons_tidak_valid",
      "penyimpanan",
    ].includes(data.klasifikasiError)
      ? { klasifikasiError: data.klasifikasiError as KodeErrorKlasifikasi }
      : {}),
    ...(typeof data.catatanAsisten === "string"
      ? { catatanAsisten: data.catatanAsisten }
      : {}),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function klasifikasikanAlasanIzin(
  alasan: string,
): Promise<KategoriIzinAI> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    throw new ErrorGroq("api_key_tidak_ada");
  }

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Klasifikasikan alasan ketidakhadiran praktikan ke tepat satu kategori: Sakit, Izin, atau Alpha. " +
              "Gunakan Sakit hanya bila alasan menyebutkan kondisi sakit atau kesehatan. " +
              "Gunakan Izin hanya untuk kegiatan lomba, acara keluarga kandung, atau kegiatan organisasi. " +
              "Gunakan Alpha bila alasan tidak memenuhi kategori Sakit atau Izin, tidak jelas, atau tidak cukup informasinya. " +
              "Jangan menerima atau menolak pengajuan. Klasifikasi hanya saran untuk membantu asisten.",
          },
          {
            role: "user",
            content: `Alasan praktikan: ${alasan}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "klasifikasi_izin",
            strict: true,
            schema: {
              type: "object",
              properties: {
                kategoriAI: {
                  type: "string",
                  enum: [...KATEGORI_IZIN],
                },
              },
              required: ["kategoriAI"],
              additionalProperties: false,
            },
          },
        },
        max_completion_tokens: 200,
      }),
    });
  } catch {
    throw new ErrorGroq("jaringan");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ErrorGroq("api_key_tidak_valid");
    }
    if (response.status === 429) {
      throw new ErrorGroq("batas_permintaan");
    }
    if (response.status >= 500) {
      throw new ErrorGroq("layanan_groq");
    }
    throw new ErrorGroq("respons_tidak_valid");
  }

  let hasil: {
    choices?: {
      message?: {
        content?: string | null;
      };
    }[];
  };
  try {
    hasil = (await response.json()) as typeof hasil;
  } catch {
    throw new ErrorGroq("respons_tidak_valid");
  }

  const isi = hasil.choices?.[0]?.message?.content;

  if (!isi) {
    throw new ErrorGroq("respons_tidak_valid");
  }

  let hasilJSON: { kategoriAI?: unknown };

  try {
    hasilJSON = JSON.parse(isi) as { kategoriAI?: unknown };
  } catch {
    throw new ErrorGroq("respons_tidak_valid");
  }

  if (!isKategoriIzinAI(hasilJSON.kategoriAI)) {
    throw new ErrorGroq("respons_tidak_valid");
  }

  return hasilJSON.kategoriAI;
}

function buatReferensiIzin(sesi: Sesi, praktikanUid: string) {
  return doc(db, "kelas", sesi.kelasId, "praktikum", sesi.praktikumId, "sesi", sesi.id, "izin", praktikanUid);
}

function buatReferensiSesi(sesi: Sesi) {
  return doc(db, "kelas", sesi.kelasId, "praktikum", sesi.praktikumId, "sesi", sesi.id);
}

function buatReferensiAnggota(sesi: Sesi, praktikanUid: string) {
  return doc(db, "kelas", sesi.kelasId, "praktikum", sesi.praktikumId, "anggota", praktikanUid);
}

export async function ajukanIzin(
  sesi: Sesi,
  praktikan: Pengguna,
  alasanInput: string,
): Promise<PengajuanIzin> {
  const uid = getAuth().currentUser?.uid;

  if (!uid) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  if (praktikan.peran !== "praktikan" || praktikan.id !== uid) {
    throw new Error(
      "Pengajuan izin hanya dapat dibuat oleh praktikan sendiri.",
    );
  }

  const alasan = alasanInput.trim();

  if (alasan.length < 10) {
    throw new Error("Alasan izin minimal 10 karakter.");
  }

  const anggotaRef = buatReferensiAnggota(sesi, uid);
  const sesiRef = buatReferensiSesi(sesi);
  const presensiRef = doc(
    db,
    "kelas",
    sesi.kelasId,
    "praktikum",
    sesi.praktikumId,
    "sesi",
    sesi.id,
    "presensi",
    uid,
  );
  const izinRef = buatReferensiIzin(sesi, uid);
  const waktuSekarang = new Date().toISOString();

  const dataIzin: PengajuanIzin = {
    id: uid,
    kelasId: sesi.kelasId,
    sesiId: sesi.id,
    praktikanId: uid,
    namaPraktikan: praktikan.nama,
    nim: praktikan.nim ?? "",
    alasan,
    status: "menunggu",
    klasifikasiStatus: "menunggu",
    createdAt: waktuSekarang,
    updatedAt: waktuSekarang,
  };

  // Simpan alasan dahulu agar pengajuan tetap ada jika permintaan ke Groq gagal.
  await runTransaction(db, async (transaksi) => {
    const [anggota, sesiSnapshot, presensi, izin] = await Promise.all([
      transaksi.get(anggotaRef),
      transaksi.get(sesiRef),
      transaksi.get(presensiRef),
      transaksi.get(izinRef),
    ]);

    if (!anggota.exists() || anggota.data().status !== "aktif") {
      throw new Error("Keanggotaan kelasmu tidak aktif.");
    }

    if (!sesiSnapshot.exists()) {
      throw new Error("Sesi tidak ditemukan.");
    }

    const statusSesi = sesiSnapshot.data().status;

    if (statusSesi !== "dibuka" && statusSesi !== "ditutup") {
      throw new Error("Izin hanya dapat diajukan setelah sesi dibuka.");
    }

    if (presensi.exists()) {
      throw new Error("Kamu sudah tercatat hadir pada sesi ini.");
    }

    if (izin.exists()) {
      throw new Error("Kamu sudah mengajukan izin untuk sesi ini.");
    }

    transaksi.set(izinRef, dataIzin);
  });

  let kategoriAI: KategoriIzinAI;
  try {
    kategoriAI = await klasifikasikanAlasanIzin(alasan);
  } catch (error) {
    const klasifikasiError = kodeErrorGroq(error);
    const updatedAt = new Date().toISOString();

    try {
      await updateDoc(izinRef, {
        klasifikasiStatus: "gagal",
        klasifikasiError,
        updatedAt,
      });
      return {
        ...dataIzin,
        klasifikasiStatus: "gagal",
        klasifikasiError,
        updatedAt,
      };
    } catch (simpanError) {
      console.warn("Status klasifikasi gagal disimpan:", simpanError);
      return {
        ...dataIzin,
        klasifikasiStatus: "menunggu",
        klasifikasiError: "penyimpanan",
        updatedAt,
      };
    }
  }

  const updatedAt = new Date().toISOString();
  try {
    await updateDoc(izinRef, {
      klasifikasiStatus: "berhasil",
      kategoriAI,
      klasifikasiError: null,
      updatedAt,
    });

    return {
      ...dataIzin,
      klasifikasiStatus: "berhasil",
      kategoriAI,
      updatedAt,
    };
  } catch (simpanError) {
    console.warn("Hasil klasifikasi gagal disimpan:", simpanError);
    return {
      ...dataIzin,
      klasifikasiStatus: "menunggu",
      kategoriAI,
      klasifikasiError: "penyimpanan",
      updatedAt,
    };
  }
}

export async function klasifikasikanUlangIzin(
  sesi: Sesi,
  pengajuan: PengajuanIzin,
): Promise<PengajuanIzin> {
  const uid = getAuth().currentUser?.uid;

  if (!uid) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  if (pengajuan.kelasId !== sesi.kelasId || pengajuan.sesiId !== sesi.id) {
    throw new Error("Pengajuan izin tidak cocok dengan sesi ini.");
  }

  if (pengajuan.status !== "menunggu") {
    throw new Error(
      "Pengajuan yang sudah diputuskan tidak dapat diklasifikasi ulang.",
    );
  }

  const kelasRef = doc(db, "kelas", sesi.kelasId);
  const izinRef = buatReferensiIzin(sesi, pengajuan.praktikanId);

  // Pastikan akun yang meminta klasifikasi ulang adalah pemilik kelas.
  await runTransaction(db, async (transaksi) => {
    const [kelasSnapshot, izinSnapshot] = await Promise.all([
      transaksi.get(kelasRef),
      transaksi.get(izinRef),
    ]);

    if (!kelasSnapshot.exists() || !izinSnapshot.exists()) {
      throw new Error("Kelas atau pengajuan izin tidak ditemukan.");
    }

    if (kelasSnapshot.data().asistenUid !== uid) {
      throw new Error(
        "Hanya asisten pemilik kelas yang dapat mengklasifikasi ulang.",
      );
    }

    if (izinSnapshot.data().status !== "menunggu") {
      throw new Error("Pengajuan izin ini sudah diputuskan.");
    }
  });

  let kategoriAI: KategoriIzinAI;
  try {
    kategoriAI = await klasifikasikanAlasanIzin(pengajuan.alasan);
  } catch (error) {
    const klasifikasiError = kodeErrorGroq(error);
    const updatedAt = new Date().toISOString();

    try {
      await updateDoc(izinRef, {
        klasifikasiStatus: "gagal",
        klasifikasiError,
        updatedAt,
      });
    } catch (simpanError) {
      console.warn("Status klasifikasi ulang gagal disimpan:", simpanError);
      throw new Error(
        `${pesanErrorKlasifikasi(klasifikasiError)} Statusnya juga belum tersimpan ke Firebase.`,
      );
    }

    return {
      ...pengajuan,
      klasifikasiStatus: "gagal",
      klasifikasiError,
      updatedAt,
    };
  }

  const updatedAt = new Date().toISOString();
  await runTransaction(db, async (transaksi) => {
    const [kelasSnapshot, izinSnapshot] = await Promise.all([
      transaksi.get(kelasRef),
      transaksi.get(izinRef),
    ]);

    if (!kelasSnapshot.exists() || !izinSnapshot.exists()) {
      throw new Error("Kelas atau pengajuan izin tidak ditemukan.");
    }

    if (
      kelasSnapshot.data().asistenUid !== uid ||
      izinSnapshot.data().status !== "menunggu"
    ) {
      throw new Error(
        "Pengajuan sudah diputuskan atau akses asisten sudah berubah.",
      );
    }

    transaksi.update(izinRef, {
      klasifikasiStatus: "berhasil",
      kategoriAI,
      klasifikasiError: null,
      updatedAt,
    });
  });

  return {
    ...pengajuan,
    klasifikasiStatus: "berhasil",
    kategoriAI,
    updatedAt,
  };
}

export async function ambilIzinPraktikan(
  daftarSesi: Sesi[],
): Promise<PengajuanIzin[]> {
  const uid = getAuth().currentUser?.uid;

  if (!uid) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  const hasilPerSesi = await Promise.all(
    daftarSesi.map(async (sesi) => {
      let dokumenIzin = await getDoc(buatReferensiIzin(sesi, uid));
      if (!dokumenIzin.exists() && sesi.legacy) {
        dokumenIzin = await getDoc(doc(db, "kelas", sesi.kelasId, "sesi", sesi.id, "izin", uid));
      }

      if (!dokumenIzin.exists()) {
        return null;
      }

      const pengajuan = ubahDokumenKePengajuan(
        dokumenIzin.id,
        dokumenIzin.data(),
      );

      if (
        !pengajuan ||
        pengajuan.kelasId !== sesi.kelasId ||
        pengajuan.sesiId !== sesi.id ||
        pengajuan.praktikanId !== uid
      ) {
        return null;
      }

      return pengajuan;
    }),
  );

  return hasilPerSesi.filter(
    (pengajuan): pengajuan is PengajuanIzin => pengajuan !== null,
  );
}

export async function ambilIzinAsisten(
  daftarSesi: Sesi[],
): Promise<PengajuanIzin[]> {
  if (!getAuth().currentUser?.uid) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  const hasilPerSesi = await Promise.all(
    daftarSesi.map(async (sesi) => {
      const hasil = await getDocs(
        collection(db, "kelas", sesi.kelasId, "praktikum", sesi.praktikumId, "sesi", sesi.id, "izin"),
      );
      const hasilLama = sesi.legacy ? await getDocs(collection(db, "kelas", sesi.kelasId, "sesi", sesi.id, "izin")) : null;

      const byId = new Map([...hasil.docs, ...(hasilLama?.docs ?? [])].map(d => [d.id, d]));
      return [...byId.values()]
        .map((dokumen) => ubahDokumenKePengajuan(dokumen.id, dokumen.data()))
        .filter(
          (pengajuan): pengajuan is PengajuanIzin =>
            pengajuan !== null &&
            pengajuan.kelasId === sesi.kelasId &&
            pengajuan.sesiId === sesi.id,
        );
    }),
  );

  return hasilPerSesi
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putuskanIzin(
  sesi: Sesi,
  pengajuan: PengajuanIzin,
  keputusan: "diterima" | "ditolak",
  catatanInput = "",
): Promise<PengajuanIzin> {
  const uid = getAuth().currentUser?.uid;

  if (!uid) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  if (pengajuan.kelasId !== sesi.kelasId || pengajuan.sesiId !== sesi.id) {
    throw new Error("Pengajuan izin tidak cocok dengan sesi ini.");
  }

  const catatanAsisten = catatanInput.trim();

  if (catatanAsisten.length > 500) {
    throw new Error("Catatan asisten maksimal 500 karakter.");
  }

  const kelasRef = doc(db, "kelas", sesi.kelasId);
  const izinRef = buatReferensiIzin(sesi, pengajuan.praktikanId);
  const updatedAt = new Date().toISOString();

  await runTransaction(db, async (transaksi) => {
    const [kelasSnapshot, izinSnapshot] = await Promise.all([
      transaksi.get(kelasRef),
      transaksi.get(izinRef),
    ]);

    if (!kelasSnapshot.exists() || !izinSnapshot.exists()) {
      throw new Error("Kelas atau pengajuan izin tidak ditemukan.");
    }

    if (kelasSnapshot.data().asistenUid !== uid) {
      throw new Error("Kamu bukan asisten pemilik kelas ini.");
    }

    if (izinSnapshot.data().status !== "menunggu") {
      throw new Error("Pengajuan izin ini sudah pernah diputuskan.");
    }

    transaksi.update(izinRef, {
      status: keputusan,
      catatanAsisten,
      updatedAt,
    });
  });

  return {
    ...pengajuan,
    status: keputusan,
    catatanAsisten,
    updatedAt,
  };
}
