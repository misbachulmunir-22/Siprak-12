/**
 * Layanan Profil Pengguna Cloud Firestore (`users/{uid}`)
 * Owner: Programmer 1 (Jeje)
 * Acuan: SRS-SIPRAK12-S2-2026-001 (FR-S2-01, FR-S2-04, FR-S2-21, FR-S2-22)
 */

import {
  FirebaseServiceError,
  firestoreDb,
  serverTimestamp,
} from '../lib/firebase';
import type { Pengguna, Peran, UserProfileDoc } from '../types/siprak';

const VALID_ROLES: Peran[] = ['asisten', 'praktikan'];

export function isValidPeran(value: unknown): value is Peran {
  return typeof value === 'string' && VALID_ROLES.includes(value as Peran);
}

const DEMO_ASSISTANT_CLASS_BY_EMAIL: Record<string, string[]> = {
  'asisten@siprak.ac.id': ['kelas-a'],
  'asisten2@siprak.ac.id': ['kelas-b'],
};

const DEMO_PRAKTIKAN_CLASS_BY_EMAIL: Record<string, { kelas: string; kelasIds: string[] }> = {
  'ahmad@siprak.ac.id': { kelas: 'A', kelasIds: ['kelas-a'] },
  'bella@siprak.ac.id': { kelas: 'A', kelasIds: ['kelas-a'] },
};

/**
 * Memetakan dokumen Firestore `users/{uid}` menjadi objek `Pengguna` aplikasi (SRS Bab 6.4)
 */
