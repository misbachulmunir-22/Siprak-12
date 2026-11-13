/**
 * classService.ts
 *
 * Modul Layanan Kelas dan Keanggotaan Peserta (Programmer 2)
 * Sesuai Dokumen SRS Siprak-12 Sprint 2:
 * - FR-S2-05: Pemetaan UID akun praktikan ke kelas (classes/{classId}/members/{uid})
 * - FR-S2-06: CRUD kelas & arsip kelas (mencegah cascading delete)
 * - FR-S2-07: CRUD peserta kelas & penonaktifan keanggotaan tanpa menghapus presensi historis
 * - FR-S2-13: Listener real-time untuk kelas dan keanggotaan
 * - FR-S2-21: Validasi input, loading, empty, dan error state
 */

export interface ClassItem {
  id: string; // classId
  nama: string; // contoh: "Kelas A"
  kode: string; // contoh: "IF-A"
  namaPraktikum: string; // contoh: "Pemrograman Perangkat Bergerak"
  praktikumId?: string;
  assistantUids: string[]; // daftar UID asisten yang ditugaskan
  active: boolean; // true = aktif, false = diarsipkan
  createdAt: string; // ISO string / timestamp
  updatedAt: string; // ISO string / timestamp
}

export interface ClassMember {
  uid: string; // Firebase Auth UID praktikan
  namaSnapshot: string; // Nama praktikan saat didaftarkan
  nimSnapshot: string; // NIM praktikan saat didaftarkan
  joinedAt: string; // ISO string waktu pendaftaran
  active: boolean; // true = aktif, false = nonaktif/dikeluarkan
}

export interface PraktikanLookup {
  uid: string;
  nama: string;
  nim?: string;
  email?: string;
  role: 'praktikan';
  active: boolean;
}

export interface CreateClassInput {
  nama: string;
  kode: string;
  namaPraktikum: string;
  assistantUid: string;
}

export interface UpdateClassInput {
  nama?: string;
  kode?: string;
  namaPraktikum?: string;
}

export interface AddMemberInput {
  uid: string;
  namaSnapshot: string;
  nimSnapshot: string;
  assistantUid: string;
}

// ============================================================================
// IN-MEMORY FIXTURE STORE (Untuk pengujian terisolasi & baseline ZIP Sprint 1)
// Saat Firebase Firestore terhubung, service ini dapat didelegasikan ke Firestore SDK.
// ============================================================================

const initialClasses: ClassItem[] = [
  {
    id: 'kelas-a',
    nama: 'Kelas A',
    kode: 'IF-A',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    assistantUids: ['asisten-1'],
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'kelas-b',
    nama: 'Kelas B',
    kode: 'IF-B',
    namaPraktikum: 'Jaringan Komputer',
    assistantUids: ['asisten-2'],
    active: true,
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
  },
];

const initialMembers: Record<string, ClassMember[]> = {
  'kelas-a': [
    {
      uid: 'praktikan-1',
      namaSnapshot: 'Ahmad Fauzi',
      nimSnapshot: '220101001',
      joinedAt: '2026-10-01T09:00:00.000Z',
      active: true,
    },
    {
      uid: 'praktikan-2',
      namaSnapshot: 'Bella Septiani',
      nimSnapshot: '220101002',
      joinedAt: '2026-10-01T09:05:00.000Z',
      active: true,
    },
    {
      uid: 'praktikan-3',
      namaSnapshot: 'Citra Dewi',
      nimSnapshot: '220101003',
      joinedAt: '2026-10-01T09:10:00.000Z',
      active: true,
    },
    {
      uid: 'praktikan-4',
      namaSnapshot: 'Dimas Prasetyo',
      nimSnapshot: '220101004',
      joinedAt: '2026-10-01T09:15:00.000Z',
      active: true,
    },
    {
      uid: 'praktikan-5',
      namaSnapshot: 'Eka Rahmawati',
      nimSnapshot: '220101005',
      joinedAt: '2026-10-01T09:20:00.000Z',
      active: true,
    },
    {
      uid: 'praktikan-6',
      namaSnapshot: 'Fajar Nugraha',
      nimSnapshot: '220101006',
      joinedAt: '2026-10-01T09:25:00.000Z',
      active: true,
    },
  ],
  'kelas-b': [
    {
      uid: 'praktikan-7',
      namaSnapshot: 'Gita Gutawa',
      nimSnapshot: '220101007',
      joinedAt: '2026-10-02T09:00:00.000Z',
      active: true,
    },
    {
      uid: 'praktikan-8',
      namaSnapshot: 'Hadi Wijaya',
      nimSnapshot: '220101008',
      joinedAt: '2026-10-02T09:05:00.000Z',
      active: true,
    },
  ],
};

