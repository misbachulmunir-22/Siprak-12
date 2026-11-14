/**
 * Inisialisasi Firebase Authentication, Cloud Firestore & Security Rules Engine
 * Owner: Programmer 1 (Jeje)
 * Acuan: SRS-SIPRAK12-S2-2026-001 (FR-S2-01 s.d. FR-S2-04, FR-S2-21, FR-S2-22)
 *
 * Mendukung:
 * 1. Mode Cloud Firebase (REST API Identity Toolkit & Cloud Firestore v1) saat variabel
 *    environment EXPO_PUBLIC_FIREBASE_* dikonfigurasi dengan project asli.
 * 2. Mode Persisten Lokal + Emulator Security Rules untuk pengembangan, demo, dan
 *    pengujian otomatis (UT-S2-01 s.d. UT-S2-17) tanpa bergantung pada koneksi luar.
 */

import type {
  Jadwal,
  KeanggotaanKelas,
  Kelas,
  PengajuanIzin,
  Presensi,
  Sesi,
  UserProfileDoc,
} from '../types/siprak';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface FirebaseAuthUser {
  uid: string;
  email: string;
  displayName?: string;
  idToken?: string;
  refreshToken?: string;
}

export class FirebaseServiceError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FirebaseServiceError';
    this.code = code;
  }
}

export type SecurityOperation = 'read' | 'create' | 'update' | 'delete';

// ============================================================================
// 1. KONFIGURASI ENVIRONMENT FIREBASE
// ============================================================================

const PLACEHOLDER_VALUE = 'isi_dari_firebase_project';

export function getFirebaseConfig(): FirebaseConfig {
  const env: Record<string, string | undefined> =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function isFirebaseCloudConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(
    cfg.apiKey &&
    cfg.projectId &&
    cfg.apiKey !== PLACEHOLDER_VALUE &&
    cfg.projectId !== PLACEHOLDER_VALUE
  );
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// 2. SIMULASI JARINGAN & PENYIMPANAN PERSISTEN LINTAS RESTART
// ============================================================================

let simulatedOffline = false;

export function setSimulatedNetworkOffline(offline: boolean): void {
  simulatedOffline = offline;
}

export function isSimulatedNetworkOffline(): boolean {
  return simulatedOffline;
}

function assertNetworkAvailable(): void {
  if (simulatedOffline) {
    throw new FirebaseServiceError(
      'unavailable',
      'Koneksi ke server Firebase terputus. Periksa jaringan internet Anda dan coba lagi.'
    );
  }
}

interface PersistentKeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryFallbackStore = new Map<string, string>();

const persistentStorage: PersistentKeyValueStore = {
  getItem(key: string): string | null {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
        return globalThis.localStorage.getItem(key);
      }
    } catch {
      // Fallback ke memory store
    }
    return memoryFallbackStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memoryFallbackStore.set(key, value);
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
        globalThis.localStorage.setItem(key, value);
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia di native runtime
    }
  },
  removeItem(key: string): void {
    memoryFallbackStore.delete(key);
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
        globalThis.localStorage.removeItem(key);
      }
    } catch {
      // Abaikan
    }
  },
};

const STORAGE_KEY_AUTH_USER = 'siprak12_s2_auth_user_v1';
const STORAGE_KEY_DB_STATE = 'siprak12_s2_firestore_db_v1';

// ============================================================================
// 3. DATA AWAL (SEED) UNTUK AKUN DEMO & STRUKTUR KOLEKSI FIRESTORE
// ============================================================================

interface SeedAuthAccount {
  uid: string;
  email: string;
  password: string;
  displayName: string;
}

const INITIAL_AUTH_ACCOUNTS: SeedAuthAccount[] = [
  {
    uid: 'asisten-1',
    email: 'asisten@siprak.ac.id',
    password: 'password123',
    displayName: 'Budi Santoso, S.Kom.',
  },
  {
    uid: 'asisten-2',
    email: 'asisten2@siprak.ac.id',
    password: 'password123',
    displayName: 'Siti Aminah, M.Kom.',
  },
  {
    uid: 'praktikan-1',
    email: 'ahmad@siprak.ac.id',
    password: 'password123',
    displayName: 'Ahmad Fauzi',
  },
  {
    uid: 'praktikan-2',
    email: 'bella@siprak.ac.id',
    password: 'password123',
    displayName: 'Bella Septiani',
  },
  {
    uid: 'praktikan-3',
    email: 'citra@siprak.ac.id',
    password: 'password123',
    displayName: 'Citra Dewi',
  },
  {
    uid: 'praktikan-4',
    email: 'dimas@siprak.ac.id',
    password: 'password123',
    displayName: 'Dimas Prasetyo',
  },
  {
    uid: 'praktikan-5',
    email: 'eka@siprak.ac.id',
    password: 'password123',
    displayName: 'Eka Rahmawati',
  },
  {
    uid: 'praktikan-6',
    email: 'fajar@siprak.ac.id',
    password: 'password123',
    displayName: 'Fajar Nugraha',
  },
  {
    uid: 'praktikan-7',
    email: 'gita@siprak.ac.id',
    password: 'password123',
    displayName: 'Gita Gutawa',
  },
  {
    uid: 'praktikan-nonaktif',
    email: 'nonaktif@siprak.ac.id',
    password: 'password123',
    displayName: 'Kiki Nonaktif',
  },
];

