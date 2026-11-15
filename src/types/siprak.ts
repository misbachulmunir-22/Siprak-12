/**
 * Kontrak tipe bersama Siprak-12 Sprint 2.
 * Baseline: src/types/siprak.ts pada branch main.
 * Kontrak auth/profile diselaraskan dengan SRS Bab 6.2 dan 6.4.
 */

export type Peran = 'asisten' | 'praktikan';
export type AuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticated'
  | 'profile-pending'
  | 'profile-error';

export type StatusSesi = 'belum_dibuka' | 'dibuka' | 'ditutup';
export type StatusRiwayat = 'hadir' | 'belum_hadir' | 'belum_dimulai';
export type StatusIzin = 'menunggu' | 'disetujui' | 'ditolak';
export type StatusAI = 'menunggu' | 'berhasil' | 'gagal' | 'tidak_tersedia';

/** Representasi users/{uid} di Firestore. Timestamp Firestore dipetakan di service ke ISO string. */
export interface UserProfileDoc {
  uid: string;
  nama: string;
  email: string;
  role: Peran;
  nim?: string;
  kelasIds?: string[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Model pengguna yang digunakan layar. id selalu sama dengan Firebase Auth UID. */
export interface Pengguna {
  id: string;
  uid?: string;
  nama: string;
  email?: string;
  peran: Peran;
  role?: Peran;
  nim?: string;
  kelas?: string;
  kelasIds?: string[];
  aktif?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterInput {
  nama: string;
  email: string;
  nim?: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface AuthActionResult {
  ok: boolean;
  error?: string;
}

export interface Sesi {
  id: string;
  scheduleId?: string;
  classId?: string;
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
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Presensi {
  id: string;
  sesiId: string;
  sessionId?: string;
  classId?: string;
  praktikanUid?: string;
  praktikanId: string;
  waktuHadir: string;
  createdAt?: string;
}

export interface PengajuanIzin {
  id: string;
  sesiId: string;
  sessionId?: string;
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

export interface Kelas {
  id: string;
  nama: string;
  kode: string;
  namaPraktikum: string;
  praktikumId?: string;
  assistantUids: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface KeanggotaanKelas {
  uid: string;
  namaSnapshot: string;
  nimSnapshot?: string;
  joinedAt?: string;
  active: boolean;
}

export interface Jadwal {
  id: string;
  classId: string;
  namaPraktikum: string;
  pertemuan: number;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  createdBy: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AsistenSesiActionsProps {
  sesi: Sesi;
}

export interface PraktikanPresensiActionProps {
  sesi: Sesi;
}

/**
 * Kontrak transisi sementara untuk menjaga kompatibilitas layar Sprint 1.
 * Data sesi/presensi Sprint 2 harus dimuat oleh service/hook per modul,
 * bukan disimpan sebagai koleksi global di SiprakContext.
 */
export interface SiprakContextValue {
  currentUser: Pengguna | null;
  authStatus: AuthStatus;
  authError: string | null;
  isAuthenticating: boolean;

  loginWithEmail(input: LoginInput): Promise<AuthActionResult>;
  registerAccount(input: RegisterInput): Promise<AuthActionResult>;
  refreshProfile(): Promise<void>;
  clearAuthError(): void;
  registerCleanupListener(unsubscribe: () => void): () => void;
  logout(): Promise<void>;

  /** API kompatibilitas Sprint 1; nilai Context sengaja kosong sampai modul data diintegrasikan. */
  sessions: Sesi[];
  attendances: Presensi[];
  praktikanList: Pengguna[];
  login(userId: string): void;
  openSession(sesiId: string): void;
  closeSession(sesiId: string, catatan?: string): void;
  checkIn(sesiId: string): {
    ok: boolean;
    reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi';
  };
  getAttendance(sesiId: string): Presensi[];
  getUserAttendance(userId: string): Presensi[];
}
