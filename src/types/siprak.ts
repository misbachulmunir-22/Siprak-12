
export type Peran = 'asisten' | 'praktikan';

export type AuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticated'
  | 'profile-pending'
  | 'profile-error';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  nama: string;
  email: string;
  nim?: string;
  password: string;
  confirmPassword: string;
}

export interface AuthValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface AuthActionResult {
  ok: boolean;
  error?: string;
}

/** Bentuk dokumen users/{uid} yang dibaca dari Cloud Firestore. */
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
  id: string;
  uid?: string;
  nama: string;
  email?: string;
  peran: Peran;
  role?: Peran;
  active?: boolean;
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
  classId?: string;
  praktikanId?: string;
  praktikanUid?: string;
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
  authStatus: AuthStatus;
  authError: string | null;
  isAuthenticating: boolean;

  loginWithEmail(input: LoginInput): Promise<AuthActionResult>;
  registerAccount(input: RegisterInput): Promise<AuthActionResult>;
  refreshProfile(): Promise<void>;
  clearAuthError(): void;
  registerCleanupListener(unsubscribe: () => void): () => void;
  logout(): Promise<void>;

  sessions: Sesi[];
  attendances: Presensi[];
  praktikanList: Pengguna[];

  /** Adapter kompatibilitas modul Sprint 1; login simulasi tidak lagi mengautentikasi akun. */
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