const INITIAL_USERS: Record<string, UserProfileDoc> = {
  'asisten-1': {
    uid: 'asisten-1',
    nama: 'Budi Santoso, S.Kom.',
    email: 'asisten@siprak.ac.id',
    role: 'asisten',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T07:00:00.000Z',
    updatedAt: '2026-10-01T07:00:00.000Z',
  },
  'asisten-2': {
    uid: 'asisten-2',
    nama: 'Siti Aminah, M.Kom.',
    email: 'asisten2@siprak.ac.id',
    role: 'asisten',
    kelasIds: ['kelas-b'],
    active: true,
    createdAt: '2026-10-01T07:05:00.000Z',
    updatedAt: '2026-10-01T07:05:00.000Z',
  },
  'praktikan-1': {
    uid: 'praktikan-1',
    nama: 'Ahmad Fauzi',
    email: 'ahmad@siprak.ac.id',
    role: 'praktikan',
    nim: '220101001',
    kelas: 'A',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  'praktikan-2': {
    uid: 'praktikan-2',
    nama: 'Bella Septiani',
    email: 'bella@siprak.ac.id',
    role: 'praktikan',
    nim: '220101002',
    kelas: 'A',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T08:05:00.000Z',
    updatedAt: '2026-10-01T08:05:00.000Z',
  },
  'praktikan-3': {
    uid: 'praktikan-3',
    nama: 'Citra Dewi',
    email: 'citra@siprak.ac.id',
    role: 'praktikan',
    nim: '220101003',
    kelas: 'A',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T08:10:00.000Z',
    updatedAt: '2026-10-01T08:10:00.000Z',
  },
  'praktikan-4': {
    uid: 'praktikan-4',
    nama: 'Dimas Prasetyo',
    email: 'dimas@siprak.ac.id',
    role: 'praktikan',
    nim: '220101004',
    kelas: 'A',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T08:15:00.000Z',
    updatedAt: '2026-10-01T08:15:00.000Z',
  },
  'praktikan-5': {
    uid: 'praktikan-5',
    nama: 'Eka Rahmawati',
    email: 'eka@siprak.ac.id',
    role: 'praktikan',
    nim: '220101005',
    kelas: 'A',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T08:20:00.000Z',
    updatedAt: '2026-10-01T08:20:00.000Z',
  },
  'praktikan-6': {
    uid: 'praktikan-6',
    nama: 'Fajar Nugraha',
    email: 'fajar@siprak.ac.id',
    role: 'praktikan',
    nim: '220101006',
    kelas: 'A',
    kelasIds: ['kelas-a'],
    active: true,
    createdAt: '2026-10-01T08:25:00.000Z',
    updatedAt: '2026-10-01T08:25:00.000Z',
  },
  'praktikan-7': {
    uid: 'praktikan-7',
    nama: 'Gita Gutawa',
    email: 'gita@siprak.ac.id',
    role: 'praktikan',
    nim: '220101007',
    kelas: 'B',
    kelasIds: ['kelas-b'],
    active: true,
    createdAt: '2026-10-01T08:30:00.000Z',
    updatedAt: '2026-10-01T08:30:00.000Z',
  },
  'praktikan-nonaktif': {
    uid: 'praktikan-nonaktif',
    nama: 'Kiki Nonaktif',
    email: 'nonaktif@siprak.ac.id',
    role: 'praktikan',
    nim: '220101011',
    kelas: 'A',
    kelasIds: [],
    active: false,
    createdAt: '2026-10-01T08:35:00.000Z',
    updatedAt: '2026-10-01T08:35:00.000Z',
  },
};

const INITIAL_CLASSES: Record<string, Kelas> = {
  'kelas-a': {
    id: 'kelas-a',
    nama: 'Kelas A',
    kode: 'IF-A',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    assistantUids: ['asisten-1'],
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  'kelas-b': {
    id: 'kelas-b',
    nama: 'Kelas B',
    kode: 'IF-B',
    namaPraktikum: 'Jaringan Komputer',
    assistantUids: ['asisten-2'],
    active: true,
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
  },
};

const INITIAL_MEMBERS: Record<string, Record<string, KeanggotaanKelas>> = {
  'kelas-a': {
    'praktikan-1': {
      uid: 'praktikan-1',
      namaSnapshot: 'Ahmad Fauzi',
      nimSnapshot: '220101001',
      joinedAt: '2026-10-01T09:00:00.000Z',
      active: true,
    },
    'praktikan-2': {
      uid: 'praktikan-2',
      namaSnapshot: 'Bella Septiani',
      nimSnapshot: '220101002',
      joinedAt: '2026-10-01T09:05:00.000Z',
      active: true,
    },
    'praktikan-3': {
      uid: 'praktikan-3',
      namaSnapshot: 'Citra Dewi',
      nimSnapshot: '220101003',
      joinedAt: '2026-10-01T09:10:00.000Z',
      active: true,
    },
    'praktikan-4': {
      uid: 'praktikan-4',
      namaSnapshot: 'Dimas Prasetyo',
      nimSnapshot: '220101004',
      joinedAt: '2026-10-01T09:15:00.000Z',
      active: true,
    },
    'praktikan-5': {
      uid: 'praktikan-5',
      namaSnapshot: 'Eka Rahmawati',
      nimSnapshot: '220101005',
      joinedAt: '2026-10-01T09:20:00.000Z',
      active: true,
    },
    'praktikan-6': {
      uid: 'praktikan-6',
      namaSnapshot: 'Fajar Nugraha',
      nimSnapshot: '220101006',
      joinedAt: '2026-10-01T09:25:00.000Z',
      active: true,
    },
  },
  'kelas-b': {
    'praktikan-7': {
      uid: 'praktikan-7',
      namaSnapshot: 'Gita Gutawa',
      nimSnapshot: '220101007',
      joinedAt: '2026-10-02T09:00:00.000Z',
      active: true,
    },
  },
};

const INITIAL_SESSIONS: Record<string, Sesi> = {
  'sesi-1': {
    id: 'sesi-1',
    scheduleId: 'jadwal-1',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 1,
    kelas: 'A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-12',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'ditutup',
    dibukaPada: '2026-10-12T08:01:00.000Z',
    ditutupPada: '2026-10-12T09:58:00.000Z',
    catatanPenutup: 'Seluruh praktikan berhasil menjalankan proyek Expo.',
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-12T09:58:00.000Z',
  },
  'sesi-2': {
    id: 'sesi-2',
    scheduleId: 'jadwal-2',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 2,
    kelas: 'A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-19',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'dibuka',
    dibukaPada: '2026-10-19T08:02:00.000Z',
    active: true,
    createdAt: '2026-10-01T10:05:00.000Z',
    updatedAt: '2026-10-19T08:02:00.000Z',
  },
  'sesi-3': {
    id: 'sesi-3',
    scheduleId: 'jadwal-3',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 3,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-26',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'belum_dibuka',
    active: true,
    createdAt: '2026-10-01T10:10:00.000Z',
    updatedAt: '2026-10-01T10:10:00.000Z',
  },
};

const INITIAL_ATTENDANCES: Record<string, Presensi> = {
  'sesi-1_praktikan-1': {
    id: 'sesi-1_praktikan-1',
    sesiId: 'sesi-1',
    sessionId: 'sesi-1',
    classId: 'kelas-a',
    praktikanUid: 'praktikan-1',
    praktikanId: 'praktikan-1',
    waktuHadir: '2026-10-12T08:05:12.000Z',
    createdAt: '2026-10-12T08:05:12.000Z',
  },
};

export interface LocalFirestoreDatabase {
  authAccounts: SeedAuthAccount[];
  users: Record<string, UserProfileDoc>;
  classes: Record<string, Kelas>;
  members: Record<string, Record<string, KeanggotaanKelas>>;
  schedules: Record<string, Jadwal>;
  sessions: Record<string, Sesi>;
  attendances: Record<string, Presensi>;
  leaveRequests: Record<string, PengajuanIzin>;
}

function createInitialDbState(): LocalFirestoreDatabase {
  return {
    authAccounts: JSON.parse(JSON.stringify(INITIAL_AUTH_ACCOUNTS)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    classes: JSON.parse(JSON.stringify(INITIAL_CLASSES)),
    members: JSON.parse(JSON.stringify(INITIAL_MEMBERS)),
    schedules: {},
    sessions: JSON.parse(JSON.stringify(INITIAL_SESSIONS)),
    attendances: JSON.parse(JSON.stringify(INITIAL_ATTENDANCES)),
    leaveRequests: {},
  };
}

function loadDbState(): LocalFirestoreDatabase {
  const raw = persistentStorage.getItem(STORAGE_KEY_DB_STATE);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LocalFirestoreDatabase;
      if (parsed && parsed.users && parsed.classes) {
        return parsed;
      }
    } catch {
      // Gunakan default
    }
  }
  const initial = createInitialDbState();
  persistentStorage.setItem(STORAGE_KEY_DB_STATE, JSON.stringify(initial));
  return initial;
}

let dbState: LocalFirestoreDatabase = loadDbState();

function persistDbState(): void {
  persistentStorage.setItem(STORAGE_KEY_DB_STATE, JSON.stringify(dbState));
}

// ============================================================================
// 4. ENGINE EVALUASI FIREBASE SECURITY RULES (FR-S2-22, Lampiran B)
// ============================================================================

function getChangedKeys(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const changed: string[] = [];
  allKeys.forEach((key) => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push(key);
    }
  });
  return changed;
}

