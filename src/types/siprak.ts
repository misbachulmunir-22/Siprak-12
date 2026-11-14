export type Peran = 'asisten' | 'praktikan';

export type StatusSesi =
  | 'belum_dibuka'
  | 'dibuka'
  | 'ditutup';

export type StatusIzin =
  | 'menunggu'
  | 'disetujui'
  | 'ditolak';

export type StatusAI =
  | 'menunggu'
  | 'berhasil'
  | 'gagal'
  | 'tidak_tersedia';

export type StatusRiwayat =
  | 'hadir'
  | 'belum_hadir'
  | 'belum_dimulai';

export interface Pengguna {
  id: string; // Firebase Auth UID
  nama: string;
  email?: string;
  peran: Peran;
  nim?: string;
  kelas?: string;
  kelasIds?: string[];
  aktif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sesi {
  id: string;
  scheduleId?: string;
  classId?: string;
  praktikum: string;
  pertemuan: number;
  kelas: string;
  lab: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:MM
  jamSelesai: string; // HH:MM
  status: StatusSesi;
  dibukaPada?: string;
  ditutupPada?: string;
  catatanPenutup?: string;
}

export interface Presensi {
  id: string; // `${sesiId}_${praktikanUid}`
  sesiId: string;
  classId?: string;
  praktikanId?: string; // Kompatibilitas Sprint 1
  praktikanUid?: string; // Standar Sprint 2 (Firebase Auth UID)
  waktuHadir: string;
  createdAt?: string;
}

export interface PengajuanIzin {
  id: string;
  sesiId: string;
  classId: string;
  praktikanUid: string;
  alasan: string;
  aiStatus: StatusAI;
  aiCategory?: string;
  aiConfidence?: number;
  aiModel?: string;
  aiProcessedAt?: string;
  status: StatusIzin;
  reviewerUid?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AsistenSesiActionsProps {
  sesi: Sesi;
}

export interface PraktikanPresensiActionProps {
  sesi: Sesi;
}

export interface SiprakContextValue {
  currentUser: Pengguna | null;
  sessions: Sesi[];
  attendances: Presensi[];
  praktikanList: Pengguna[];

  login(userId: string): void;
  logout(): void;
  openSession(sesiId: string): void;
  closeSession(sesiId: string, catatan?: string): void;

  checkIn(sesiId: string): {
    ok: boolean;
    reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi';
  };

  getAttendance(sesiId: string): Presensi[];
  getUserAttendance(userId: string): Presensi[];
}