// Database pengguna praktikan resmi untuk lookup FR-S2-05
const registeredPraktikanAccounts: PraktikanLookup[] = [
  { uid: 'praktikan-1', nama: 'Ahmad Fauzi', nim: '220101001', email: 'ahmad@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-2', nama: 'Bella Septiani', nim: '220101002', email: 'bella@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-3', nama: 'Citra Dewi', nim: '220101003', email: 'citra@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-4', nama: 'Dimas Prasetyo', nim: '220101004', email: 'dimas@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-5', nama: 'Eka Rahmawati', nim: '220101005', email: 'eka@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-6', nama: 'Fajar Nugraha', nim: '220101006', email: 'fajar@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-7', nama: 'Gita Gutawa', nim: '220101007', email: 'gita@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-8', nama: 'Hadi Wijaya', nim: '220101008', email: 'hadi@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-9', nama: 'Indah Permata', nim: '220101009', email: 'indah@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-10', nama: 'Joko Susilo', nim: '220101010', email: 'joko@siprak.ac.id', role: 'praktikan', active: true },
  { uid: 'praktikan-nonaktif', nama: 'Kiki Nonaktif', nim: '220101011', email: 'kiki@siprak.ac.id', role: 'praktikan', active: false },
];

let classStore: ClassItem[] = JSON.parse(JSON.stringify(initialClasses));
let memberStore: Record<string, ClassMember[]> = JSON.parse(JSON.stringify(initialMembers));

// Listener subscriptions
type ClassListener = (classes: ClassItem[]) => void;
type MemberListener = (members: ClassMember[]) => void;

const classListeners = new Set<ClassListener>();
const memberListeners = new Map<string, Set<MemberListener>>();

function notifyClassListeners() {
  const current = [...classStore];
  classListeners.forEach((cb) => {
    try {
      cb(current);
    } catch (err) {
      console.error('Error in class listener:', err);
    }
  });
}