function hasOnlyAllowedKeys(changedKeys: string[], allowedKeys: string[]): boolean {
  return changedKeys.every((k) => allowedKeys.includes(k));
}

function throwPermissionDenied(reason: string): never {
  throw new FirebaseServiceError(
    'permission-denied',
    `Missing or insufficient permissions (${reason}).`
  );
}

/**
 * Mengevaluasi aturan keamanan sesuai persis dengan `firestore.rules` (FR-S2-22).
 * Melempar FirebaseServiceError('permission-denied', ...) apabila akses ditolak.
 */
export function evaluateSecurityRule(params: {
  authUid: string | null;
  path: string;
  operation: SecurityOperation;
  existingData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}): void {
  const { authUid, path, operation, existingData, newData } = params;
  const segments = path.split('/').filter(Boolean);

  const signedIn = (): boolean => Boolean(authUid);
  const myProfile = (): UserProfileDoc | undefined =>
    authUid ? dbState.users[authUid] : undefined;
  const isActiveUser = (): boolean => {
    const profile = myProfile();
    return Boolean(signedIn() && profile && profile.active === true);
  };
  const isAssistant = (): boolean => {
    const profile = myProfile();
    return Boolean(isActiveUser() && profile?.role === 'asisten');
  };
  const isPraktikan = (): boolean => {
    const profile = myProfile();
    return Boolean(isActiveUser() && profile?.role === 'praktikan');
  };
  const assistantFor = (classId: string): boolean => {
    if (!isAssistant() || !authUid) return false;
    const cls = dbState.classes[classId];
    return Boolean(cls && Array.isArray(cls.assistantUids) && cls.assistantUids.includes(authUid));
  };
  const memberOf = (classId: string): boolean => {
    if (!isPraktikan() || !authUid) return false;
    const member = dbState.members[classId]?.[authUid];
    return Boolean(member && member.active === true);
  };

  // 1. match /users/{uid}
  if (segments.length === 2 && segments[0] === 'users') {
    const targetUid = segments[1];
    if (operation === 'read') {
      if (!signedIn()) throwPermissionDenied('users/read: unauthenticated');
      if (authUid === targetUid) return;
      if (isAssistant() && existingData?.role === 'praktikan') return;
      throwPermissionDenied('users/read: hanya pemilik profil atau asisten untuk praktikan');
    }
    if (operation === 'create') {
      if (!signedIn() || authUid !== targetUid) {
        throwPermissionDenied('users/create: uid tidak cocok dengan auth.uid');
      }
      if (!newData || newData.uid !== targetUid) {
        throwPermissionDenied('users/create: field uid wajib sama dengan auth.uid');
      }
      if (newData.role !== 'praktikan') {
        throwPermissionDenied('users/create: akun baru dilarang memilih role selain praktikan');
      }
      if (newData.active !== true) {
        throwPermissionDenied('users/create: field active harus true saat registrasi');
      }
      if (typeof newData.nama !== 'string' || newData.nama.trim().length === 0) {
        throwPermissionDenied('users/create: nama wajib diisi');
      }
      if (typeof newData.email !== 'string' || newData.email.trim().length === 0) {
        throwPermissionDenied('users/create: email wajib diisi');
      }
      return;
    }
    if (operation === 'update') {
      if (!signedIn() || authUid !== targetUid || !existingData || !newData) {
        throwPermissionDenied('users/update: bukan pemilik akun');
      }
      if (newData.role !== existingData.role) {
        throwPermissionDenied('users/update: dilarang mengubah role sendiri');
      }
      if (newData.uid !== existingData.uid || newData.active !== existingData.active) {
        throwPermissionDenied('users/update: dilarang mengubah uid atau status active');
      }
      const diff = getChangedKeys(existingData, newData);
      if (!hasOnlyAllowedKeys(diff, ['nama', 'nim', 'updatedAt'])) {
        throwPermissionDenied('users/update: hanya field nama, nim, dan updatedAt yang diizinkan');
      }
      return;
    }
    throwPermissionDenied('users/delete: penghapusan profil dilarang');
  }

  // 2. match /classes/{classId}
  if (segments.length === 2 && segments[0] === 'classes') {
    const classId = segments[1];
    if (operation === 'read') {
      if (signedIn() && (assistantFor(classId) || memberOf(classId))) return;
      throwPermissionDenied('classes/read: bukan asisten atau anggota aktif kelas');
    }
    if (operation === 'create') {
      if (
        isAssistant() &&
        authUid &&
        newData &&
        Array.isArray(newData.assistantUids) &&
        (newData.assistantUids as string[]).includes(authUid) &&
        newData.active === true
      ) {
        return;
      }
      throwPermissionDenied('classes/create: hanya asisten yang mencantumkan dirinya pada assistantUids');
    }
    if (operation === 'update') {
      if (
        assistantFor(classId) &&
        existingData &&
        newData &&
        JSON.stringify(newData.assistantUids) === JSON.stringify(existingData.assistantUids)
      ) {
        return;
      }
      throwPermissionDenied('classes/update: hanya asisten kelas & assistantUids tidak boleh diubah');
    }
    throwPermissionDenied('classes/delete: gunakan arsip active=false');
  }

  // 3. match /classes/{classId}/members/{uid}
  if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'members') {
    const classId = segments[1];
    const memberUid = segments[3];
    if (operation === 'read') {
      if (signedIn() && (authUid === memberUid || assistantFor(classId))) return;
      throwPermissionDenied('members/read: hanya anggota terkait atau asisten kelas');
    }
    if (operation === 'create') {
      const targetUser = dbState.users[memberUid];
      if (
        assistantFor(classId) &&
        newData &&
        newData.uid === memberUid &&
        targetUser &&
        targetUser.role === 'praktikan' &&
        targetUser.active === true
      ) {
        return;
      }
      throwPermissionDenied('members/create: hanya asisten kelas untuk akun praktikan aktif');
    }
    if (operation === 'update' || operation === 'delete') {
      if (assistantFor(classId)) return;
      throwPermissionDenied('members/update-delete: hanya asisten kelas');
    }
  }

  // 4. match /schedules/{scheduleId}
  if (segments.length === 2 && segments[0] === 'schedules') {
    if (operation === 'read') {
      const classId = String(existingData?.classId ?? '');
      if (signedIn() && (assistantFor(classId) || memberOf(classId))) return;
      throwPermissionDenied('schedules/read: tidak memiliki akses ke kelas jadwal ini');
    }
    if (operation === 'create') {
      const classId = String(newData?.classId ?? '');
      if (assistantFor(classId)) return;
      throwPermissionDenied('schedules/create: hanya asisten kelas terkait');
    }
    if (operation === 'update') {
      const classId = String(existingData?.classId ?? '');
      if (assistantFor(classId) && newData?.classId === existingData?.classId) return;
      throwPermissionDenied('schedules/update: hanya asisten kelas terkait & classId tetap');
    }
    throwPermissionDenied('schedules/delete: penghapusan jadwal dilarang');
  }

  // 5. match /sessions/{sessionId}
  if (segments.length === 2 && segments[0] === 'sessions') {
    if (operation === 'read') {
      const classId = String(existingData?.classId ?? '');
      if (signedIn() && (assistantFor(classId) || memberOf(classId))) return;
      throwPermissionDenied('sessions/read: tidak memiliki akses ke sesi kelas ini');
    }
    if (operation === 'create') {
      const classId = String(newData?.classId ?? '');
      if (assistantFor(classId)) return;
      throwPermissionDenied('sessions/create: hanya asisten kelas terkait');
    }
    if (operation === 'update') {
      const classId = String(existingData?.classId ?? '');
      const oldStatus = existingData?.status;
      const nextStatus = newData?.status;
      const validTransition =
        nextStatus === oldStatus ||
        (oldStatus === 'belum_dibuka' && nextStatus === 'dibuka') ||
        (oldStatus === 'dibuka' && nextStatus === 'ditutup');
      if (
        assistantFor(classId) &&
        newData?.classId === existingData?.classId &&
        validTransition
      ) {
        return;
      }
      throwPermissionDenied('sessions/update: hanya asisten kelas & transisi status satu arah');
    }
    throwPermissionDenied('sessions/delete: penghapusan sesi dilarang');
  }

  // 6. match /attendances/{attendanceId}
  if (segments.length === 2 && segments[0] === 'attendances') {
    const attendanceId = segments[1];
    if (operation === 'read') {
      const praktikanUid = String(existingData?.praktikanUid ?? existingData?.praktikanId ?? '');
      const classId = String(existingData?.classId ?? '');
      if (signedIn() && (praktikanUid === authUid || assistantFor(classId))) return;
      throwPermissionDenied('attendances/read: hanya pemilik presensi atau asisten kelas');
    }
    if (operation === 'create') {
      if (!signedIn() || !isPraktikan() || !authUid || !newData) {
        throwPermissionDenied('attendances/create: harus login sebagai praktikan aktif');
      }
      const sessionId = String(newData.sessionId ?? newData.sesiId ?? '');
      const classId = String(newData.classId ?? '');
      const praktikanUid = String(newData.praktikanUid ?? '');
      const expectedId = `${sessionId}_${authUid}`;
      const sessionDoc = dbState.sessions[sessionId];
      if (
        praktikanUid === authUid &&
        attendanceId === expectedId &&
        memberOf(classId) &&
        sessionDoc &&
        sessionDoc.classId === classId &&
        sessionDoc.status === 'dibuka' &&
        !dbState.attendances[attendanceId]
      ) {
        return;
      }
      throwPermissionDenied('attendances/create: presensi tidak memenuhi syarat sesi dibuka, keanggotaan, atau ID unik');
    }
    throwPermissionDenied('attendances/update-delete: catatan presensi tidak dapat diubah atau dihapus');
  }

  // 7. match /leaveRequests/{requestId}
  if (segments.length === 2 && segments[0] === 'leaveRequests') {
    if (operation === 'read') {
      const praktikanUid = String(existingData?.praktikanUid ?? '');
      const classId = String(existingData?.classId ?? '');
      if (signedIn() && (praktikanUid === authUid || assistantFor(classId))) return;
      throwPermissionDenied('leaveRequests/read: hanya pemohon izin atau asisten kelas');
    }
    if (operation === 'create') {
      if (!signedIn() || !isPraktikan() || !authUid || !newData) {
        throwPermissionDenied('leaveRequests/create: harus login sebagai praktikan aktif');
      }
      const sessionId = String(newData.sessionId ?? newData.sesiId ?? '');
      const classId = String(newData.classId ?? '');
      const sessionDoc = dbState.sessions[sessionId];
      if (
        newData.praktikanUid === authUid &&
        memberOf(classId) &&
        sessionDoc &&
        sessionDoc.classId === classId &&
        typeof newData.alasan === 'string' &&
        newData.alasan.trim().length > 0 &&
        newData.status === 'menunggu' &&
        newData.aiStatus === 'menunggu'
      ) {
        return;
      }
      throwPermissionDenied('leaveRequests/create: pengajuan awal harus berstatus menunggu & anggota kelas sesi');
    }
    if (operation === 'update') {
      if (!existingData || !newData) {
        throwPermissionDenied('leaveRequests/update: dokumen tidak ditemukan');
      }
      const diff = getChangedKeys(existingData, newData);

      // (a) Pemohon hanya boleh memperbarui metadata AI saat status masih menunggu
      if (
        signedIn() &&
        isPraktikan() &&
        existingData.praktikanUid === authUid &&
        existingData.status === 'menunggu' &&
        newData.status === existingData.status &&
        newData.classId === existingData.classId &&
        (newData.sessionId ?? newData.sesiId) === (existingData.sessionId ?? existingData.sesiId) &&
        newData.praktikanUid === existingData.praktikanUid &&
        hasOnlyAllowedKeys(diff, [
          'aiStatus',
          'aiCategory',
          'aiConfidence',
          'aiModel',
          'aiProcessedAt',
          'updatedAt',
        ]) &&
        ['berhasil', 'gagal', 'tidak_tersedia'].includes(String(newData.aiStatus))
      ) {
        return;
      }

      // (b) Asisten kelas berwenang hanya boleh memperbarui keputusan izin
      const classId = String(existingData.classId ?? '');
      if (
        assistantFor(classId) &&
        newData.classId === existingData.classId &&
        newData.praktikanUid === existingData.praktikanUid &&
        existingData.status === 'menunggu' &&
        ['disetujui', 'ditolak'].includes(String(newData.status)) &&
        newData.reviewerUid === authUid &&
        hasOnlyAllowedKeys(diff, [
          'status',
          'reviewerUid',
          'reviewedAt',
          'reviewNote',
          'updatedAt',
        ])
      ) {
        return;
      }

      throwPermissionDenied('leaveRequests/update: perubahan field tidak diizinkan untuk peran ini');
    }
    throwPermissionDenied('leaveRequests/delete: penghapusan pengajuan izin dilarang');
  }

  // Default deny-by-default (NFR-S2-04)
  throwPermissionDenied(`collection/path '${path}' tertutup oleh aturan deny-by-default`);
}

