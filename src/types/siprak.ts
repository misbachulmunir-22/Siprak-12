/**
 * Kontrak Tipe Data Utama Siprak-12 (Sprint 2)
 * Owner: Programmer 1 (Jeje)
 * Acuan: SRS-SIPRAK12-S2-2026-001 Bab 6.2, 6.4, 6.5 & Lampiran A
 */

export type Peran = 'asisten' | 'praktikan';

export type StatusSesi = 'belum_dibuka' | 'dibuka' | 'ditutup';

export type StatusIzin = 'menunggu' | 'disetujui' | 'ditolak';

export type StatusAI = 'menunggu' | 'berhasil' | 'gagal' | 'tidak_tersedia';

export type StatusRiwayat = 'hadir' | 'belum_hadir' | 'belum_dimulai';

/**
 * Status siklus autentikasi & profil pengguna (SRS Bab 6.5 & FR-S2-03/04/21):
 * - initializing: sedang memulihkan sesi login awal dari Firebase Auth / storage
 * - unauthenticated: belum login atau sudah logout
 * - authenticated: sudah login dan profil pengguna valid & aktif
 * - profile-pending: sudah login Auth, tetapi profil belum aktif / menunggu aktivasi role
 * - profile-error: gagal memuat profil dari Firestore (mis. gangguan koneksi)
 */
export type AuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticated'
  | 'profile-pending'
  | 'profile-error';

/**
 * Dokumen profil pengguna di koleksi Firestore `users/{uid}` (SRS Bab 6.2)
 */
export interface UserProfileDoc {
  uid: string;
  nama: string;
  email: string;
  role: Peran;
  nim?: string;
  kelas?: string;
  kelasIds?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Entitas Pengguna pada aplikasi (SRS Bab 6.4)
 */
export interface Pengguna {
  id: string; // Firebase Auth UID
  uid?: string; // Alias UID untuk konsistensi dengan dokumen Firestore
  nama: string;
  email: string;
  peran: Peran;
  role?: Peran; // Alias role dari dokumen Firestore
  nim?: string;
  kelas?: string; // Kompatibilitas dengan layar Sprint 1
  kelasIds?: string[];
  aktif: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Dokumen kelas pada koleksi `classes/{classId}` (SRS Bab 6.2)
 */
export interface Kelas {
  id: string;
  nama: string;
  kode: string;
  namaPraktikum: string;
  praktikumId?: string;
  assistantUids: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dokumen keanggotaan pada subkoleksi `classes/{classId}/members/{uid}` (SRS Bab 6.2)
 */
export interface KeanggotaanKelas {
  uid: string;
  namaSnapshot: string;
  nimSnapshot: string;
  joinedAt: string;
  active: boolean;
}

/**
 * Dokumen jadwal pada koleksi `schedules/{scheduleId}` (SRS Bab 6.2)
 */
export interface Jadwal {
  id: string;
  classId: string;
  namaPraktikum: string;
  pertemuan: number;
  lab: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:MM
  jamSelesai: string; // HH:MM
  createdBy: string;
  active?: boolean;
  createdAt?: string;
  updatedAt: string;
}

/**
 * Entitas Sesi Praktikum pada koleksi `sessions/{sessionId}` (SRS Bab 6.4)
 */
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
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Entitas Presensi pada koleksi `attendances/{sessionId_uid}` (SRS Bab 6.4)
 */
export interface Presensi {
  id: string; // `${sesiId}_${praktikanUid}`
  sesiId: string;
  sessionId?: string;
  classId?: string;
  praktikanUid?: string;
  praktikanId: string; // Kompatibilitas modul Sprint 1
  waktuHadir: string;
  createdAt?: string;
}

/**
 * Entitas Pengajuan Izin pada koleksi `leaveRequests/{requestId}` (SRS Bab 6.4)
 */
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

export interface AsistenSesiActionsProps {
  sesi: Sesi;
}

export interface PraktikanPresensiActionProps {
  sesi: Sesi;
}

/**
 * Input & Validasi Form Autentikasi (FR-S2-01, FR-S2-02, FR-S2-21)
 */
export interface RegisterInput {
  nama: string;
  email: string;
  nim?: string;
  password: string;
  confirmPassword: string;
  // Catatan keamanan (FR-S2-01): jika ada properti role dari luar, akan diabaikan/ditolak jika 'asisten'
  requestedRole?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Kontrak Context Utama Aplikasi Siprak-12 (SRS Bab 6.5)
 */
export interface SiprakContextValue {
  // State Autentikasi & Profil Sprint 2 (FR-S2-01 s.d. FR-S2-04, FR-S2-21)
  currentUser: Pengguna | null;
  authStatus: AuthStatus;
  authError: string | null;
  isAuthenticating: boolean;

  // Aksi Autentikasi Sprint 2
  loginWithEmail(input: LoginInput): Promise<{ ok: boolean; error?: string }>;
  registerAccount(input: RegisterInput): Promise<{ ok: boolean; error?: string }>;
  refreshProfile(): Promise<void>;
  clearAuthError(): void;
  registerCleanupListener(unsubscribe: () => void): () => void;

  // Kompatibilitas dengan komponen modul lain
  sessions: Sesi[];
  attendances: Presensi[];
  praktikanList: Pengguna[];
  login(userId: string): void;
  logout(): Promise<void>;
  openSession(sesiId: string): void;
  closeSession(sesiId: string, catatan?: string): void;
  checkIn(sesiId: string): {
    ok: boolean;
    reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi';
  };
  getAttendance(sesiId: string): Presensi[];
  getUserAttendance(userId: string): Presensi[];
}
