/**
 * Service Firebase Authentication.
 * FR-S2-01 registrasi, FR-S2-02 login, FR-S2-03 logout/pemulihan sesi.
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '@/firebase';
import type {
  AuthValidationResult,
  LoginInput,
  RegisterInput,
} from '@/types/siprak';
import { userService } from '@/services/userService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIM_REGEX = /^[0-9]{5,15}$/;
const MIN_PASSWORD_LENGTH = 6;

export function validateLoginInput(input: LoginInput): AuthValidationResult {
  const errors: Record<string, string> = {};
  const email = input.email?.trim() ?? '';
  const password = input.password ?? '';

  if (!email) errors.email = 'Email wajib diisi.';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Format email tidak valid.';

  if (!password) errors.password = 'Kata sandi wajib diisi.';
  else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRegisterInput(
  input: RegisterInput
): AuthValidationResult {
  const errors: Record<string, string> = {};
  const nama = input.nama?.trim() ?? '';
  const email = input.email?.trim() ?? '';
  const nim = input.nim?.trim() ?? '';
  const password = input.password ?? '';
  const confirmPassword = input.confirmPassword ?? '';

  if (nama.length < 3) errors.nama = 'Nama lengkap minimal 3 karakter.';
  if (!email) errors.email = 'Email wajib diisi.';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Format email tidak valid.';
  if (nim && !NIM_REGEX.test(nim)) {
    errors.nim = 'NIM harus berupa angka 5 hingga 15 digit.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi tidak sama.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah. Periksa kembali kredensial Anda.';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/user-disabled':
      return 'Akun dinonaktifkan. Hubungi pengelola praktikum.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
    case 'auth/network-request-failed':
    case 'unavailable':
      return 'Tidak dapat terhubung ke Firebase. Periksa koneksi internet.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Akses ditolak oleh Firestore Security Rules. Periksa konfigurasi aturan.';
    case 'auth/operation-not-allowed':
      return 'Metode Email/Password belum diaktifkan pada Firebase Authentication.';
    default:
      if (error instanceof Error && error.message) return error.message;
      return 'Terjadi kesalahan yang tidak diketahui. Coba lagi.';
  }
}

export const authService = {
  async register(input: RegisterInput) {
    const validation = validateRegisterInput(input);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors)[0] ?? 'Data registrasi tidak valid.');
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password
    );

    try {
      await updateProfile(credential.user, { displayName: input.nama.trim() });
      await userService.createInitialPraktikanProfile({
        uid: credential.user.uid,
        nama: input.nama,
        email: credential.user.email ?? input.email,
        nim: input.nim,
      });
    } catch (profileError) {
      // Jika pembuatan profil gagal, jangan tinggalkan akun Auth yatim tanpa profil.
      try {
        await deleteUser(credential.user);
      } catch {
        // Error utama tetap dilaporkan; akun dapat dibersihkan oleh pengelola.
      }
      throw profileError;
    }

    return credential.user;
  },

  async login(input: LoginInput) {
    const validation = validateLoginInput(input);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors)[0] ?? 'Data login tidak valid.');
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password
    );
    return credential.user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async sendPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new Error('Masukkan alamat email yang valid terlebih dahulu.');
    }
    await sendPasswordResetEmail(auth, normalizedEmail);
  },

  subscribeAuthState(
    callback: (user: User | null) => void
  ): () => void {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentAuthUser(): User | null {
    return auth.currentUser;
  },
};