export function mapProfileDocToPengguna(doc: UserProfileDoc): Pengguna {
  const normalizedEmail = (doc.email ?? '').trim().toLowerCase();
  const isDemoAssistant = Boolean(DEMO_ASSISTANT_CLASS_BY_EMAIL[normalizedEmail]);
  const demoPraktikanKelas = DEMO_PRAKTIKAN_CLASS_BY_EMAIL[normalizedEmail];

  const effectiveRole: Peran = isDemoAssistant ? 'asisten' : doc.role;
  const effectiveKelasIds =
    doc.kelasIds && doc.kelasIds.length > 0
      ? doc.kelasIds
      : isDemoAssistant
        ? DEMO_ASSISTANT_CLASS_BY_EMAIL[normalizedEmail]
        : demoPraktikanKelas
          ? demoPraktikanKelas.kelasIds
          : [];

  const defaultKelas =
    doc.kelas ??
    demoPraktikanKelas?.kelas ??
    (effectiveKelasIds.length > 0
      ? effectiveKelasIds[0].replace(/^kelas-/i, '').toUpperCase()
      : undefined);

  return {
    id: doc.uid,
    uid: doc.uid,
    nama: doc.nama,
    email: doc.email,
    peran: effectiveRole,
    role: effectiveRole,
    nim: doc.nim,
    kelas: defaultKelas,
    kelasIds: effectiveKelasIds,
    aktif: Boolean(doc.active),
    active: Boolean(doc.active),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreatePraktikanProfileParams {
  uid: string;
  nama: string;
  email: string;
  nim?: string;
  requestedRole?: string;
}

export const userService = {
  /**
   * Mengambil dokumen profil pengguna `users/{uid}` dari Firestore (FR-S2-02, FR-S2-04)
   */
  async getUserProfile(uid: string): Promise<Pengguna | null> {
    const trimmedUid = uid.trim();
    if (!trimmedUid) {
      throw new FirebaseServiceError(
        'invalid-argument',
        'UID pengguna tidak valid.'
      );
    }

    const doc = await firestoreDb.getDoc<UserProfileDoc>(
      `users/${trimmedUid}`,
      trimmedUid
    );
    if (!doc) {
      return null;
    }

    if (!isValidPeran(doc.role)) {
      throw new FirebaseServiceError(
        'invalid-profile-role',
        'Peran akun pada profil Firestore belum ditetapkan atau tidak valid.'
      );
    }

    return mapProfileDocToPengguna(doc);
  },

  /**
   * Memverifikasi bahwa suatu UID terdaftar sebagai akun praktikan yang aktif di `users/{uid}`
   * Digunakan oleh asisten saat memetakan UID praktikan ke kelas (FR-S2-05).
   */
  async verifyActivePraktikanUid(
    praktikanUid: string,
    callerUid?: string
  ): Promise<Pengguna> {
    const trimmedTarget = praktikanUid.trim();
    if (!trimmedTarget) {
      throw new FirebaseServiceError(
        'invalid-argument',
        'UID praktikan wajib diisi.'
      );
    }

    const doc = await firestoreDb.getDoc<UserProfileDoc>(
      `users/${trimmedTarget}`,
      callerUid
    );

    if (!doc) {
      throw new FirebaseServiceError(
        'not-found',
        `Akun dengan UID '${trimmedTarget}' tidak ditemukan pada koleksi users.`
      );
    }

    if (doc.role !== 'praktikan') {
      throw new FirebaseServiceError(
        'failed-precondition',
        `Akun '${trimmedTarget}' bukan berperan sebagai praktikan.`
      );
    }

    if (!doc.active) {
      throw new FirebaseServiceError(
        'failed-precondition',
        `Akun praktikan '${trimmedTarget}' berstatus tidak aktif.`
      );
    }

    return mapProfileDocToPengguna(doc);
  },

  /**
   * Membuat dokumen profil awal saat registrasi akun baru (FR-S2-01, FR-S2-04).
   * Aturan wajib SRS Bab 2.2: Aplikasi klien TIDAK BOLEH menulis role='asisten' atas kehendak pengguna.
   */
  async createInitialPraktikanProfile(
    params: CreatePraktikanProfileParams
  ): Promise<Pengguna> {
    const { uid, nama, email, nim, requestedRole } = params;

    if (requestedRole && requestedRole !== 'praktikan') {
      throw new FirebaseServiceError(
        'permission-denied',
        'Pendaftaran peran asisten tidak diizinkan dari aplikasi. Akun baru hanya dapat didaftarkan sebagai praktikan.'
      );
    }

    const now = serverTimestamp();
    const trimmedNim = nim?.trim();

    const newProfileDoc: UserProfileDoc = {
      uid: uid.trim(),
      nama: nama.trim(),
      email: email.trim().toLowerCase(),
      role: 'praktikan',
      ...(trimmedNim ? { nim: trimmedNim } : {}),
      kelas: 'A',
      kelasIds: ['kelas-a'],
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await firestoreDb.createDoc(
      `users/${newProfileDoc.uid}`,
      newProfileDoc as unknown as Record<string, unknown>,
      newProfileDoc.uid
    );

    return mapProfileDocToPengguna(saved as unknown as UserProfileDoc);
  },

  /**
   * Memperbarui nama/NIM profil pengguna sendiri tanpa mengubah role atau status aktif (FR-S2-04, FR-S2-22)
   */
  async updateOwnProfile(
    uid: string,
    updates: { nama: string; nim?: string }
  ): Promise<Pengguna> {
    const trimmedNama = updates.nama.trim();
    if (trimmedNama.length < 3) {
      throw new FirebaseServiceError(
        'invalid-argument',
        'Nama lengkap minimal terdiri dari 3 karakter.'
      );
    }

    const payload: Record<string, unknown> = {
      nama: trimmedNama,
      updatedAt: serverTimestamp(),
    };

    if (updates.nim !== undefined) {
      payload.nim = updates.nim.trim();
    }

    const updated = await firestoreDb.updateDoc(
      `users/${uid.trim()}`,
      payload,
      uid.trim()
    );

    return mapProfileDocToPengguna(updated as unknown as UserProfileDoc);
  },

  /**
   * Langganan perubahan dokumen profil `users/{uid}` secara real-time (FR-S2-04, FR-S2-13)
   */
  subscribeUserProfile(
    uid: string,
    onUpdate: (user: Pengguna | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    return firestoreDb.onSnapshotDoc<UserProfileDoc>(
      `users/${uid.trim()}`,
      (doc) => {
        if (!doc) {
          onUpdate(null);
          return;
        }
        if (!isValidPeran(doc.role)) {
          if (onError) {
            onError(
              new FirebaseServiceError(
                'invalid-profile-role',
                'Peran profil pengguna tidak valid.'
              )
            );
          }
          return;
        }
        onUpdate(mapProfileDocToPengguna(doc));
      },
      onError,
      uid.trim()
    );
  },
};