// ============================================================================
// 5. FIREBASE AUTHENTICATION SERVICE ADAPTER
// ============================================================================

type AuthStateListener = (user: FirebaseAuthUser | null) => void;
const authListeners = new Set<AuthStateListener>();

function loadPersistedAuthUser(): FirebaseAuthUser | null {
  const raw = persistentStorage.getItem(STORAGE_KEY_AUTH_USER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FirebaseAuthUser;
    if (parsed && parsed.uid && parsed.email) {
      return parsed;
    }
  } catch {
    // Abaikan data korup
  }
  return null;
}

let currentAuthUser: FirebaseAuthUser | null = loadPersistedAuthUser();

function notifyAuthListeners(): void {
  const snapshot = currentAuthUser ? { ...currentAuthUser } : null;
  authListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('Error pada auth listener:', err);
    }
  });
}

// Registry semua listener Firestore aktif agar dapat dibersihkan saat logout (FR-S2-03, FR-S2-13)
const activeFirestoreListeners = new Set<() => void>();

export function registerFirestoreUnsubscribe(unsubscribe: () => void): () => void {
  activeFirestoreListeners.add(unsubscribe);
  return () => {
    unsubscribe();
    activeFirestoreListeners.delete(unsubscribe);
  };
}

export function clearAllFirestoreListeners(): void {
  activeFirestoreListeners.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // Abaikan
    }
  });
  activeFirestoreListeners.clear();
}

