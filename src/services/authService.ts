/**
 * Layanan Autentikasi Pengguna (Firebase Authentication + Profil Firestore)
 * Owner: Programmer 1 (Jeje)
 * Acuan: SRS-SIPRAK12-S2-2026-001 (FR-S2-01 s.d. FR-S2-04, FR-S2-21)
 */

import {
  FirebaseServiceError,
  firebaseAuth,
} from '../lib/firebase';
import type { FirebaseAuthUser } from '../lib/firebase';
import type {
  AuthValidationResult,
  LoginInput,
  Pengguna,
  RegisterInput,
} from '../types/siprak';
import { userService } from './userService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIM_REGEX = /^[0-9]{5,15}$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validasi input form Login (FR-S2-02, FR-S2-21)
 */
export function validateLoginInput(input: LoginInput): AuthValidationResult {
  const errors: Record<string, string> = {};
  const email = input.email?.trim() ?? '';
  const password = input.password ?? '';

  if (!email) {
    errors.email = 'Alamat email wajib diisi.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Format alamat email tidak valid (contoh: nama@siprak.ac.id).';
  }

  if (!password) {
    errors.password = 'Kata sandi wajib diisi.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Kata sandi minimal terdiri dari ${MIN_PASSWORD_LENGTH} karakter.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validasi input form Registrasi (FR-S2-01, FR-S2-21)
 */
export function validateRegisterInput(
  input: RegisterInput
): AuthValidationResult {
  const errors: Record<string, string> = {};
  const nama = input.nama?.trim() ?? '';
  const email = input.email?.trim() ?? '';
  const nim = input.nim?.trim() ?? '';
  const password = input.password ?? '';
  const confirmPassword = input.confirmPassword ?? '';

  if (!nama) {
    errors.nama = 'Nama lengkap wajib diisi.';
  } else if (nama.length < 3) {
    errors.nama = 'Nama lengkap minimal terdiri dari 3 karakter.';
  }

  if (!email) {
    errors.email = 'Alamat email wajib diisi.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Format alamat email tidak valid (contoh: mahasiswa@siprak.ac.id).';
  }

  if (nim && !NIM_REGEX.test(nim)) {
    errors.nim = 'NIM harus berupa angka 5 hingga 15 digit.';
  }

  if (!password) {
    errors.password = 'Kata sandi wajib diisi.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Kata sandi minimal terdiri dari ${MIN_PASSWORD_LENGTH} karakter.`;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok dengan kata sandi.';
  }

  if (input.requestedRole && input.requestedRole !== 'praktikan') {
    errors.role =
      'Peran asisten tidak dapat dipilih sendiri saat registrasi. Akun baru didaftarkan sebagai praktikan.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Menerjemahkan kode error Firebase/jaringan ke Bahasa Indonesia yang jelas
 * beserta langkah tindak lanjut (FR-S2-02, FR-S2-21, NFR-S2-07).
 */
export function formatAuthError(error: unknown): string {
  if (error instanceof FirebaseServiceError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email atau kata sandi salah. Periksa kembali kredensial Anda dan coba lagi.';
      case 'auth/email-already-in-use':
        return 'Alamat email ini sudah terdaftar. Silakan masuk atau gunakan email lain.';
      case 'auth/invalid-email':
        return 'Format alamat email tidak valid. Periksa penulisan email Anda.';
      case 'auth/weak-password':
        return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      case 'auth/user-disabled':
        return 'Akun Anda sedang dinonaktifkan. Hubungi koordinator asisten laboratorium.';
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan masuk yang gagal. Tunggu beberapa saat sebelum mencoba lagi.';
      case 'auth/network-request-failed':
      case 'unavailable':
        return 'Gagal terhubung ke server karena gangguan jaringan. Periksa koneksi internet Anda lalu coba lagi.';
      case 'permission-denied':
        return error.message || 'Akses ditolak oleh aturan keamanan (Security Rules).';
      default:
        return error.message || 'Terjadi kesalahan saat memproses autentikasi.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
}

export const authService = {
  validateLoginInput,
  validateRegisterInput,
  formatAuthError,

  /**
   * Registrasi akun baru: membuat identitas di Firebase Auth dan menyimpan profil
   * di `users/{uid}` dengan role default `praktikan` (FR-S2-01).
   */
  async register(input: RegisterInput): Promise<Pengguna> {
    const validation = validateRegisterInput(input);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      throw new FirebaseServiceError(
        'auth/validation-error',
        firstError || 'Data pendaftaran belum valid.'
      );
    }

    const authUser = await firebaseAuth.createUserWithEmailAndPassword(
      input.email,
      input.password,
      input.nama
    );

    const profile = await userService.createInitialPraktikanProfile({
      uid: authUser.uid,
      nama: input.nama,
      email: input.email,
      nim: input.nim,
      requestedRole: input.requestedRole,
    });

    return profile;
  },

  /**
   * Login menggunakan email & kata sandi, lalu memuat profil dari `users/{uid}` (FR-S2-02)
   */
  async login(input: LoginInput): Promise<Pengguna> {
    const validation = validateLoginInput(input);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      throw new FirebaseServiceError(
        'auth/validation-error',
        firstError || 'Masukan email atau kata sandi belum valid.'
      );
    }

    const authUser = await firebaseAuth.signInWithEmailAndPassword(
      input.email,
      input.password
    );

    const profile = await userService.getUserProfile(authUser.uid);
    if (!profile) {
      throw new FirebaseServiceError(
        'profile-not-found',
        'Profil pengguna belum ditemukan di Cloud Firestore. Hubungi pengelola praktikum.'
      );
    }

    return profile;
  },

  /**
   * Mengakhiri sesi Firebase Auth dan membersihkan seluruh listener aktif (FR-S2-03)
   */
  async logout(): Promise<void> {
    await firebaseAuth.signOut();
  },

  /**
   * Observer status sesi login Firebase Authentication (FR-S2-03, SRS Bab 6.5)
   */
  subscribeAuthState(
    onChange: (user: FirebaseAuthUser | null) => void
  ): () => void {
    return firebaseAuth.onAuthStateChanged(onChange);
  },

  getCurrentAuthUser(): FirebaseAuthUser | null {
    return firebaseAuth.getCurrentUser();
  },
};