function notifyMemberListeners(classId: string) {
  const set = memberListeners.get(classId);
  if (set) {
    const current = [...(memberStore[classId] || [])];
    set.forEach((cb) => {
      try {
        cb(current);
      } catch (err) {
        console.error('Error in member listener:', err);
      }
    });
  }
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export const classService = {
  /**
   * Reset data fixture (berguna untuk pengujian terisolasi)
   */
  resetStore(): void {
    classStore = JSON.parse(JSON.stringify(initialClasses));
    memberStore = JSON.parse(JSON.stringify(initialMembers));
    notifyClassListeners();
    Object.keys(memberStore).forEach((cId) => notifyMemberListeners(cId));
  },

  /**
   * FR-S2-05: Lookup akun praktikan terdaftar dan aktif.
   * Asisten hanya dapat menambahkan akun praktikan resmi, bukan akun asisten atau non-aktif.
   */
  async lookupPraktikan(uid: string): Promise<PraktikanLookup | null> {
    const trimmedUid = uid.trim();
    if (!trimmedUid) return null;
    const found = registeredPraktikanAccounts.find(
      (acc) => acc.uid === trimmedUid || acc.nim === trimmedUid || acc.email?.toLowerCase() === trimmedUid.toLowerCase()
    );
    if (!found) return null;
    return { ...found };
  },

  /**
   * Mendapatkan daftar seluruh praktikan yang terdaftar untuk kemudahan pemilihan di UI
   */
  async getAvailablePraktikanList(): Promise<PraktikanLookup[]> {
    return registeredPraktikanAccounts.filter((acc) => acc.active);
  },

  /**
   * FR-S2-06: Mengambil kelas yang menjadi kewenangan asisten.
   */
  async getClassesForAssistant(assistantUid: string, includeArchived = false): Promise<ClassItem[]> {
    return classStore.filter((c) => {
      const isAssigned = c.assistantUids.includes(assistantUid);
      return includeArchived ? isAssigned : isAssigned && c.active;
    });
  },

  /**
   * FR-S2-13: Listener real-time untuk kelas asisten.
   * Mengembalikan fungsi unsubscribe untuk melepaskan listener saat unmount/logout.
   */
  subscribeClassesForAssistant(
    assistantUid: string,
    onUpdate: (classes: ClassItem[]) => void,
    onError?: (err: Error) => void,
    includeArchived = false
  ): () => void {
    const listener: ClassListener = (allClasses) => {
      const filtered = allClasses.filter((c) => {
        const isAssigned = c.assistantUids.includes(assistantUid);
        return includeArchived ? isAssigned : isAssigned && c.active;
      });
      onUpdate(filtered);
    };

    classListeners.add(listener);
    // Langsung kirim kondisi data saat ini (initial emit)
    try {
      listener(classStore);
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }

    return () => {
      classListeners.delete(listener);
    };
  },

  /**
   * FR-S2-06 & FR-S2-09: Mengambil kelas tempat praktikan terdaftar dengan status keanggotaan aktif.
   */
  async getClassesForPraktikan(praktikanUid: string): Promise<ClassItem[]> {
    const enrolledClassIds = Object.entries(memberStore)
      .filter(([_, members]) => members.some((m) => m.uid === praktikanUid && m.active))
      .map(([classId]) => classId);

    return classStore.filter((c) => enrolledClassIds.includes(c.id) && c.active);
  },

  /**
   * FR-S2-13: Listener real-time untuk kelas praktikan.
   */
  subscribeClassesForPraktikan(
    praktikanUid: string,
    onUpdate: (classes: ClassItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const listener: ClassListener = () => {
      const enrolledClassIds = Object.entries(memberStore)
        .filter(([_, members]) => members.some((m) => m.uid === praktikanUid && m.active))
        .map(([classId]) => classId);

      const activeClasses = classStore.filter((c) => enrolledClassIds.includes(c.id) && c.active);
      onUpdate(activeClasses);
    };

    classListeners.add(listener);
    try {
      listener(classStore);
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }

    return () => {
      classListeners.delete(listener);
    };
  },

  /**
   * Mengambil detail satu kelas berdasarkan ID
   */
  async getClassById(classId: string): Promise<ClassItem | null> {
    const found = classStore.find((c) => c.id === classId);
    return found ? { ...found } : null;
  },

  /**
   * FR-S2-06: Tambah kelas baru oleh asisten.
   */
  async createClass(input: CreateClassInput): Promise<ClassItem> {
    const nama = input.nama.trim();
    const kode = input.kode.trim().toUpperCase();
    const namaPraktikum = input.namaPraktikum.trim();
    const assistantUid = input.assistantUid.trim();

    if (!nama) throw new Error('Nama kelas wajib diisi.');
    if (!kode) throw new Error('Kode kelas wajib diisi.');
    if (!namaPraktikum) throw new Error('Nama praktikum wajib diisi.');
    if (!assistantUid) throw new Error('Identitas asisten tidak valid.');

    // Cek duplikasi kode kelas pada kelas aktif
    const existing = classStore.find((c) => c.kode === kode && c.active);
    if (existing) {
      throw new Error(`Kelas dengan kode "${kode}" sudah ada dan masih aktif.`);
    }

    const now = new Date().toISOString();
    const newClass: ClassItem = {
      id: `kelas-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nama,
      kode,
      namaPraktikum,
      assistantUids: [assistantUid],
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    classStore.push(newClass);
    memberStore[newClass.id] = [];
    notifyClassListeners();
    return { ...newClass };
  },

  /**
   * FR-S2-06: Mengubah data kelas oleh asisten yang berwenang.
   */
  async updateClass(classId: string, input: UpdateClassInput, assistantUid: string): Promise<ClassItem> {
    const idx = classStore.findIndex((c) => c.id === classId);
    if (idx === -1) throw new Error('Kelas tidak ditemukan.');

    const targetClass = classStore[idx];
    if (!targetClass.assistantUids.includes(assistantUid)) {
      throw new Error('Anda tidak memiliki kewenangan untuk mengubah kelas ini.');
    }

    const now = new Date().toISOString();
    const updated: ClassItem = {
      ...targetClass,
      nama: input.nama !== undefined ? input.nama.trim() : targetClass.nama,
      kode: input.kode !== undefined ? input.kode.trim().toUpperCase() : targetClass.kode,
      namaPraktikum: input.namaPraktikum !== undefined ? input.namaPraktikum.trim() : targetClass.namaPraktikum,
      updatedAt: now,
    };

    if (!updated.nama) throw new Error('Nama kelas tidak boleh kosong.');
    if (!updated.kode) throw new Error('Kode kelas tidak boleh kosong.');
    if (!updated.namaPraktikum) throw new Error('Nama praktikum tidak boleh kosong.');

    classStore[idx] = updated;
    notifyClassListeners();
    return { ...updated };
  },

  /**
   * FR-S2-06: Menonaktifkan/mengarsipkan kelas (soft delete).
   * Menolak penghapusan permanen (cascading) demi menjaga riwayat sesi dan presensi.
   */
  async archiveClass(classId: string, assistantUid: string): Promise<void> {
    const idx = classStore.findIndex((c) => c.id === classId);
    if (idx === -1) throw new Error('Kelas tidak ditemukan.');

    const targetClass = classStore[idx];
    if (!targetClass.assistantUids.includes(assistantUid)) {
      throw new Error('Anda tidak memiliki kewenangan untuk mengarsipkan kelas ini.');
    }

    classStore[idx] = {
      ...targetClass,
      active: false,
      updatedAt: new Date().toISOString(),
    };

    notifyClassListeners();
  },

  /**
   * FR-S2-06: Mengaktifkan kembali kelas yang diarsipkan
   */
  async reactivateClass(classId: string, assistantUid: string): Promise<void> {
    const idx = classStore.findIndex((c) => c.id === classId);
    if (idx === -1) throw new Error('Kelas tidak ditemukan.');

    const targetClass = classStore[idx];
    if (!targetClass.assistantUids.includes(assistantUid)) {
      throw new Error('Anda tidak memiliki kewenangan untuk mengaktifkan kelas ini.');
    }

    classStore[idx] = {
      ...targetClass,
      active: true,
      updatedAt: new Date().toISOString(),
    };

    notifyClassListeners();
  },

  /**
   * FR-S2-07: Mengambil daftar peserta kelas (classes/{classId}/members).
   */
  async getClassMembers(classId: string, includeInactive = false): Promise<ClassMember[]> {
    const members = memberStore[classId] || [];
    return members
      .filter((m) => (includeInactive ? true : m.active))
      .map((m) => ({ ...m }));
  },

  /**
   * FR-S2-13: Real-time listener untuk anggota kelas.
   */
  subscribeClassMembers(
    classId: string,
    onUpdate: (members: ClassMember[]) => void,
    onError?: (err: Error) => void,
    includeInactive = false
  ): () => void {
    if (!memberListeners.has(classId)) {
      memberListeners.set(classId, new Set());
    }
    const set = memberListeners.get(classId)!;

    const listener: MemberListener = (members) => {
      const filtered = members.filter((m) => (includeInactive ? true : m.active));
      onUpdate(filtered);
    };

    set.add(listener);
    try {
      listener(memberStore[classId] || []);
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        memberListeners.delete(classId);
      }
    };
  },

  /**
   * FR-S2-05 & FR-S2-07: Tambah pemetaan UID peserta ke kelas.
   * - Validasi bahwa UID terdaftar sebagai akun praktikan aktif.
   * - Mencegah duplikasi keanggotaan aktif pada kelas yang sama.
   * - Jika anggota lama sudah nonaktif, gunakan dokumen yang sama saat mengaktifkannya kembali.
   */
  async addMemberToClass(classId: string, input: AddMemberInput): Promise<ClassMember> {
    const cls = classStore.find((c) => c.id === classId);
    if (!cls) throw new Error('Kelas tidak ditemukan.');
    if (!cls.assistantUids.includes(input.assistantUid)) {
      throw new Error('Anda tidak memiliki kewenangan menambahkan peserta ke kelas ini.');
    }

    const uid = input.uid.trim();
    if (!uid) throw new Error('UID peserta tidak boleh kosong.');

    // Validasi akun praktikan via lookup
    const lookup = await this.lookupPraktikan(uid);
    if (!lookup) {
      throw new Error(`UID "${uid}" tidak terdaftar sebagai pengguna resmi di sistem.`);
    }
    if (lookup.role !== 'praktikan') {
      throw new Error('Akun tersebut bukan akun praktikan.');
    }
    if (!lookup.active) {
      throw new Error('Akun praktikan tersebut sedang tidak aktif atau menunggu verifikasi.');
    }

    if (!memberStore[classId]) {
      memberStore[classId] = [];
    }

    const members = memberStore[classId];
    const existingIdx = members.findIndex((m) => m.uid === uid);

    const now = new Date().toISOString();
    const namaSnapshot = input.namaSnapshot.trim() || lookup.nama;
    const nimSnapshot = input.nimSnapshot.trim() || lookup.nim || '-';

    if (existingIdx !== -1) {
      const existing = members[existingIdx];
      // Jika sudah terdaftar dan aktif, tolak duplikasi!
      if (existing.active) {
        throw new Error(`Praktikan ${namaSnapshot} (${existing.nimSnapshot}) sudah terdaftar aktif di kelas ini.`);
      }

      // Jika anggota lama sudah nonaktif, aktifkan kembali pada dokumen yang sama!
      const reactivated: ClassMember = {
        ...existing,
        namaSnapshot,
        nimSnapshot,
        joinedAt: now,
        active: true,
      };
      members[existingIdx] = reactivated;
      notifyMemberListeners(classId);
      notifyClassListeners();
      return { ...reactivated };
    }

    // Dokumen keanggotaan baru
    const newMember: ClassMember = {
      uid,
      namaSnapshot,
      nimSnapshot,
      joinedAt: now,
      active: true,
    };

    members.push(newMember);
    notifyMemberListeners(classId);
    notifyClassListeners();
    return { ...newMember };
  },

  /**
   * FR-S2-07: Memperbarui field snapshot peserta (namaSnapshot, nimSnapshot).
   */
  async updateMemberSnapshot(
    classId: string,
    uid: string,
    params: { namaSnapshot?: string; nimSnapshot?: string; assistantUid: string }
  ): Promise<ClassMember> {
    const cls = classStore.find((c) => c.id === classId);
    if (!cls || !cls.assistantUids.includes(params.assistantUid)) {
      throw new Error('Anda tidak memiliki kewenangan mengubah data peserta ini.');
    }

    const members = memberStore[classId] || [];
    const idx = members.findIndex((m) => m.uid === uid);
    if (idx === -1) throw new Error('Peserta tidak ditemukan di kelas ini.');

    const current = members[idx];
    const updated: ClassMember = {
      ...current,
      namaSnapshot: params.namaSnapshot !== undefined ? params.namaSnapshot.trim() : current.namaSnapshot,
      nimSnapshot: params.nimSnapshot !== undefined ? params.nimSnapshot.trim() : current.nimSnapshot,
    };

    if (!updated.namaSnapshot) throw new Error('Nama peserta tidak boleh kosong.');
    if (!updated.nimSnapshot) throw new Error('NIM peserta tidak boleh kosong.');

    members[idx] = updated;
    notifyMemberListeners(classId);
    return { ...updated };
  },

  /**
   * FR-S2-07: Mengeluarkan peserta dari kelas dengan menonaktifkan keanggotaan (active = false).
   * Tidak menghapus presensi historis (attendance record tetap aman).
   */
  async removeMemberFromClass(classId: string, uid: string, assistantUid: string): Promise<void> {
    const cls = classStore.find((c) => c.id === classId);
    if (!cls || !cls.assistantUids.includes(assistantUid)) {
      throw new Error('Anda tidak memiliki kewenangan mengeluarkan peserta dari kelas ini.');
    }

    const members = memberStore[classId] || [];
    const idx = members.findIndex((m) => m.uid === uid);
    if (idx === -1) throw new Error('Peserta tidak ditemukan di kelas ini.');

    // Soft deactivation: active = false
    members[idx] = {
      ...members[idx],
      active: false,
    };

    notifyMemberListeners(classId);
    notifyClassListeners();
  },
};
