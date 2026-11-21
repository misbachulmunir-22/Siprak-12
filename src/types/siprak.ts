export type Peran = "asisten" | "praktikan";

export type StatusSesi =
  | "belum_dibuka"
  | "dibuka"
  | "ditutup"
  | "diarsipkan";

export type StatusRiwayat = "hadir" | "izin" | "izin_menunggu" | "izin_ditolak" | "alpha" | "belum_hadir" | "belum_dimulai";

export type StatusKelas = "aktif" | "diarsipkan";
export type StatusAnggotaKelas = "aktif" | "nonaktif";
export type StatusPraktikum = "aktif" | "diarsipkan";
export type StatusLaboratorium = "aktif" | "diarsipkan";

export type StatusPengajuanIzin = "menunggu" | "diterima" | "ditolak";

export type StatusKlasifikasiIzin = "menunggu" | "berhasil" | "gagal";

export type KategoriIzinAI = "Sakit" | "Izin" | "Alpha";

export type KodeErrorKlasifikasi =
  | "api_key_tidak_ada"
  | "api_key_tidak_valid"
  | "batas_permintaan"
  | "jaringan"
  | "layanan_groq"
  | "respons_tidak_valid"
  | "penyimpanan";

export interface PengajuanIzin {
  id: string;
  kelasId: string;
  sesiId: string;
  praktikanId: string;
  namaPraktikan: string;
  nim: string;
  alasan: string;
  status: StatusPengajuanIzin;
  klasifikasiStatus: StatusKlasifikasiIzin;
  kategoriAI?: KategoriIzinAI;
  klasifikasiError?: KodeErrorKlasifikasi;
  catatanAsisten?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KelasPraktikum {
  id: string;
  nama: string;
  /** Field lama dipertahankan sementara untuk migrasi data hierarki v1. */
  praktikum?: string;
  asistenUid: string;
  status: StatusKelas;
  createdAt: string;
  updatedAt: string;
}

export interface Praktikum {
  id: string;
  kelasId: string;
  nama: string;
  asistenUid: string;
  status: StatusPraktikum;
  createdAt: string;
  updatedAt: string;
  legacyMigrasiSelesai?: boolean;
}

export interface Laboratorium {
  id: string;
  nama: string;
  asistenUid: string;
  status: StatusLaboratorium;
  createdAt: string;
  updatedAt: string;
}

export interface AnggotaKelas {
  uid: string;
  praktikumId?: string;
  nama: string;
  nim: string;
  status: StatusAnggotaKelas;
  joinedAt: string;
}

export interface Pengguna {
  id: string;
  nama: string;
  peran: Peran;
  nim?: string;
  kelas?: string;
  kelasId?: string;
  praktikumId?: string;
  namaPraktikum?: string;
  statusKeanggotaan?: StatusAnggotaKelas;
}

export interface Sesi {
  id: string;
  kelasId: string;
  praktikumId: string;
  praktikum: string;
  pertemuan: number;
  kelas: string;
  lab: string;
  ruanganId?: string;
  reservasiId?: string;
  /** Sesi v1 tetap dibaca dari koleksi lama sampai data dapat dimigrasikan. */
  legacy?: boolean;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: StatusSesi;
  dibukaPada?: string;
  ditutupPada?: string;
  catatanPenutup?: string;
}

export interface Presensi {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuHadir: string;
}

export interface SiprakContextValue {
  submitLeave: (sesi: Sesi, alasan: string) => Promise<PengajuanIzin>;
  currentUser: Pengguna | null;
  classes: KelasPraktikum[];
  practicums: Praktikum[];
  sessions: Sesi[];
  attendances: Presensi[];
  praktikanList: Pengguna[];
  login: (userId: string) => void;
  logout: () => void;
  openSession: (sesi: Sesi) => Promise<void>;
  closeSession: (sesi: Sesi, catatan?: string) => Promise<void>;
  checkIn: (sesi: Sesi) => Promise<Presensi>;
  getAttendance: (sesiId: string) => Presensi[];
  getUserAttendance: (userId: string) => Presensi[];
  authReady: boolean;
  authProfileError: string | null;
  registerAccount: (input: {
    nama: string;
    nim: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signInAccount: (email: string, password: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  leaveRequests: PengajuanIzin[];
}
