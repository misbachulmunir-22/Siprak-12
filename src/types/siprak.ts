export type Peran = 'asisten' | 'praktikan';

export type StatusSesi =
  | 'belum_dibuka'
  | 'dibuka'
  | 'ditutup';

export type StatusRiwayat =
  | 'hadir'
  | 'belum_hadir'
  | 'belum_dimulai';

export interface Pengguna {
  id: string;
  nama: string;
  peran: Peran;
  nim?: string;
  kelas?: string;
}

export interface Sesi {
  id: string;
  praktikum: string;
  pertemuan: number;
  kelas: string;
  lab: string;
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
