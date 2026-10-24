export type Peran = 'asisten' | 'praktikan';
export type StatusSesi = 'belum_dibuka' | 'dibuka' | 'ditutup';
export type StatusRiwayat = 'hadir' | 'belum_hadir' | 'belum_dimulai';

export interface Pengguna {
  id: string;
  nama: string;
  peran: Peran;
  nim?: string; // khusus praktikan
  kelas?: string; // khusus praktikan
}

export interface Sesi {
  id: string;
  praktikum: string;
  pertemuan: number;
  kelas: string;
  lab: string;
  tanggal: string; // ISO, mis. 2026-11-02
  jamMulai: string; // HH:MM
  jamSelesai: string; // HH:MM
  status: StatusSesi;
  dibukaPada?: string; // ISO
  ditutupPada?: string; // ISO
  catatanPenutup?: string;
}

export interface Presensi {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuHadir: string; // ISO, dari jam perangkat
}

// Props komponen aksi di layar detail (app/sesi/[id].tsx)
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
  checkIn(sesiId: string): { ok: boolean; reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi' };
  getAttendance(sesiId: string): Presensi[];
  getUserAttendance(userId: string): Presensi[];
}