export const firebaseAuth = {
  getCurrentUser(): FirebaseAuthUser | null {
    return currentAuthUser ? { ...currentAuthUser } : null;
  },

  onAuthStateChanged(listener: AuthStateListener): () => void {
    authListeners.add(listener);
    // Segera kirim status autentikasi yang dipulihkan dari storage (FR-S2-03)
    const snapshot = currentAuthUser ? { ...currentAuthUser } : null;
    queueMicrotask(() => {
      if (authListeners.has(listener)) {
        listener(snapshot);
      }
    });
    return () => {
      authListeners.delete(listener);
    };
  },

  async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<FirebaseAuthUser> {
    assertNetworkAvailable();
    const normalizedEmail = email.trim().toLowerCase();

    if (isFirebaseCloudConfigured()) {
      const { apiKey } = getFirebaseConfig();
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            returnSecureToken: true,
          }),
        });
      } catch {
        throw new FirebaseServiceError(
          'auth/network-request-failed',
          'Gagal terhubung ke layanan Firebase Authentication.'
        );
      }

      const payload = (await res.json()) as {
        localId?: string;
        email?: string;
        displayName?: string;
        idToken?: string;
        refreshToken?: string;
        error?: { message?: string };
      };

      if (!res.ok || !payload.localId) {
        const msg = payload.error?.message ?? 'INVALID_LOGIN_CREDENTIALS';
        if (
          msg.includes('INVALID_LOGIN_CREDENTIALS') ||
          msg.includes('INVALID_PASSWORD') ||
          msg.includes('EMAIL_NOT_FOUND')
        ) {
          throw new FirebaseServiceError(
            'auth/invalid-credential',
            'Email atau kata sandi tidak sesuai.'
          );
        }
        if (msg.includes('USER_DISABLED')) {
          throw new FirebaseServiceError(
            'auth/user-disabled',
            'Akun ini telah dinonaktifkan oleh administrator.'
          );
        }
        if (msg.includes('TOO_MANY_ATTEMPTS')) {
          throw new FirebaseServiceError(
            'auth/too-many-requests',
            'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.'
          );
        }
        throw new FirebaseServiceError('auth/unknown', msg);
      }

      const user: FirebaseAuthUser = {
        uid: payload.localId,
        email: payload.email ?? normalizedEmail,
        displayName: payload.displayName,
        idToken: payload.idToken,
        refreshToken: payload.refreshToken,
      };
      currentAuthUser = user;
      persistentStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
      notifyAuthListeners();
      return { ...user };
    }

    // Mode Persisten Lokal / Emulator
    const found = dbState.authAccounts.find(
      (acc) => acc.email.toLowerCase() === normalizedEmail
    );
    if (!found || found.password !== password) {
      throw new FirebaseServiceError(
        'auth/invalid-credential',
        'Email atau kata sandi salah. Periksa kembali kredensial Anda.'
      );
    }

    const user: FirebaseAuthUser = {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      idToken: `local-token-${found.uid}`,
    };
    currentAuthUser = user;
    persistentStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    notifyAuthListeners();
    return { ...user };
  },

  async createUserWithEmailAndPassword(
    email: string,
    password: string,
    displayName?: string
  ): Promise<FirebaseAuthUser> {
    assertNetworkAvailable();
    const normalizedEmail = email.trim().toLowerCase();

    if (isFirebaseCloudConfigured()) {
      const { apiKey } = getFirebaseConfig();
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            displayName: displayName?.trim(),
            returnSecureToken: true,
          }),
        });
      } catch {
        throw new FirebaseServiceError(
          'auth/network-request-failed',
          'Gagal terhubung ke layanan Firebase Authentication.'
        );
      }

      const payload = (await res.json()) as {
        localId?: string;
        email?: string;
        idToken?: string;
        refreshToken?: string;
        error?: { message?: string };
      };

      if (!res.ok || !payload.localId) {
        const msg = payload.error?.message ?? 'SIGNUP_FAILED';
        if (msg.includes('EMAIL_EXISTS')) {
          throw new FirebaseServiceError(
            'auth/email-already-in-use',
            'Alamat email sudah terdaftar pada akun lain.'
          );
        }
        if (msg.includes('INVALID_EMAIL')) {
          throw new FirebaseServiceError(
            'auth/invalid-email',
            'Format alamat email tidak valid.'
          );
        }
        if (msg.includes('WEAK_PASSWORD')) {
          throw new FirebaseServiceError(
            'auth/weak-password',
            'Kata sandi terlalu lemah (minimal 6 karakter).'
          );
        }
        throw new FirebaseServiceError('auth/unknown', msg);
      }

      const user: FirebaseAuthUser = {
        uid: payload.localId,
        email: payload.email ?? normalizedEmail,
        displayName: displayName?.trim(),
        idToken: payload.idToken,
        refreshToken: payload.refreshToken,
      };
      currentAuthUser = user;
      persistentStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
      notifyAuthListeners();
      return { ...user };
    }

    // Mode Persisten Lokal / Emulator
    const exists = dbState.authAccounts.some(
      (acc) => acc.email.toLowerCase() === normalizedEmail
    );
    if (exists) {
      throw new FirebaseServiceError(
        'auth/email-already-in-use',
        'Alamat email sudah terdaftar. Gunakan email lain atau masuk ke akun Anda.'
      );
    }

    const newUid = `uid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAccount: SeedAuthAccount = {
      uid: newUid,
      email: normalizedEmail,
      password,
      displayName: displayName?.trim() || normalizedEmail.split('@')[0],
    };

    dbState.authAccounts.push(newAccount);
    persistDbState();

    const user: FirebaseAuthUser = {
      uid: newUid,
      email: normalizedEmail,
      displayName: newAccount.displayName,
      idToken: `local-token-${newUid}`,
    };
    currentAuthUser = user;
    persistentStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    notifyAuthListeners();
    return { ...user };
  },

  async signOut(): Promise<void> {
    clearAllFirestoreListeners();
    currentAuthUser = null;
    persistentStorage.removeItem(STORAGE_KEY_AUTH_USER);
    notifyAuthListeners();
  },
};

// ============================================================================
// 6. CLOUD FIRESTORE ADAPTER & REAL-TIME LISTENERS
// ============================================================================

interface FirestoreRestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
}

function toFirestoreRestValue(val: unknown): FirestoreRestValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreRestValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreRestValue> = {};
    Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreRestValue(val: FirestoreRestValue): unknown {
  if ('stringValue' in val && val.stringValue !== undefined) return val.stringValue;
  if ('booleanValue' in val && val.booleanValue !== undefined) return val.booleanValue;
  if ('integerValue' in val && val.integerValue !== undefined) return Number(val.integerValue);
  if ('doubleValue' in val && val.doubleValue !== undefined) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values ?? []).map((item) => fromFirestoreRestValue(item));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields ?? {};
    Object.entries(fields).forEach(([k, v]) => {
      out[k] = fromFirestoreRestValue(v);
    });
    return out;
  }
  return null;
}

function toFirestoreRestFields(
  obj: Record<string, unknown>
): Record<string, FirestoreRestValue> {
  const fields: Record<string, FirestoreRestValue> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) {
      fields[k] = toFirestoreRestValue(v);
    }
  });
  return fields;
}

function fromFirestoreRestDocument(docPayload: {
  fields?: Record<string, FirestoreRestValue>;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fields = docPayload.fields ?? {};
  Object.entries(fields).forEach(([k, v]) => {
    out[k] = fromFirestoreRestValue(v);
  });
  return out;
}

async function cloudFirestoreGetDoc(
  path: string
): Promise<Record<string, unknown> | null> {
  const { projectId } = getFirebaseConfig();
  const cleanPath = path.replace(/^\/+/, '');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${cleanPath}`;
  const headers: Record<string, string> = {};
  if (currentAuthUser?.idToken) {
    headers.Authorization = `Bearer ${currentAuthUser.idToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers });
  } catch {
    throw new FirebaseServiceError(
      'unavailable',
      'Gagal menghubungi Cloud Firestore. Periksa koneksi internet Anda.'
    );
  }

  if (res.status === 404) {
    return null;
  }
  if (res.status === 403 || res.status === 401) {
    throw new FirebaseServiceError(
      'permission-denied',
      'Akses ke dokumen Cloud Firestore ditolak oleh Security Rules.'
    );
  }
  if (!res.ok) {
    throw new FirebaseServiceError(
      'unavailable',
      `Gagal membaca dokumen Firestore (${res.status}).`
    );
  }

  const payload = (await res.json()) as {
    fields?: Record<string, FirestoreRestValue>;
  };
  return fromFirestoreRestDocument(payload);
}

async function cloudFirestoreWriteDoc(
  path: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { projectId } = getFirebaseConfig();
  const cleanPath = path.replace(/^\/+/, '');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${cleanPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (currentAuthUser?.idToken) {
    headers.Authorization = `Bearer ${currentAuthUser.idToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: toFirestoreRestFields(data),
      }),
    });
  } catch {
    throw new FirebaseServiceError(
      'unavailable',
      'Gagal menyimpan dokumen ke Cloud Firestore. Periksa koneksi internet Anda.'
    );
  }

  if (res.status === 403 || res.status === 401) {
    throw new FirebaseServiceError(
      'permission-denied',
      'Penulisan ke Cloud Firestore ditolak oleh Security Rules.'
    );
  }
  if (!res.ok) {
    throw new FirebaseServiceError(
      'unavailable',
      `Gagal menyimpan dokumen ke Cloud Firestore (${res.status}).`
    );
  }

  const payload = (await res.json()) as {
    fields?: Record<string, FirestoreRestValue>;
  };
  return fromFirestoreRestDocument(payload);
}

