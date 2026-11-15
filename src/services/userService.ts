/**
 * Service profil pengguna untuk koleksi users/{uid}.
 * Role selalu dibaca dari Firestore; tidak pernah dipilih dari form registrasi.
 */
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { Pengguna, Peran, UserProfileDoc } from '@/types/siprak';

const VALID_ROLES: Peran[] = ['asisten', 'praktikan'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function timestampToIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();

  if (isRecord(value) && typeof value.toDate === 'function') {
    const date = (value.toDate as () => Date)();
    return date instanceof Date ? date.toISOString() : undefined;
  }

  return undefined;
}

export function isValidPeran(value: unknown): value is Peran {
  return typeof value === 'string' && VALID_ROLES.includes(value as Peran);
}

export function mapProfileDocToPengguna(data: UserProfileDoc): Pengguna {
  return {
    id: data.uid,
    uid: data.uid,
    nama: data.nama,
    email: data.email,
    peran: data.role,
    role: data.role,
    nim: data.nim,
    kelasIds: Array.isArray(data.kelasIds) ? data.kelasIds : [],
    aktif: data.active === true,
    active: data.active === true,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function assertProfile(data: unknown, uid: string): UserProfileDoc {
  if (!isRecord(data)) {
    throw new Error('Data profil pengguna tidak valid.');
  }

  if (
    data.uid !== uid ||
    typeof data.nama !== 'string' ||
    data.nama.trim().length < 1 ||
    typeof data.email !== 'string' ||
    !isValidPeran(data.role) ||
    typeof data.active !== 'boolean'
  ) {
    throw new Error(
      'Struktur profil Firestore tidak sesuai kontrak users/{uid}. Hubungi PM/pengelola.'
    );
  }

  return data as unknown as UserProfileDoc;
}

export const userService = {
  async getUserProfile(uid: string): Promise<Pengguna | null> {
    const normalizedUid = uid.trim();
    if (!normalizedUid) throw new Error('UID pengguna tidak valid.');

    const snapshot = await getDoc(doc(db, 'users', normalizedUid));
    if (!snapshot.exists()) return null;

    return mapProfileDocToPengguna(
      assertProfile(snapshot.data(), normalizedUid)
    );
  },

  /**
   * Membuat profil awal sesudah Firebase Authentication berhasil membuat akun.
   * Akun baru hanya memperoleh role praktikan; role asisten harus ditetapkan
   * melalui proses administrasi tepercaya (Firebase Console/Admin SDK).
   */
  async createInitialPraktikanProfile(params: {
    uid: string;
    nama: string;
    email: string;
    nim?: string;
  }): Promise<Pengguna> {
    const uid = params.uid.trim();
    const nama = params.nama.trim();
    const email = params.email.trim().toLowerCase();
    const nim = params.nim?.trim();

    if (!uid || nama.length < 3 || !email) {
      throw new Error('Data profil awal tidak lengkap.');
    }

    const profile: Record<string, unknown> = {
      uid,
      nama,
      email,
      role: 'praktikan',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (nim) profile.nim = nim;

    await setDoc(doc(db, 'users', uid), profile as DocumentData);
    const saved = await userService.getUserProfile(uid);

    if (!saved) {
      throw new Error('Profil akun berhasil dikirim tetapi belum dapat dibaca ulang.');
    }
    return saved;
  },

  async refreshOwnProfile(uid: string): Promise<Pengguna | null> {
    return this.getUserProfile(uid);
  },

  subscribeUserProfile(
    uid: string,
    onUpdate: (user: Pengguna | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        try {
          if (!snapshot.exists()) {
            onUpdate(null);
            return;
          }
          onUpdate(mapProfileDocToPengguna(assertProfile(snapshot.data(), uid)));
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Profil tidak valid.'));
        }
      },
      (error) => onError(error)
    );
  },
};