type DocListener = () => void;
const docChangeSubscribers = new Set<DocListener>();

function emitFirestoreChange(): void {
  docChangeSubscribers.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('Error pada Firestore listener:', err);
    }
  });
}

function readRawDocByPath(path: string): Record<string, unknown> | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 2) {
    const [col, id] = segments;
    if (col === 'users') return (dbState.users[id] as unknown as Record<string, unknown>) ?? null;
    if (col === 'classes') return (dbState.classes[id] as unknown as Record<string, unknown>) ?? null;
    if (col === 'schedules') return (dbState.schedules[id] as unknown as Record<string, unknown>) ?? null;
    if (col === 'sessions') return (dbState.sessions[id] as unknown as Record<string, unknown>) ?? null;
    if (col === 'attendances') return (dbState.attendances[id] as unknown as Record<string, unknown>) ?? null;
    if (col === 'leaveRequests') return (dbState.leaveRequests[id] as unknown as Record<string, unknown>) ?? null;
  }
  if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'members') {
    const [, classId, , uid] = segments;
    return (dbState.members[classId]?.[uid] as unknown as Record<string, unknown>) ?? null;
  }
  return null;
}

function writeRawDocByPath(path: string, data: Record<string, unknown>): void {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 2) {
    const [col, id] = segments;
    if (col === 'users') dbState.users[id] = data as unknown as UserProfileDoc;
    else if (col === 'classes') dbState.classes[id] = data as unknown as Kelas;
    else if (col === 'schedules') dbState.schedules[id] = data as unknown as Jadwal;
    else if (col === 'sessions') dbState.sessions[id] = data as unknown as Sesi;
    else if (col === 'attendances') dbState.attendances[id] = data as unknown as Presensi;
    else if (col === 'leaveRequests') dbState.leaveRequests[id] = data as unknown as PengajuanIzin;
  } else if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'members') {
    const [, classId, , uid] = segments;
    if (!dbState.members[classId]) {
      dbState.members[classId] = {};
    }
    dbState.members[classId][uid] = data as unknown as KeanggotaanKelas;
  }
  persistDbState();
  emitFirestoreChange();
}

function deleteRawDocByPath(path: string): void {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'members') {
    const [, classId, , uid] = segments;
    if (dbState.members[classId]) {
      delete dbState.members[classId][uid];
    }
  }
  persistDbState();
  emitFirestoreChange();
}

function isCloudSessionActive(): boolean {
  if (!isFirebaseCloudConfigured()) return false;
  if (currentAuthUser?.idToken?.startsWith('local-token-')) return false;
  return true;
}

export const firestoreDb = {
  /**
   * Mereset database ke kondisi awal (digunakan pada pengujian unit/integrasi UT-S2-xx)
   */
  resetDatabaseForTests(): void {
    clearAllFirestoreListeners();
    currentAuthUser = null;
    simulatedOffline = false;
    persistentStorage.removeItem(STORAGE_KEY_AUTH_USER);
    dbState = createInitialDbState();
    persistDbState();
    notifyAuthListeners();
    emitFirestoreChange();
  },

  /**
   * Membaca satu dokumen dari Firestore dengan penegakan Security Rules (FR-S2-22)
   */
  async getDoc<T>(path: string, explicitAuthUid?: string | null): Promise<T | null> {
    assertNetworkAvailable();
    if (isCloudSessionActive()) {
      try {
        const cloudDoc = await cloudFirestoreGetDoc(path);
        if (cloudDoc) {
          writeRawDocByPath(path, cloudDoc);
          return cloudDoc as T;
        }
      } catch (err) {
        const fallback = readRawDocByPath(path);
        if (fallback) {
          return JSON.parse(JSON.stringify(fallback)) as T;
        }
        throw err;
      }
      const fallback = readRawDocByPath(path);
      if (fallback) {
        return JSON.parse(JSON.stringify(fallback)) as T;
      }
      return null;
    }

    const authUid =
      explicitAuthUid !== undefined ? explicitAuthUid : currentAuthUser?.uid ?? null;
    const existing = readRawDocByPath(path);
    if (!existing) {
      // Tetap evaluasi apakah path diizinkan
      evaluateSecurityRule({
        authUid,
        path,
        operation: 'read',
        existingData: {},
      });
      return null;
    }

    evaluateSecurityRule({
      authUid,
      path,
      operation: 'read',
      existingData: existing,
    });

    return JSON.parse(JSON.stringify(existing)) as T;
  },

  /**
   * Membuat dokumen baru di Firestore dengan penegakan Security Rules (FR-S2-22)
   */
  async createDoc<T extends Record<string, unknown>>(
    path: string,
    data: T,
    explicitAuthUid?: string | null
  ): Promise<T> {
    assertNetworkAvailable();
    if (isCloudSessionActive()) {
      const saved = await cloudFirestoreWriteDoc(path, data);
      writeRawDocByPath(path, saved);
      return saved as T;
    }

    const authUid =
      explicitAuthUid !== undefined ? explicitAuthUid : currentAuthUser?.uid ?? null;
    const existing = readRawDocByPath(path);
    if (existing) {
      throw new FirebaseServiceError(
        'already-exists',
        `Dokumen pada path '${path}' sudah ada.`
      );
    }

    evaluateSecurityRule({
      authUid,
      path,
      operation: 'create',
      existingData: null,
      newData: data,
    });

    const copy = JSON.parse(JSON.stringify(data)) as T;
    writeRawDocByPath(path, copy);
    return copy;
  },

  /**
   * Memperbarui dokumen di Firestore dengan penegakan Security Rules (FR-S2-22)
   */
  async updateDoc<T extends Record<string, unknown>>(
    path: string,
    partialData: Partial<T>,
    explicitAuthUid?: string | null
  ): Promise<T> {
    assertNetworkAvailable();
    if (isCloudSessionActive()) {
      const currentCloud = (await cloudFirestoreGetDoc(path)) ?? readRawDocByPath(path) ?? {};
      const mergedCloud = { ...currentCloud, ...partialData };
      const saved = await cloudFirestoreWriteDoc(path, mergedCloud);
      writeRawDocByPath(path, saved);
      return saved as T;
    }

    const authUid =
      explicitAuthUid !== undefined ? explicitAuthUid : currentAuthUser?.uid ?? null;
    const existing = readRawDocByPath(path);
    if (!existing) {
      throw new FirebaseServiceError(
        'not-found',
        `Dokumen pada path '${path}' tidak ditemukan.`
      );
    }

    const merged = {
      ...existing,
      ...partialData,
    };

    evaluateSecurityRule({
      authUid,
      path,
      operation: 'update',
      existingData: existing,
      newData: merged,
    });

    writeRawDocByPath(path, merged);
    return JSON.parse(JSON.stringify(merged)) as T;
  },

  /**
   * Menghapus dokumen di Firestore dengan penegakan Security Rules (FR-S2-22)
   */
  async deleteDoc(path: string, explicitAuthUid?: string | null): Promise<void> {
    assertNetworkAvailable();
    const authUid =
      explicitAuthUid !== undefined ? explicitAuthUid : currentAuthUser?.uid ?? null;
    const existing = readRawDocByPath(path);

    evaluateSecurityRule({
      authUid,
      path,
      operation: 'delete',
      existingData: existing,
    });

    deleteRawDocByPath(path);
  },

  /**
   * Real-time listener pada satu dokumen Firestore (FR-S2-13)
   * Mengembalikan fungsi unsubscribe yang wajib dipanggil saat layar unmount/logout.
   */
  onSnapshotDoc<T>(
    path: string,
    onNext: (doc: T | null) => void,
    onError?: (err: Error) => void,
    explicitAuthUid?: string | null
  ): () => void {
    const emitCurrent = () => {
      try {
        assertNetworkAvailable();
        if (isCloudSessionActive()) {
          const cached = readRawDocByPath(path);
          if (cached) {
            onNext(JSON.parse(JSON.stringify(cached)) as T);
          }
          void cloudFirestoreGetDoc(path)
            .then((cloudDoc) => {
              if (cloudDoc) {
                onNext(cloudDoc as T);
              } else if (!readRawDocByPath(path)) {
                onNext(null);
              }
            })
            .catch((err: unknown) => {
              if (onError && err instanceof Error) {
                onError(err);
              }
            });
          return;
        }

        const authUid =
          explicitAuthUid !== undefined ? explicitAuthUid : currentAuthUser?.uid ?? null;
        const existing = readRawDocByPath(path);
        if (!existing) {
          onNext(null);
          return;
        }
        evaluateSecurityRule({
          authUid,
          path,
          operation: 'read',
          existingData: existing,
        });
        onNext(JSON.parse(JSON.stringify(existing)) as T);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    };

    docChangeSubscribers.add(emitCurrent);
    queueMicrotask(emitCurrent);

    return registerFirestoreUnsubscribe(() => {
      docChangeSubscribers.delete(emitCurrent);
    });
  },

  /**
   * Operasi administratif tepercaya (mensimulasikan pemberian role asisten / aktivasi akun
   * melalui Firebase Console / Admin SDK, bukan dari aplikasi klien — SRS Bab 2.2).
   */
  adminSetUserProfileDirectly(uid: string, profile: UserProfileDoc): void {
    dbState.users[uid] = JSON.parse(JSON.stringify(profile));
    persistDbState();
    emitFirestoreChange();
  },
};
